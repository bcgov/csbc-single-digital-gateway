import type { JsonSchema } from '@jsonforms/core';
import type { ElementIds } from './element-ids';
import { findParentById, updateById, withElements, type TreeElement } from './element-tree';
import { propertyKeysUsed, type StudioDocument } from './schema-properties';

/** Rule 25: the schema without `keys` in `properties` or `required`; an emptied `required` is dropped. */
function withoutProperties(schema: JsonSchema, keys: readonly string[]): JsonSchema {
  if (keys.length === 0) return schema;
  const drop = new Set(keys);
  const properties = Object.fromEntries(
    Object.entries(schema.properties ?? {}).filter(([key]) => !drop.has(key)),
  );
  if (!Array.isArray(schema.required)) return { ...schema, properties } as JsonSchema;

  const { required, ...rest } = schema;
  const kept = required.filter((key) => !drop.has(key));
  return (
    kept.length > 0 ? { ...rest, properties, required: kept } : { ...rest, properties }
  ) as JsonSchema;
}

/**
 * Rules 24-26: the document without the element with `elementId` (and its subtree), and without every
 * data property the removed Controls used that no remaining Control uses. The root or an unknown id
 * returns the same document.
 */
export function removeElement(
  document: StudioDocument,
  elementId: string,
  ids: ElementIds,
): StudioDocument {
  const root = document.uischema as TreeElement;
  const parent = findParentById(root, elementId, ids);
  const removed = parent?.elements?.find((element) => ids.idOf(element) === elementId);
  if (!parent || !removed) return document;

  const uischema = updateById(
    root,
    ids.idOf(parent),
    (grid) =>
      withElements(
        grid,
        (grid.elements ?? []).filter((element) => element !== removed),
        ids,
      ),
    ids,
  );
  const stillUsed = propertyKeysUsed(uischema, document.schema);
  const unused = [...propertyKeysUsed(removed, document.schema)].filter(
    (key) => !stillUsed.has(key),
  );
  return { schema: withoutProperties(document.schema, unused), uischema };
}
