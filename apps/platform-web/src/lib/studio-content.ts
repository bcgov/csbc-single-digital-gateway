import type { CapabilityMap, StudioDocument } from '@repo/forms';
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
  const { schema, uischema, capabilities } = content;
  if (!isPlainObject(schema) || !isPlainObject(uischema)) {
    return null;
  }
  // Doc 220: a TEMPLATE version also stores a capability map. Carried through as shallowly as the
  // other two halves — the API validates its shape on the way in, and `capabilityFor` tolerates a
  // malformed one by falling back to the level below, so a second check here would only drift.
  return {
    schema: schema as JsonSchema,
    uischema: uischema as unknown as UISchemaElement,
    ...(isPlainObject(capabilities) ? { capabilities: capabilities as CapabilityMap } : {}),
  };
}

/** An array is an object to `typeof`, and neither half of a studio document may be one. */
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * A deterministic serialisation: every object's keys in sorted order, all the way down.
 *
 * `JSON.stringify` preserves INSERTION order, which makes it the wrong tool for asking "is this the
 * same document?". The server's zod schemas rebuild an object with their declared keys first and the
 * `catchall` remainder after — `uiSchemaSchema` is `{type, elements}` + catchall, so a root the
 * studio holds as `type,label,elements,id` comes back as `type,elements,label,id`. Identical content,
 * different string.
 */
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value !== 'object' || value === null) return value;
  const entries = Object.entries(value as Record<string, unknown>).toSorted(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  return Object.fromEntries(entries.map(([key, entry]) => [key, stable(entry)]));
}

/**
 * Whether the document the studio is holding is the one the server already has — the question a
 * "dirty" flag actually asks.
 *
 * TWO normalisations, each for a bug that reached the browser:
 *
 * 1. KEY ORDER is ignored. The server's zod parse reorders keys (see `stable`), so a plain
 *    `JSON.stringify` comparison made a page dirty FOREVER after a successful save — Save draft
 *    stayed enabled and Publish stayed disabled, with no edit outstanding.
 * 2. An EMPTY capability map and NO map mean the same thing (doc 220/221). A template page seeds
 *    `capabilities ?? {}` so a template with no rule yet can grow one, and the studio reports that
 *    `{}` back in its baseline emit; comparing it against stored content with no such key made the
 *    page dirty from the FIRST PAINT.
 *
 * Both were found by hand in the browser, and neither was visible to the app test suite, whose
 * fetch mocks hand back the same object shapes the studio produces rather than the ones the server
 * really returns.
 */
export function sameStudioDocument(a: StudioDocument | null, b: StudioDocument | null): boolean {
  if (a === null || b === null) return a === b;
  const comparable = (document: StudioDocument) => {
    const { capabilities, ...halves } = document;
    const governed = capabilities !== undefined && Object.keys(capabilities).length > 0;
    return stable(governed ? { ...halves, capabilities } : halves);
  };
  return JSON.stringify(comparable(a)) === JSON.stringify(comparable(b));
}
