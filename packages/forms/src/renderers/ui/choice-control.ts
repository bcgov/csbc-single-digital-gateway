import { and, schemaMatches, uiTypeIs, type JsonSchema, type Tester } from '@jsonforms/core';

// oneOf (const/title) choice schemas for the renderers/ui Combobox and RadioGroup (doc 188 rules 1-3). The schema
// is hand-authored JSON nothing validates, so its shape is checked here — stricter than @jsonforms/core's
// `isOneOfEnumSchema`, which accepts an empty `oneOf` and consts of any type.

/** One choice: the `const` written to the data, the `title` shown for it, and any help text under it. */
export interface ChoiceOption {
  value: string | number;
  label: string;
  /**
   * Doc 205 rule 3: an entry's `description`, when it is a non-empty string. Populated for SINGLE choices too,
   * so the two classifiers return one shape and a single-choice control can show it without another change.
   */
  description?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Whether `value` is a const of the schema `type`: a string, a finite number, or a whole one for an integer. */
const isConstOf = (type: ChoiceType, value: unknown): value is string | number => {
  if (type === 'string') return typeof value === 'string';
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  return type === 'number' || Number.isInteger(value);
};

/**
 * Doc 204 rule 18b: `integer` joins string and number. "Allow decimals: off" writes `type: 'integer'` and the
 * metaschema now admits it (rule 20), so a hand-authored `{ type: 'integer', oneOf: [...] }` reaches the
 * renderers — and without this it would draw a NUMBER INPUT that silently ignores its own choices, which is
 * worse than the nothing it drew before. An integer choice's consts must be whole, or the list would offer a
 * value its own schema rejects.
 */
export type ChoiceType = 'string' | 'number' | 'integer';

/**
 * Doc 205 rule 2: a `oneOf` list read into options against a known const `type`, or `undefined` when any entry
 * fails. Shared with `multiChoiceOptions` (`multi-choice-control.ts`), which finds its list under `items` — one
 * implementation, so the single- and multi-choice controls can never disagree about what a choice list IS.
 *
 * A label falls back to its const when the `title` is not a non-empty string; a repeated const keeps its first
 * entry; a `description` is carried only when it is a non-empty string.
 */
export function optionsFrom(type: ChoiceType, entries: unknown): ChoiceOption[] | undefined {
  if (!Array.isArray(entries) || entries.length === 0) return undefined;

  const options: ChoiceOption[] = [];
  for (const entry of entries) {
    if (!isRecord(entry)) return undefined;
    const value = entry['const'];
    if (!isConstOf(type, value)) return undefined;
    if (options.some((option) => option.value === value)) continue;
    const title = entry['title'];
    const description = entry['description'];
    options.push({
      value,
      label: typeof title === 'string' && title.length > 0 ? title : String(value),
      // `exactOptionalPropertyTypes`: an absent description must be an ABSENT KEY, never `undefined`.
      ...(typeof description === 'string' && description.length > 0 ? { description } : {}),
    });
  }
  return options;
}

/**
 * The options of a SINGLE-value choice schema — `type` `'string'`, `'number'` or `'integer'` with a non-empty
 * top-level `oneOf` — else `undefined`.
 *
 * Doc 205 rule 4: it stays deliberately ARRAY-BLIND. Teaching it to unwrap `items.oneOf` would make
 * `isChoiceControl` match a multi-choice schema, and the Combobox — winning at rank 3 — would render the field
 * as a single select writing a SCALAR into an array-typed property. The array case is
 * `multiChoiceOptions`, on its own tester, at its own ranks.
 */
export function choiceOptions(schema: JsonSchema | undefined): ChoiceOption[] | undefined {
  const type = schema?.type;
  if (type !== 'string' && type !== 'number' && type !== 'integer') return undefined;
  return optionsFrom(type, schema?.oneOf);
}

/** A Control whose resolved schema is a choice schema (rule 3). */
export const isChoiceControl: Tester = and(
  uiTypeIs('Control'),
  schemaMatches((schema) => choiceOptions(schema) !== undefined),
);
