import type { ChoiceOption } from '../ui/choice-control';
import type { ControlKind } from '../ui/control-kind';
import type { Clause, Operator } from '../../types/elements';

// The clause model of a Condition node (doc 199 rules 1-5, 36). Pure — no React, no @xyflow/react — so the
// operator vocabulary, what needs a value and what makes a clause invalid are one source of truth shared by
// the popover that authors a clause, the gate that validates one and the RUNNER that evaluates one (doc 202).

/** A field a clause may name: resolved from the document by `upstreamFieldsOf` (rule 6). */
export interface CriterionField {
  /** The top-level schema property key — what a criterion stores. */
  readonly key: string;
  /** The Control's own label, else the property's title (rule 6). */
  readonly label: string;
  readonly kind: ControlKind;
  /** The field's choices, for a `choice` kind (rule 4). */
  readonly options?: readonly ChoiceOption[];
}

/**
 * Rule 1: the operators each field kind offers. ONE frozen map, read only through `operatorsFor` — a UI that
 * offered an operator the validator rejects, or the reverse, is exactly what this prevents.
 */
export const OPERATORS_BY_KIND: Readonly<Record<ControlKind, readonly Operator[]>> = Object.freeze({
  text: Object.freeze([
    'equals',
    'notEquals',
    'contains',
    'startsWith',
    'endsWith',
    'isEmpty',
    'isNotEmpty',
  ] as const),
  number: Object.freeze([
    'equals',
    'notEquals',
    'gt',
    'gte',
    'lt',
    'lte',
    'isEmpty',
    'isNotEmpty',
  ] as const),
  choice: Object.freeze(['equals', 'notEquals', 'in', 'notIn', 'isEmpty', 'isNotEmpty'] as const),
  boolean: Object.freeze(['isTrue', 'isFalse'] as const),
  /**
   * Doc 207 rule 29: nothing else is offerable. `equals` would compare node trees by REFERENCE, and
   * `contains` would compare a string to an object and never match — the silent failure the kind exists to
   * prevent. `isEmpty` asks whether the state holds text (rule 5), not whether the key is present.
   */
  'rich-text': Object.freeze(['isEmpty', 'isNotEmpty'] as const),
  // Doc 205 rule 27: no `equals`/`notEquals` — `matchesClause` compares with `===`, which against an array is
  // reference identity and never true. What an author means by "equals" here is `includes`.
  'multi-choice': Object.freeze(['includes', 'notIncludes', 'isEmpty', 'isNotEmpty'] as const),
});

/** Rule 2: the operators `kind` offers, or `[]` for an unknown or absent kind — never a throw. */
export function operatorsFor(kind: ControlKind | undefined): readonly Operator[] {
  return kind === undefined ? [] : (OPERATORS_BY_KIND[kind] ?? []);
}

/**
 * Doc 199 rule 19: an operator in words, for the pickers that author one. The stored vocabulary stays the
 * `Operator` union — this is display only, so a row summary keeps reading as the authored operator.
 */
export const OPERATOR_LABELS: Readonly<Record<Operator, string>> = Object.freeze({
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
});

const VALUELESS: ReadonlySet<Operator> = new Set<Operator>([
  'isEmpty',
  'isNotEmpty',
  'isTrue',
  'isFalse',
]);

/** Rule 3: whether `operator` requires a `value`. The single rule both the card and the validator read. */
export const needsValue = (operator: Operator): boolean => !VALUELESS.has(operator);

export const unknownFieldMessage = (key: string) => `No field with key "${key}" is available here.`;
export const unknownOperatorMessage = (operator: string, label: string) =>
  `"${operator}" cannot be used with ${label}.`;
export const missingValueMessage = (operator: string) => `"${operator}" needs a value.`;
export const wrongTypeMessage = (label: string) => `The value does not match the type of ${label}.`;
export const unknownChoiceMessage = (label: string) =>
  `The value is not one of ${label}'s options.`;

/** Rule 36: the operators whose `value` is a LIST of choice values rather than a scalar. */
const LIST_VALUED: ReadonlySet<Operator> = new Set<Operator>(['in', 'notIn']);

/** Whether `operator` takes a list value (rule 36). Read by the popover's value control and by the runner. */
export const takesList = (operator: Operator): boolean => LIST_VALUED.has(operator);

export const emptyListMessage = (operator: string) => `"${operator}" needs at least one value.`;

/** The value a `kind` accepts, when the operator needs a SCALAR one. */
function valueMatchesKind(kind: ControlKind, value: unknown): boolean {
  if (kind === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (kind === 'boolean') return typeof value === 'boolean';
  // Doc 205 rule 31, WIDENED to single choice (doc 206 rule 39): a choice clause's VALUE is one option
  // const, and a `oneOf` const may be typed as a NUMBER for either kind — `{ type: 'number', oneOf: [...] }`
  // is a perfectly ordinary choice field, and the sample ships one.
  //
  // Accepting strings only made a numeric-const choice field UNEDITABLE: the real const failed here as the
  // wrong type, the select's raw string failed the membership check below, and `setClause` refuses any edit
  // that lands on a problem — so the value picker was frozen on whatever `startingValue` gave it.
  if (kind === 'choice' || kind === 'multi-choice')
    return typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));
  return typeof value === 'string';
}

/**
 * The consts of a list value, or `undefined` when it is not a list of them (rule 36).
 *
 * Doc 206 rule 39: numbers are consts too, so `in` / `notIn` work on a numeric-const choice field — without
 * this the SAME field that could not be edited scalar-wise could not use a list operator either.
 */
const listOf = (value: unknown): (string | number)[] | undefined =>
  Array.isArray(value) &&
  value.every(
    (entry) => typeof entry === 'string' || (typeof entry === 'number' && Number.isFinite(entry)),
  )
    ? (value as (string | number)[])
    : undefined;

/** Rule 4: the option values `field` offers, as a set — empty for a field that is not a choice. */
const optionValuesOf = (field: CriterionField): ReadonlySet<ChoiceOption['value']> =>
  new Set((field.options ?? []).map((option) => option.value));

/**
 * Rules 4-5, 36: why `clause` is not usable against `fields`, or `[]` when it is. A clause is only ever
 * authored complete (rule 46), so anything here means the document was hand-edited or the flow changed
 * underneath it — `flowProblems` reports these, and nothing repairs them automatically (rule 9).
 */
export function clauseProblems(clause: Clause, fields: readonly CriterionField[]): string[] {
  const field = fields.find((candidate) => candidate.key === clause.field);
  if (!field) return [unknownFieldMessage(clause.field)];

  const problems: string[] = [];
  if (!operatorsFor(field.kind).includes(clause.operator)) {
    problems.push(unknownOperatorMessage(clause.operator, field.label));
    // Without a valid operator there is no rule for the value, so stop here.
    return problems;
  }

  if (!needsValue(clause.operator)) return problems;
  if (clause.value === undefined) return [missingValueMessage(clause.operator)];

  // A list operator refuses a scalar and a scalar operator refuses a list: the two shapes are never
  // interchangeable, so each reads as the wrong TYPE rather than as a value out of range.
  if (takesList(clause.operator)) {
    const list = listOf(clause.value);
    if (list === undefined) return [wrongTypeMessage(field.label)];
    if (list.length === 0) return [emptyListMessage(clause.operator)];
    const offered = optionValuesOf(field);
    if (!list.every((entry) => offered.has(entry)))
      problems.push(unknownChoiceMessage(field.label));
    return problems;
  }

  if (listOf(clause.value) !== undefined || !valueMatchesKind(field.kind, clause.value)) {
    problems.push(wrongTypeMessage(field.label));
  } else if (
    field.kind === 'choice' &&
    !optionValuesOf(field).has(clause.value as string | number)
  ) {
    problems.push(unknownChoiceMessage(field.label));
  }
  return problems;
}

/** Doc 199 rule 34: the hint shown under a Condition for a field a citizen may leave blank. */
export const decisionFieldHint = (label: string) =>
  `${label} is optional. Leaving it blank follows Otherwise.`;

/** Operators under which a BLANK answer is itself the thing being tested, so blank is handled on purpose. */
const BLANK_AWARE: ReadonlySet<Operator> = new Set<Operator>(['isEmpty', 'isNotEmpty']);

/**
 * Doc 199 rule 34: the fields this Condition decides on that a citizen may leave BLANK without the author having said
 * what blank means — in clause order, each once. Blank matches no clause, so it silently follows the Else path.
 *
 * A field is listed when it is NOT in the schema's `required`, and none of the clauses on it test for blank
 * (`isEmpty` / `isNotEmpty`). Booleans are never listed: an unticked box IS the "no" answer, and requiring one would
 * force it ticked. Fields the Condition cannot resolve are left to `clauseProblems`.
 *
 * It takes the Condition's clauses FLATTENED across its rows (rule 40): a field decided on by any row's clause is
 * one the citizen may leave blank, whichever branch happens to name it.
 */
export function optionalDecisionFields(
  clauses: readonly Clause[],
  fields: readonly CriterionField[],
  required: ReadonlySet<string>,
): CriterionField[] {
  const listed: CriterionField[] = [];
  for (const clause of clauses) {
    if (listed.some((field) => field.key === clause.field)) continue;
    const field = fields.find((candidate) => candidate.key === clause.field);
    if (field === undefined || field.kind === 'boolean' || required.has(field.key)) continue;
    const blankAware = clauses.some(
      (other) => other.field === field.key && BLANK_AWARE.has(other.operator),
    );
    if (!blankAware) listed.push(field);
  }
  return listed;
}
