import { documentContentOf } from '@repo/documents/content';

/**
 * Split a document version's `content` JSONB into the `{ schema, variants }` a renderer needs (doc 275).
 *
 * Feature 217: this used to split the bound document-TYPE version's `definition`, with the filled
 * values living separately in `data`. A service is authored now, so its own version content is
 * what renders — there is no type version to consult and no values to merge in.
 */
export function contentSchemas(content: unknown): {
  schema: Record<string, unknown>;
  variants: Record<string, Record<string, unknown>>;
} {
  const parsed = documentContentOf(content);
  return { schema: parsed?.schema ?? {}, variants: parsed?.variants ?? { default: {} } };
}
