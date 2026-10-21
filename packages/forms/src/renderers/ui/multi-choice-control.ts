import { and, schemaMatches, uiTypeIs, type JsonSchema, type Tester } from '@jsonforms/core';
import { optionsFrom, type ChoiceOption, type ChoiceType } from './choice-control';

// Doc 205 rules 1-4 — the MULTI-choice schema: `{ type: 'array', uniqueItems: true, items: { oneOf: [...] } }`,
// where the citizen picks several of a fixed list. Kept apart from `choice-control.ts` on purpose: the two
// testers must stay disjoint, or the single-choice Combobox claims an array schema and writes a scalar into it.

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Rule 1: the const type of an `items` schema — its declared `type` when it has one, else inferred from the
 * first const.
 *
 * A DECLARED type is returned as-is even when it contradicts the consts, so `optionsFrom` then rejects the
 * whole schema: the old builder emits `items: { type: 'string', oneOf }` and a document claiming `string` over
 * numeric consts is contradictory, not merely untidy. Guessing which half the author meant would render a field
 * whose values its own schema rejects.
 */
export function itemsChoiceType(items: Record<string, unknown>): ChoiceType | undefined {
  const declared = items['type'];
  if (declared !== undefined) {
    return declared === 'string' || declared === 'number' || declared === 'integer'
      ? declared
      : undefined;
  }
  const entries = items['oneOf'];
  const first = Array.isArray(entries) && isRecord(entries[0]) ? entries[0]['const'] : undefined;
  if (typeof first === 'string') return 'string';
  return typeof first === 'number' && Number.isFinite(first) ? 'number' : undefined;
}

/**
 * Rules 1-2: the options of a multi-choice schema — `type: 'array'` whose `items.oneOf` is a non-empty list of
 * `{ const, title?, description? }` sharing one const type — else `undefined`.
 *
 * `uniqueItems` is not required here: the palette authors it and Ajv enforces it, but neither control can
 * produce a duplicate, so its absence makes a schema untidy rather than un-renderable.
 */
export function multiChoiceOptions(schema: JsonSchema | undefined): ChoiceOption[] | undefined {
  if (schema?.type !== 'array') return undefined;
  const items: unknown = schema.items;
  if (!isRecord(items)) return undefined;
  const type = itemsChoiceType(items);
  return type === undefined ? undefined : optionsFrom(type, items['oneOf']);
}

/** Rule 4: a Control whose resolved schema is a multi-choice schema. */
export const isMultiChoiceControl: Tester = and(
  uiTypeIs('Control'),
  schemaMatches((schema) => multiChoiceOptions(schema) !== undefined),
);

/**
 * Rule 8: the options the stored value selects, in AUTHORING order — the order of `items.oneOf` filtered by
 * membership, never the order the citizen clicked. The review page and two submissions of the same answers
 * should read identically.
 *
 * A stored const that is not among the options selects nothing (rule 11): it is not shown, and it is not
 * rewritten just because this render cannot display it.
 */
export const chosenOptions = (options: ChoiceOption[], data: unknown): ChoiceOption[] =>
  Array.isArray(data) ? options.filter((option) => data.includes(option.value)) : [];

/**
 * Rules 8-9: what a selection writes — the chosen consts in authoring order, or `undefined` when nothing is
 * chosen.
 *
 * `undefined`, never `[]`: an empty array is a PRESENT key, so a plain `required` would pass with nothing
 * chosen and the schema would need `minItems: 1` to mean anything (doc 182 rule 15 applies here exactly as it
 * does to an emptied text field).
 *
 * An unknown const the answer carried is dropped at this point — the citizen is actively choosing, so keeping
 * a value they can neither see nor remove would be worse than losing it.
 */
export function storedChoices(
  options: ChoiceOption[],
  chosen: readonly ChoiceOption[],
): (string | number)[] | undefined {
  const values = options
    .filter((option) => chosen.some((pick) => pick.value === option.value))
    .map((option) => option.value);
  return values.length > 0 ? values : undefined;
}
