import type { StudioDocument } from '@repo/forms';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';

/**
 * Narrows a document version's stored `content` to a `@repo/forms` `StudioDocument` (doc 218 rule 13).
 *
 * Since feature 217 a version's whole payload is one `content` jsonb that the API validates as
 * `{schema, uischema}`. But the column is `Record<string, unknown>` to the client, and rows written
 * before this feature came from a free-form JSON editor that could store anything — so this is the
 * boundary where an unusable row becomes a notice rather than half a document spread into a
 * component's props.
 *
 * Deliberately shallow: it checks that both halves are present and are objects, and leaves the rest
 * to the studio, which already reports a bad root itself (`studio-canvas.tsx`, doc 200 rule 4). A
 * deeper check here would be a second, drifting copy of the element metaschema.
 */
export function studioDocumentOf(
  content: Record<string, unknown> | undefined,
): StudioDocument | null {
  if (content === undefined) {
    return null;
  }
  const { schema, uischema } = content;
  if (!isPlainObject(schema) || !isPlainObject(uischema)) {
    return null;
  }
  return { schema: schema as JsonSchema, uischema: uischema as unknown as UISchemaElement };
}

/** An array is an object to `typeof`, and neither half of a studio document may be one. */
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
