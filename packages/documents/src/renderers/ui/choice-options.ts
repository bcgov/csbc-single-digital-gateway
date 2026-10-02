/** One choice (doc 244 rule 4): the `const` written to the data, the `title` shown for it, any help text under it. */
export interface ChoiceOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * A single string choice's options (doc 244 rules 3-4) — `type: 'string'` with a non-empty `oneOf` whose every entry
 * is an object with a string `const` — else `undefined`. The same rules as `@repo/forms`' `optionsFrom`, string only:
 * a label falls back to its const, a repeated const keeps its first entry, and a description is carried only when a
 * non-empty string.
 */
export function choiceOptions(schema: unknown): ChoiceOption[] | undefined {
  const s = recordOf(schema);
  const entries = s?.['oneOf'];
  if (s?.['type'] !== 'string' || !Array.isArray(entries) || entries.length === 0) return undefined;
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

/** Whether `schema` is a single string choice (doc 244 rule 3). */
export function isSingleChoice(schema: unknown): boolean {
  return choiceOptions(schema) !== undefined;
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
