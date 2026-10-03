/** One choice (doc 244 rule 4): the `const` written to the data, the `title` shown for it, any help text under it. */
export interface ChoiceOption {
  /** A string, or a number for a `number` / `integer` choice (doc 246) — written back as-is, never as a string. */
  value: string | number;
  label: string;
  description?: string;
}

/** The const type of a choice list (doc 246 rule 1). */
export type ChoiceType = 'string' | 'number' | 'integer';

function isChoiceType(value: unknown): value is ChoiceType {
  return value === 'string' || value === 'number' || value === 'integer';
}

/** Whether `value` is a const of `type`: a string, a finite number, or a finite WHOLE number (doc 246 rule 1). */
function isConstOf(type: ChoiceType, value: unknown): value is string | number {
  if (type === 'string') return typeof value === 'string';
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  return type === 'number' || Number.isInteger(value);
}

/**
 * A `oneOf` list read into options (doc 244 rules 3-4, doc 246 rule 1) — a non-empty array whose every entry is an
 * object with a `const` of `type` — else `undefined`, so a mixed list is refused whole. The same rules as
 * `@repo/forms`' `optionsFrom`: a label falls back to its const, a repeated const (by `===`) keeps its first entry,
 * and a description is carried only when a non-empty string. Single and multiple choice (doc 245 rule 3) both read
 * through it, so they can never disagree about a list.
 */
function optionsFrom(type: ChoiceType, entries: unknown): ChoiceOption[] | undefined {
  if (!Array.isArray(entries) || entries.length === 0) return undefined;
  const options: ChoiceOption[] = [];
  for (const raw of entries) {
    const entry = recordOf(raw);
    const value = entry?.['const'];
    if (!isConstOf(type, value)) return undefined;
    if (options.some((option) => option.value === value)) continue;
    const { title, description } = entry ?? {};
    options.push({
      value,
      label: typeof title === 'string' && title !== '' ? title : String(value),
      ...(typeof description === 'string' && description !== '' && { description }),
    });
  }
  return options;
}

/**
 * A single choice's options (doc 244 rule 3, doc 246 rule 2): `type` exactly `'string'`, `'number'` or `'integer'` —
 * never a union — with a valid `oneOf` of that type, else `undefined`.
 */
export function choiceOptions(schema: unknown): ChoiceOption[] | undefined {
  const s = recordOf(schema);
  const type = s?.['type'];
  return isChoiceType(type) ? optionsFrom(type, s?.['oneOf']) : undefined;
}

/** Whether `schema` is a single choice (doc 244 rule 3). */
export function isSingleChoice(schema: unknown): boolean {
  return choiceOptions(schema) !== undefined;
}

/**
 * A multiple choice's options (doc 245 rules 3-4, doc 246 rule 3): `type: 'array'` whose `items` hold a valid
 * `oneOf` of the items' const type, else `undefined`. `uniqueItems` is not required: neither control can write a
 * duplicate.
 */
export function multiChoiceOptions(schema: unknown): ChoiceOption[] | undefined {
  const s = recordOf(schema);
  const items = recordOf(s?.['items']);
  if (s?.['type'] !== 'array' || items === undefined) return undefined;
  const type = itemsChoiceType(items);
  return type === undefined ? undefined : optionsFrom(type, items['oneOf']);
}

/**
 * The const type of a multiple choice's `items` (doc 246 rule 3): a DECLARED `type` as-is — its consts must then
 * match, never guessed — else inferred from the first const: a string → `'string'`, a finite number → `'number'`
 * (never `'integer'`).
 */
export function itemsChoiceType(items: Record<string, unknown>): ChoiceType | undefined {
  const declared = items['type'];
  if (declared !== undefined) return isChoiceType(declared) ? declared : undefined;
  const entries = items['oneOf'];
  const first = Array.isArray(entries) ? recordOf(entries[0])?.['const'] : undefined;
  if (typeof first === 'string') return 'string';
  return typeof first === 'number' && Number.isFinite(first) ? 'number' : undefined;
}

/** Whether `schema` is a multiple choice (doc 245 rule 3). Disjoint from `isSingleChoice` by `type`. */
export function isMultiChoice(schema: unknown): boolean {
  return multiChoiceOptions(schema) !== undefined;
}

/** The options `data` chooses, in AUTHORING order; a const that is no option chooses nothing (doc 245 rule 5). */
export function chosenOptions(options: readonly ChoiceOption[], data: unknown): ChoiceOption[] {
  return Array.isArray(data) ? options.filter((option) => data.includes(option.value)) : [];
}

/**
 * What a change writes (doc 245 rule 6): the picked consts that are options, in AUTHORING order — or `undefined`,
 * never `[]`, when none are, since an empty array is a present key and `required` could never fail.
 */
export function storedChoices(
  options: readonly ChoiceOption[],
  picked: readonly (string | number)[],
): (string | number)[] | undefined {
  const values = options.filter((option) => picked.includes(option.value)).map((o) => o.value);
  return values.length > 0 ? values : undefined;
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
