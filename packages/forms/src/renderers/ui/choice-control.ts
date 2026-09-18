import { and, schemaMatches, uiTypeIs, type JsonSchema, type Tester } from '@jsonforms/core';

// oneOf (const/title) choice schemas for the renderers/ui Combobox and RadioGroup (doc 188 rules 1-3). The schema
// is hand-authored JSON nothing validates, so its shape is checked here — stricter than @jsonforms/core's
// `isOneOfEnumSchema`, which accepts an empty `oneOf` and consts of any type.

/** One choice: the `const` written to the data and the `title` shown for it. */
export interface ChoiceOption {
  value: string | number;
  label: string;
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
type ChoiceType = 'string' | 'number' | 'integer';

/**
 * The options of a choice schema — `type` `'string'`, `'number'` or `'integer'` with a non-empty `oneOf` whose every entry is
 * an object with a `const` of that type — else `undefined`. A label falls back to its const when the `title` is
 * not a non-empty string; a repeated const keeps its first entry.
 */
export function choiceOptions(schema: JsonSchema | undefined): ChoiceOption[] | undefined {
  const type = schema?.type;
  const entries: unknown = schema?.oneOf;
  if (type !== 'string' && type !== 'number' && type !== 'integer') return undefined;
  if (!Array.isArray(entries) || entries.length === 0) return undefined;

  const options: ChoiceOption[] = [];
  for (const entry of entries) {
    if (!isRecord(entry)) return undefined;
    const value = entry['const'];
    if (!isConstOf(type, value)) return undefined;
    if (options.some((option) => option.value === value)) continue;
    const title = entry['title'];
    options.push({
      value,
      label: typeof title === 'string' && title.length > 0 ? title : String(value),
    });
  }
  return options;
}

/** A Control whose resolved schema is a choice schema (rule 3). */
export const isChoiceControl: Tester = and(
  uiTypeIs('Control'),
  schemaMatches((schema) => choiceOptions(schema) !== undefined),
);
