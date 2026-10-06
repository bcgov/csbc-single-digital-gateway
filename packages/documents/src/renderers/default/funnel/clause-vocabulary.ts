import type { Operator } from '@repo/forms';
import { isRecord } from './funnel-graph';

/**
 * The clause vocabulary a Condition branch is authored in AND matched by (doc 274 rule 5) — one definition, so "may
 * this clause be authored?" and "does it match?" can never disagree. Re-exported by `studio/criteria.ts`. Stored values
 * keep `@repo/forms`' `Operator` union.
 */
export type FieldKind = 'text' | 'number' | 'choice' | 'multi' | 'boolean';

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

export const OPERATORS_BY_KIND: Readonly<Record<FieldKind, readonly Operator[]>> = Object.freeze({
  text: ['equals', 'notEquals', 'contains', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'],
  number: ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'isEmpty', 'isNotEmpty'],
  choice: ['equals', 'notEquals', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  // A multiple choice's answer is a list (doc 256 rule 4): only rules offer it — Funnel Conditions never see this kind.
  multi: ['includes', 'notIncludes', 'isEmpty', 'isNotEmpty'],
  boolean: ['isTrue', 'isFalse'],
});

const VALUELESS = new Set<Operator>(['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse']);
const LIST_VALUED = new Set<Operator>(['in', 'notIn']);

export const needsValue = (operator: Operator): boolean => !VALUELESS.has(operator);
export const takesList = (operator: Operator): boolean => LIST_VALUED.has(operator);

const KIND_BY_TYPE: Readonly<Record<string, FieldKind>> = Object.freeze({
  string: 'text',
  number: 'number',
  integer: 'number',
  boolean: 'boolean',
});

/** A property's choices: `oneOf` consts (titled) or an `enum`; `undefined` when it is not a choice. */
export function choicesOf(property: Record<string, unknown>): FieldOption[] | undefined {
  const { oneOf, enum: values } = property;
  if (Array.isArray(oneOf) && oneOf.length > 0) {
    const options = oneOf.flatMap((entry): FieldOption[] => {
      if (!isRecord(entry)) return [];
      const value = entry['const'];
      if (typeof value !== 'string' && typeof value !== 'number') return [];
      return [
        { value, label: typeof entry['title'] === 'string' ? entry['title'] : String(value) },
      ];
    });
    return options.length > 0 ? options : undefined;
  }
  if (Array.isArray(values) && values.length > 0) {
    return values
      .filter((v): v is string | number => typeof v === 'string' || typeof v === 'number')
      .map((value) => ({ value, label: String(value) }));
  }
  return undefined;
}

/**
 * The kind of answer a property holds, for clauses (rule 5): a choice, else by `type` — `undefined` for anything a
 * Condition cannot test (an object, an array, rich text).
 */
export function fieldKindOf(property: unknown): FieldKind | undefined {
  if (!isRecord(property)) return undefined;
  if (choicesOf(property) !== undefined) return 'choice';
  return KIND_BY_TYPE[String(property['type'])];
}
