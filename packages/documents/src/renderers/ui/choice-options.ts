/** One choice (doc 244 rule 4): the `const` written to the data, the `title` shown for it, any help text under it. */
export interface ChoiceOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * A `oneOf` list read into options (doc 244 rules 3-4) — a non-empty array whose every entry is an object with a
 * string `const` — else `undefined`. The same rules as `@repo/forms`' `optionsFrom`, string only: a label falls back
 * to its const, a repeated const keeps its first entry, and a description is carried only when a non-empty string.
 * Single and multiple choice (doc 245 rule 3) both read through it, so they can never disagree about a list.
 */
function optionsFrom(entries: unknown): ChoiceOption[] | undefined {
  if (!Array.isArray(entries) || entries.length === 0) return undefined;
  const options: ChoiceOption[] = [];
  for (const raw of entries) {
    const entry = recordOf(raw);
    const value = entry?.['const'];
    if (typeof value !== 'string') return undefined;
    if (options.some((option) => option.value === value)) continue;
    const { title, description } = entry ?? {};
    options.push({
      value,
      label: typeof title === 'string' && title !== '' ? title : value,
      ...(typeof description === 'string' && description !== '' && { description }),
    });
  }
  return options;
}

/** A single string choice's options (doc 244 rule 3): `type: 'string'` with a valid `oneOf`, else `undefined`. */
export function choiceOptions(schema: unknown): ChoiceOption[] | undefined {
  const s = recordOf(schema);
  return s?.['type'] === 'string' ? optionsFrom(s['oneOf']) : undefined;
}

/** Whether `schema` is a single string choice (doc 244 rule 3). */
export function isSingleChoice(schema: unknown): boolean {
  return choiceOptions(schema) !== undefined;
}

/**
 * A multiple choice's options (doc 245 rules 3-4): `type: 'array'` whose `items` — `type` absent or `'string'` —
 * hold a valid `oneOf`, else `undefined`. `uniqueItems` is not required: neither control can write a duplicate.
 */
export function multiChoiceOptions(schema: unknown): ChoiceOption[] | undefined {
  const s = recordOf(schema);
  const items = recordOf(s?.['items']);
  if (s?.['type'] !== 'array' || items === undefined) return undefined;
  if (items['type'] !== undefined && items['type'] !== 'string') return undefined;
  return optionsFrom(items['oneOf']);
}

/** Whether `schema` is a multiple string choice (doc 245 rule 3). Disjoint from `isSingleChoice` by `type`. */
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
  picked: readonly string[],
): string[] | undefined {
  const values = options.filter((option) => picked.includes(option.value)).map((o) => o.value);
  return values.length > 0 ? values : undefined;
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
