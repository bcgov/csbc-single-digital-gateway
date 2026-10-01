import type { Clause, ConditionRow, Operator } from '@repo/forms';

/**
 * The clause vocabulary a Condition branch is authored in — a compact port of `@repo/forms`'
 * `renderers/xyflow/criteria.ts` and `condition-rows.ts`, which that package does not export. Stored values keep
 * its `Operator` union, so a Funnel's conditions stay evaluable by `@repo/forms/runner`.
 */
export type FieldKind = 'text' | 'number' | 'choice' | 'boolean';

export interface FieldOption {
  value: string | number;
  label: string;
}

/** A field a clause may test: a top-level schema property shown by a Control upstream of the Condition. */
export interface CriterionField {
  key: string;
  label: string;
  kind: FieldKind;
  options?: FieldOption[];
}

export const OPERATORS_BY_KIND: Readonly<Record<FieldKind, readonly Operator[]>> = {
  text: ['equals', 'notEquals', 'contains', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'],
  number: ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'isEmpty', 'isNotEmpty'],
  choice: ['equals', 'notEquals', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  boolean: ['isTrue', 'isFalse'],
};

export const OPERATOR_LABELS: Readonly<Record<Operator, string>> = {
  equals: 'equals',
  notEquals: 'does not equal',
  contains: 'contains',
  startsWith: 'starts with',
  endsWith: 'ends with',
  in: 'is one of',
  notIn: 'is not one of',
  gt: 'is greater than',
  gte: 'is at least',
  lt: 'is less than',
  lte: 'is at most',
  isEmpty: 'is empty',
  isNotEmpty: 'is not empty',
  isTrue: 'is true',
  isFalse: 'is false',
  includes: 'includes',
  notIncludes: 'does not include',
};

/** What the default output is called, on the canvas and in the dialog. */
export const DEFAULT_LABEL = 'Otherwise';

const VALUELESS = new Set<Operator>(['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse']);
const LIST_VALUED = new Set<Operator>(['in', 'notIn']);

export const needsValue = (operator: Operator): boolean => !VALUELESS.has(operator);
export const takesList = (operator: Operator): boolean => LIST_VALUED.has(operator);

/** The value a clause starts with for `operator` on `field`: none, an empty list, or a sensible scalar. */
export function startingValue(field: CriterionField, operator: Operator): Clause['value'] {
  if (!needsValue(operator)) return undefined;
  if (takesList(operator)) return [];
  if (field.kind === 'number') return 0;
  if (field.kind === 'choice') return field.options?.[0]?.value ?? '';
  return '';
}

/** A clause on `field` with its first operator — what "Add clause" and a field change produce. */
export function clauseFor(field: CriterionField, id: string): Clause {
  const operator = OPERATORS_BY_KIND[field.kind][0]!;
  const value = startingValue(field, operator);
  return { id, field: field.key, operator, ...(value !== undefined && { value }) };
}

/** A clause as words — `<field> <operator> <value>` — using labels for fields and choice values when known. */
export function clauseSummary(clause: Clause, fields: readonly CriterionField[]): string {
  const field = fields.find((f) => f.key === clause.field);
  const head = `${field?.label ?? clause.field} ${OPERATOR_LABELS[clause.operator] ?? clause.operator}`;
  if (!needsValue(clause.operator) || clause.value === undefined) return head;
  const values = Array.isArray(clause.value) ? clause.value : [clause.value];
  const words = values.map((v) => field?.options?.find((o) => o.value === v)?.label ?? String(v));
  return `${head} ${words.join(', ')}`;
}

/** A branch as words: its first two clauses joined by ` · `, then how many more, joined by all/any. */
export function rowSummary(row: ConditionRow, fields: readonly CriterionField[]): string {
  if (row.clauses.length === 0) return `${row.label} (not set)`;
  const joiner = row.match === 'any' ? ' or ' : ' · ';
  const shown = row.clauses.slice(0, 2).map((c) => clauseSummary(c, fields));
  const rest = row.clauses.length - shown.length;
  return rest > 0 ? `${shown.join(joiner)} +${rest} more` : shown.join(joiner);
}

/** Whether a clause has everything it tests against: a value when its operator needs one (a non-empty one). */
export function clauseIsSet(clause: Clause): boolean {
  if (!needsValue(clause.operator)) return true;
  const { value } = clause;
  return value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0);
}

/** Whether a branch can be taken: it has at least one clause, and every clause is set. */
export const rowIsSet = (row: ConditionRow): boolean =>
  row.clauses.length > 0 && row.clauses.every(clauseIsSet);

/** The label the next new branch gets: one past the highest `Condition <n>`, so deleting never duplicates one. */
export function nextRowLabel(rows: readonly ConditionRow[]): string {
  const highest = rows.reduce((top, row) => {
    const n = /^Condition (\d+)$/.exec(row.label.trim())?.[1];
    return n === undefined ? top : Math.max(top, Number(n));
  }, 0);
  return `Condition ${Math.max(highest, rows.length) + 1}`;
}
