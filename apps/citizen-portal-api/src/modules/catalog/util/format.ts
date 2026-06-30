/**
 * Read a display string out of a service version's `data` JSONB (where the meaningful title and
 * description live), falling back to the document column when absent/blank.
 */
export function serviceDataString(
  data: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const value = data[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

/** Split a document-type version `definition` JSONB into the `{ schema, uischema }` a renderer needs. */
export function definitionSchemas(definition: unknown): {
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
} {
  const def = (definition ?? {}) as { schema?: unknown; uischema?: unknown };
  return {
    schema: (def.schema as Record<string, unknown> | undefined) ?? {},
    uischema: (def.uischema as Record<string, unknown> | undefined) ?? {},
  };
}
