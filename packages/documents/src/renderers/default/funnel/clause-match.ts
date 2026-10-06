import type { Clause, ConditionRow, Operator } from '@repo/forms';
import { richTextHasText, richTextValue } from '../../ui/rich-text-value';
import {
  choicesOf,
  fieldKindOf,
  needsValue,
  OPERATORS_BY_KIND,
  takesList,
  type CriterionField,
} from './clause-vocabulary';
import { isRecord, type FunnelCondition, type FunnelEdge } from './funnel-graph';

// Evaluating a Condition's rows of clauses against the answers (doc 274 rules 4-7) — a restatement of `@repo/forms`'
// `runner/criterion-match.ts` (doc 202 rules 19-23, doc 199 rules 36-40) over this package's clause vocabulary. PURE
// and TOTAL: the document is author-supplied, so nothing here throws.

/** The answers a Funnel is filled with — JSONForms' data object. */
export type FunnelData = Record<string, unknown>;

type Schema = Record<string, unknown>;

const answerOf = (data: FunnelData | undefined, key: string): unknown =>
  isRecord(data) ? data[key] : undefined;

/** The field a clause names, from the SCHEMA alone (rule 5); its label is the `title`, else the key. */
export function criterionFieldOf(key: string, schema: Schema): CriterionField | undefined {
  const properties = schema['properties'];
  if (!isRecord(properties) || !Object.hasOwn(properties, key)) return undefined;
  const property = properties[key];
  const kind = fieldKindOf(property);
  if (kind === undefined || !isRecord(property)) return undefined;
  const title = property['title'];
  const label = typeof title === 'string' && title.length > 0 ? title : key;
  return kind === 'choice'
    ? { key, label, kind, options: choicesOf(property) ?? [] }
    : { key, label, kind };
}

/** Whether a scalar clause value has the type its field's kind compares against (rule 4). */
function valueMatchesKind(kind: CriterionField['kind'], value: unknown): boolean {
  if (kind === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (kind === 'boolean') return typeof value === 'boolean';
  if (kind === 'text') return typeof value === 'string';
  return typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));
}

const listOf = (value: unknown): (string | number)[] | undefined =>
  Array.isArray(value) &&
  value.every(
    (entry) => typeof entry === 'string' || (typeof entry === 'number' && Number.isFinite(entry)),
  )
    ? (value as (string | number)[])
    : undefined;

/** Rule 4: `undefined`, `null`, `''`, `[]` and an empty Lexical state are empty; `0` and `false` are answers. */
function isEmptyAnswer(answer: unknown): boolean {
  if (answer === undefined || answer === null || answer === '') return true;
  if (Array.isArray(answer)) return answer.length === 0;
  const state = richTextValue(answer);
  return state !== undefined && !richTextHasText(state);
}

/** Whether a clause is evaluable at all: a field for its key, an offered operator, a well-typed value. */
function evaluable(clause: Clause, field: CriterionField | undefined): field is CriterionField {
  if (field === undefined || field.key !== clause.field) return false;
  if (!OPERATORS_BY_KIND[field.kind].includes(clause.operator)) return false;
  if (!needsValue(clause.operator)) return true;
  if (clause.value === undefined) return false;
  return takesList(clause.operator)
    ? listOf(clause.value) !== undefined
    : valueMatchesKind(field.kind, clause.value);
}

function compare(operator: Operator, answer: unknown, value: unknown): boolean {
  switch (operator) {
    case 'equals':
      return answer === value;
    case 'notEquals':
      return answer !== value;
    case 'contains':
    case 'startsWith':
    case 'endsWith': {
      if (typeof answer !== 'string' || typeof value !== 'string') return false;
      const [left, right] = [answer.toLowerCase(), value.toLowerCase()];
      if (operator === 'contains') return left.includes(right);
      return operator === 'startsWith' ? left.startsWith(right) : left.endsWith(right);
    }
    case 'includes':
    case 'notIncludes': {
      const chosen = Array.isArray(answer) && answer.includes(value);
      return operator === 'includes' ? chosen : !chosen;
    }
    case 'in':
    case 'notIn': {
      const listed = listOf(value)?.includes(answer as string | number) ?? false;
      return operator === 'in' ? listed : !listed;
    }
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      return compareNumbers(operator, answer, value);
    case 'isEmpty':
      return isEmptyAnswer(answer);
    case 'isNotEmpty':
      return !isEmptyAnswer(answer);
    case 'isTrue':
      return answer === true;
    case 'isFalse':
      return answer === false;
  }
}

function compareNumbers(operator: Operator, answer: unknown, value: unknown): boolean {
  if (typeof answer !== 'number' || !Number.isFinite(answer)) return false;
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  if (operator === 'gt') return answer > value;
  if (operator === 'gte') return answer >= value;
  return operator === 'lt' ? answer < value : answer <= value;
}

/** Rule 4: whether `clause` matches the answers; an unevaluable clause never does. */
export function matchesClause(
  clause: Clause,
  field: CriterionField | undefined,
  data: FunnelData | undefined,
): boolean {
  if (!evaluable(clause, field)) return false;
  return compare(clause.operator, answerOf(data, clause.field), clause.value);
}

/** Rule 4: EVERY clause under `all`, at least ONE under `any`; a row with no clauses never matches. */
export function matchesRow(
  row: ConditionRow,
  schema: Schema,
  data: FunnelData | undefined,
): boolean {
  if (row.clauses.length === 0) return false;
  const matches = (clause: Clause) =>
    matchesClause(clause, criterionFieldOf(clause.field, schema), data);
  return row.match === 'any' ? row.clauses.some(matches) : row.clauses.every(matches);
}

/** Rule 4: the FIRST row of `condition` that matches, in authored order. */
export function firstMatchingRow(
  condition: FunnelCondition,
  schema: Schema,
  data: FunnelData | undefined,
): ConditionRow | undefined {
  return condition.options.rows.find((row) => matchesRow(row, schema, data));
}

/**
 * Rule 7: whether the answers DECIDE this Condition — no clauses; a row matches; or every field any clause names is
 * answered or not `required` (a blank optional field goes to the default either way).
 */
export function conditionDecided(
  condition: FunnelCondition,
  schema: Schema,
  data: FunnelData | undefined,
): boolean {
  const clauses = condition.options.rows.flatMap((row) => row.clauses);
  if (clauses.length === 0) return true;
  if (firstMatchingRow(condition, schema, data) !== undefined) return true;
  const required = schema['required'];
  const keys = new Set(Array.isArray(required) ? required : []);
  return clauses.every((c) => !isEmptyAnswer(answerOf(data, c.field)) || !keys.has(c.field));
}

/**
 * Rule 6: the edge a Condition sends these answers down — the outgoing edge named by the first matching row, else the
 * default (no `sourceHandle`); `undefined` when neither exists.
 */
export function conditionEdge(
  condition: FunnelCondition,
  edges: readonly FunnelEdge[],
  schema: Schema,
  data: FunnelData | undefined,
): FunnelEdge | undefined {
  const outgoing = edges.filter((edge) => edge.source === condition.id);
  const matched = firstMatchingRow(condition, schema, data);
  const branch =
    matched === undefined ? undefined : outgoing.find((edge) => edge.sourceHandle === matched.id);
  return branch ?? outgoing.find((edge) => edge.sourceHandle === undefined);
}
