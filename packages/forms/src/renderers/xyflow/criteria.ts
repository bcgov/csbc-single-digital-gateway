import type { ChoiceOption } from '../ui/choice-control';
import type { ControlKind } from '../ui/control-kind';
import type { Criterion, Operator } from '../../types/elements';

// The criterion model of a Condition node (doc 199 rules 1-5). Pure — no React, no @xyflow/react — so the
// operator vocabulary, what needs a value and what makes a criterion invalid are one source of truth shared by
// the card that authors a criterion and the gate that validates one.

/** A field a criterion may name: resolved from the document by `upstreamFieldsOf` (rule 6). */
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
  text: Object.freeze(['equals', 'notEquals', 'contains', 'isEmpty', 'isNotEmpty'] as const),
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
  choice: Object.freeze(['equals', 'notEquals', 'isEmpty', 'isNotEmpty'] as const),
  boolean: Object.freeze(['isTrue', 'isFalse'] as const),
});

/** Rule 2: the operators `kind` offers, or `[]` for an unknown or absent kind — never a throw. */
export function operatorsFor(kind: ControlKind | undefined): readonly Operator[] {
  return kind === undefined ? [] : (OPERATORS_BY_KIND[kind] ?? []);
}

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

/** The value a `kind` accepts, when the operator needs one. */
function valueMatchesKind(kind: ControlKind, value: unknown): boolean {
  if (kind === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (kind === 'boolean') return typeof value === 'boolean';
  return typeof value === 'string';
}

/**
 * Rules 4-5: why `criterion` is not usable against `fields`, or `[]` when it is. A criterion is only ever
 * authored complete (rule 26), so anything here means the document was hand-edited or the flow changed
 * underneath it — `flowProblems` reports these, and nothing repairs them automatically (rule 9).
 */
export function criterionProblems(
  criterion: Criterion,
  fields: readonly CriterionField[],
): string[] {
  const field = fields.find((candidate) => candidate.key === criterion.field);
  if (!field) return [unknownFieldMessage(criterion.field)];

  const problems: string[] = [];
  if (!operatorsFor(field.kind).includes(criterion.operator)) {
    problems.push(unknownOperatorMessage(criterion.operator, field.label));
    // Without a valid operator there is no rule for the value, so stop here.
    return problems;
  }

  if (!needsValue(criterion.operator)) return problems;
  if (criterion.value === undefined) {
    problems.push(missingValueMessage(criterion.operator));
  } else if (!valueMatchesKind(field.kind, criterion.value)) {
    problems.push(wrongTypeMessage(field.label));
  } else if (
    field.kind === 'choice' &&
    !(field.options ?? []).some((option) => option.value === criterion.value)
  ) {
    problems.push(unknownChoiceMessage(field.label));
  }
  return problems;
}
