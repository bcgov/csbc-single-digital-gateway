/** A plain string schema (doc 239 rule 2): `type: 'string'` with no `enum`, `oneOf` or `const` — not a choice. */
export function isPlainString(schema: unknown): boolean {
  const s = recordOf(schema);
  return (
    s !== undefined &&
    s['type'] === 'string' &&
    !('enum' in s) &&
    !('oneOf' in s) &&
    !('const' in s)
  );
}

/** What a string control reads (doc 239 rules 9-10), sanitised: a wrong-typed value is an ABSENT key. */
export interface StringOptions {
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  /** The Textarea's visible rows: an integer 2-20, else 3. */
  rows: number;
}

export const DEFAULT_ROWS = 3;

export function stringOptions(uischema: unknown, schema: unknown): StringOptions {
  const s = recordOf(schema) ?? {};
  const options = recordOf(recordOf(uischema)?.['options']) ?? {};
  const { minLength, maxLength } = s;
  const { placeholder, rows } = options;
  return {
    ...(isLength(minLength) && { minLength }),
    ...(isLength(maxLength) && { maxLength }),
    ...(typeof placeholder === 'string' && { placeholder }),
    rows: isRows(rows) ? rows : DEFAULT_ROWS,
  };
}

function isLength(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isRows(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 2 && value <= 20;
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
