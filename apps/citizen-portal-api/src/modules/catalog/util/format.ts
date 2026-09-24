/**
 * Split a document version's `content` JSONB into the `{ schema, uischema }` a renderer needs.
 *
 * Feature 217: this used to split the bound document-TYPE version's `definition`, with the filled
 * values living separately in `data`. A service is authored now, so its own version content is
 * what renders — there is no type version to consult and no values to merge in.
 */
export function contentSchemas(content: unknown): {
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
} {
  const value = (content ?? {}) as { schema?: unknown; uischema?: unknown };
  return {
    schema: (value.schema as Record<string, unknown> | undefined) ?? {},
    uischema: (value.uischema as Record<string, unknown> | undefined) ?? {},
  };
}
