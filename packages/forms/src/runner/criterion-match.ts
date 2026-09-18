import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import type { Clause, ConditionRow, FlowEdge } from '../types/elements';
import { choiceOptions } from '../renderers/ui/choice-control';
import { multiChoiceOptions } from '../renderers/ui/multi-choice-control';
import { controlKindOf, type ControlKind } from '../renderers/ui/control-kind';
import {
  needsValue,
  operatorsFor,
  takesList,
  type CriterionField,
} from '../renderers/xyflow/criteria';
import { clausesIn, rowsOf } from '../renderers/xyflow/flow-elements';

// Evaluating a Condition's rows of clauses against the answers (doc 202 rules 19-23, doc 199 rules 38-40). PURE — no React, no
// @xyflow/react — because `renderers/default`'s Flow entry imports this and a test pins that boundary
// (doc 202 rule 42). It may not import the studio either (rule 45), which is why the field resolver below is
// local rather than `studio/layout/upstream-fields.ts`.
//
// This is the fill-time half of doc 199's authoring-time `clauseProblems`, and it deliberately shares
// `operatorsFor` / `needsValue` / `takesList` with it (rule 19): "may this clause be authored?" and "does it
// match?" can then never disagree about which operators a field kind offers, or about which take a value.

/** The answers the runner evaluates against — the host's controlled `data` object (rule 3). */
export type RunnerData = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The answer given for `key`, or `undefined`. Forgiving about `data` itself: a host may not have one yet. */
const answerOf = (data: RunnerData | undefined, key: string): unknown =>
  isRecord(data) ? data[key] : undefined;

/**
 * The field a clause names, resolved from the document's SCHEMA alone: `clause.field` is a top-level
 * property key (doc 199 rule 1), so `schema.properties[key]` is the whole lookup. An inherited name such as
 * `toString` is never a property, exactly as in `propertyKeyOf`.
 *
 * The studio resolves fields from the Controls that BIND them (`upstreamFieldsOf`), because authoring must
 * offer only fields answered upstream of the branch. The runner asks a different question — "what type is this
 * answer?" — which the schema answers on its own, and it must not import the studio to ask it. A field bound by
 * no Control therefore resolves here and simply never has an answer, which rule 20's operators handle.
 *
 * The label is the property's `title`, else the key: nothing here compares labels, so it exists only so a
 * caller can name the field in a message.
 */
export function criterionFieldOf(key: string, schema: JsonSchema): CriterionField | undefined {
  const properties = schema.properties;
  if (properties === undefined || !Object.hasOwn(properties, key)) return undefined;
  const property = properties[key];
  const kind = controlKindOf(property);
  if (kind === undefined) return undefined;

  const title = property?.title;
  const label = typeof title === 'string' && title.length > 0 ? title : key;
  // Doc 205 rule 31: a multi-choice field carries its options too — the picker offers the same list, and an
  // `includes` clause's value is one of them.
  const options =
    kind === 'choice'
      ? choiceOptions(property)
      : kind === 'multi-choice'
        ? multiChoiceOptions(property)
        : undefined;
  return options === undefined ? { key, label, kind } : { key, label, kind, options };
}

/**
 * The value a `kind` accepts when the operator takes a SCALAR one — the same test `clauseProblems` applies.
 *
 * It is duplicated rather than imported because it is private there, and because the two must NOT be the same
 * check: `clauseProblems` additionally refuses a `choice` value that is not one of the field's options, which
 * is right for authoring but wrong here. A `notEquals` against an option the author has since deleted is still a
 * perfectly evaluable comparison, and rule 22 lists only a dangling field, an unoffered operator and a
 * wrong-TYPED value as unevaluable.
 */
function valueMatchesKind(kind: ControlKind, value: unknown): boolean {
  if (kind === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (kind === 'boolean') return typeof value === 'boolean';
  // Doc 205 rule 31: a multi-choice clause's VALUE is one option const — which the options may type as a
  // number, unlike every other kind whose scalar value is a string.
  if (kind === 'multi-choice')
    return typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));
  return typeof value === 'string';
}

/** The consts of a list value, or `undefined` when it is not one (doc 199 rule 36; numbers per doc 206 rule 39). */
const listOf = (value: unknown): (string | number)[] | undefined =>
  Array.isArray(value) &&
  value.every(
    (entry) => typeof entry === 'string' || (typeof entry === 'number' && Number.isFinite(entry)),
  )
    ? (value as (string | number)[])
    : undefined;

/**
 * Rule 20: `undefined`, `null` and `''` are empty. Anything else — `0`, `false` — is an answer.
 *
 * Doc 205 rule 29: an EMPTY ARRAY is empty too. The controls write `undefined` rather than `[]` (rule 9), but a
 * restored draft or a hand-edited document can still carry one — and without this an untouched multi-select
 * reads as answered, `isNotEmpty` is true, and `conditionDecided` routes a Flow down a branch before the
 * citizen has chosen anything.
 */
const isEmptyAnswer = (answer: unknown): boolean =>
  answer === undefined ||
  answer === null ||
  answer === '' ||
  (Array.isArray(answer) && answer.length === 0);

/** Both sides of a numeric comparison as finite numbers, or `undefined` when either is not (rule 20). */
function comparableNumbers(answer: unknown, value: unknown): [number, number] | undefined {
  if (typeof answer !== 'number' || !Number.isFinite(answer)) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return [answer, value];
}

/**
 * Rules 20-22, doc 199 rule 36: whether `clause` matches the answers, given the field it names (`undefined`
 * when the field is dangling). Pure, total and independently testable — it NEVER throws, because the document
 * it reads is author-supplied and reaches the runner without passing the studio's apply gate.
 *
 * Rule 22 — a clause that cannot be evaluated never matches:
 * - the field is dangling (doc 199 reports that, and never repairs it),
 * - the operator is not one `operatorsFor(field.kind)` offers,
 * - a value-taking operator (`needsValue`) has no `value`, one of the wrong type for the kind, or — for the
 *   list operators `in` / `notIn` — anything that is not a list of strings.
 *
 * `false` is the safe answer in every one of those cases: the user goes down the Condition's Else path
 * (rule 21) rather than into an error. Under a row's `all` that fails the row; under `any` it simply does not
 * carry it (doc 199 rule 38).
 */
export function matchesClause(
  clause: Clause,
  field: CriterionField | undefined,
  data: RunnerData | undefined,
): boolean {
  // A field resolved for a different key would silently compare the wrong answer, so the pairing is checked
  // rather than trusted — this is a public function a host or a test may call directly.
  if (field === undefined || field.key !== clause.field) return false;
  if (!operatorsFor(field.kind).includes(clause.operator)) return false;

  const { operator, value } = clause;
  if (needsValue(operator)) {
    if (value === undefined) return false;
    const typed = takesList(operator)
      ? listOf(value) !== undefined
      : valueMatchesKind(field.kind, value);
    if (!typed) return false;
  }

  const answer = answerOf(data, clause.field);
  switch (operator) {
    case 'equals':
      return answer === value;
    case 'notEquals':
      return answer !== value;
    case 'contains':
    case 'startsWith':
    case 'endsWith': {
      // Only a string answer can contain anything; `value` is a string already, since all three are offered
      // for `text` alone and a wrong-typed value was refused above.
      if (typeof answer !== 'string' || typeof value !== 'string') return false;
      const [left, right] = [answer.toLowerCase(), value.toLowerCase()];
      if (operator === 'contains') return left.includes(right);
      return operator === 'startsWith' ? left.startsWith(right) : left.endsWith(right);
    }
    case 'includes':
    case 'notIncludes': {
      // Doc 205 rule 28: the mirror image of `in`/`notIn` — here the ANSWER is the list and the value is one
      // option const. `notIncludes` is the negation, so an absent answer does not include anything, which is
      // right: the citizen has chosen nothing.
      const chosen = Array.isArray(answer) && answer.includes(value as never);
      return operator === 'includes' ? chosen : !chosen;
    }
    case 'in':
    case 'notIn': {
      // The value is a list of strings (checked above); `notIn` is the negation, so a blank answer is "not in"
      // — which is right: the citizen has not picked any of the listed options.
      const listed = listOf(value)?.includes(answer as string | number) ?? false;
      return operator === 'in' ? listed : !listed;
    }
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const pair = comparableNumbers(answer, value);
      if (pair === undefined) return false;
      const [left, right] = pair;
      if (operator === 'gt') return left > right;
      if (operator === 'gte') return left >= right;
      return operator === 'lt' ? left < right : left <= right;
    }
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

/**
 * Doc 199 rule 38: whether `row` matches the answers — EVERY clause under `match: 'all'`, at least ONE under
 * `'any'`.
 *
 * A row with no clauses NEVER matches, rather than matching vacuously the way `Array.every` would: an empty row
 * is an output the author has not said anything about, and letting it swallow every answer would make it
 * indistinguishable from the Else path while sitting above it.
 */
export function matchesRow(
  row: ConditionRow,
  schema: JsonSchema,
  data: RunnerData | undefined,
): boolean {
  if (row.clauses.length === 0) return false;
  const matches = (clause: Clause) =>
    matchesClause(clause, criterionFieldOf(clause.field, schema), data);
  return row.match === 'any' ? row.clauses.some(matches) : row.clauses.every(matches);
}

/**
 * Rules 21, 23, doc 199 rule 39: the first ROW of `condition` that matches the answers, or `undefined` when
 * none does — which includes a Condition with no rows at all, a pass-through that takes its Else path.
 *
 * Authored row order decides (`rowsOf` preserves it), and the FIRST match wins: later rows are never
 * evaluated, so overlapping branches behave like an if/else-if chain rather than ambiguously.
 */
export function firstMatchingRow(
  condition: UISchemaElement,
  schema: JsonSchema,
  data: RunnerData | undefined,
): ConditionRow | undefined {
  return rowsOf(condition).find((row) => matchesRow(row, schema, data));
}

/**
 * Doc 202 rule 10c: whether this Condition's branch is DECIDED by the answers so far — a different question from
 * "which edge does it take?", which `conditionEdge` always answers (rule 21 guarantees a default path).
 *
 * The sidebar needs the distinction. Rule 21's default is the right route for a citizen who has genuinely answered
 * and matched nothing, but it is a guess for one who has not answered yet — and listing the stages of a guessed
 * branch is exactly what rule 10c forbids ("Business" must not appear before "Applying as" is chosen).
 *
 * Decided when a row matches, when the Condition has no rows at all (rule 23's pass-through, which always goes the
 * same way), or when every field named by ANY row's clause is either ANSWERED or OPTIONAL (rule 10f). An answer that
 * matches nothing is a real answer, so the Else path is a decision. So is a blank OPTIONAL field: the citizen may
 * leave it blank, blank matches no clause (an `isEmpty` one would already have matched above), and so the Else
 * path is where they go whether they answer or not. Only a blank REQUIRED field leaves the branch open, because the
 * citizen must answer it and that answer may pick any branch.
 *
 * Doc 199 rule 40: the walk is over EVERY clause of every row, never a row's first — a branch is only settled once
 * every question it could turn on has been asked.
 */
export function conditionDecided(
  condition: UISchemaElement,
  schema: JsonSchema,
  data: RunnerData | undefined,
): boolean {
  const clauses = clausesIn(condition);
  if (clauses.length === 0) return true;
  if (firstMatchingRow(condition, schema, data) !== undefined) return true;
  const required = requiredKeysOf(schema);
  return clauses.every(
    (clause) => !isEmptyAnswer(answerOf(data, clause.field)) || !required.has(clause.field),
  );
}

/** The schema's top-level `required` keys; anything that is not a list of strings counts as none. */
function requiredKeysOf(schema: JsonSchema): ReadonlySet<string> {
  const { required } = schema;
  return new Set(Array.isArray(required) ? required.filter((key) => typeof key === 'string') : []);
}

/** What `conditionEdge` needs: the Condition, the node id edges address it by, and the answers to judge. */
export interface ConditionRoute {
  readonly condition: UISchemaElement;
  /** The Condition's node id from `drawnNodes` — the `source` of its outgoing edges. */
  readonly nodeId: string;
  /** The SANITISED edges of the whole Flow (`flowEdges`), never raw `options.edges` (doc 199 rule 7). */
  readonly edges: readonly FlowEdge[];
  readonly schema: JsonSchema;
  readonly data: RunnerData | undefined;
}

/**
 * Rule 21, doc 199 rule 39: the edge a Condition sends these answers down — the outgoing edge whose
 * `sourceHandle` is the first matching ROW's id, else the outgoing edge with NO `sourceHandle` (the Else path).
 *
 * `flowProblems` guarantees every Condition has a default, but this returns `undefined` rather than throwing
 * when it does not: a hand-edited document reaches the runner without passing the apply gate (rule 17), and the
 * traversal reads a missing edge as the end of the flow (rule 16), which is a dead end the author can see.
 *
 * A matching row whose output is CONNECTED TO NOTHING falls back to the Else path too, rather than trying the
 * rows after it — first match wins means the later ones were never in play. `flowEdges` has already dropped any
 * edge leaving by a row id that does not exist (doc 199 rule 12), so an edge found here always names a real
 * branch.
 */
export function conditionEdge(route: ConditionRoute): FlowEdge | undefined {
  const { condition, nodeId, edges, schema, data } = route;
  const outgoing = edges.filter((edge) => edge.source === nodeId);
  const matched = firstMatchingRow(condition, schema, data);
  const branch =
    matched === undefined ? undefined : outgoing.find((edge) => edge.sourceHandle === matched.id);
  return branch ?? outgoing.find((edge) => edge.sourceHandle === undefined);
}
