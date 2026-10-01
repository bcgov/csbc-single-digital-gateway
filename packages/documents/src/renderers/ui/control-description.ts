/**
 * A control's description (doc 237 rule 7): the Control's `options.description` when a non-blank string, else the
 * schema property's `description` when a non-blank string, else `undefined`.
 */
export function controlDescription(uischema: unknown, schema: unknown): string | undefined {
  const options = recordOf(recordOf(uischema)?.['options']);
  return nonBlank(options?.['description']) ?? nonBlank(recordOf(schema)?.['description']);
}

function nonBlank(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
