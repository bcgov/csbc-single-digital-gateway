import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import type { ElementIds } from './element-ids';
import { findParentById, updateById, withElements, type TreeElement } from './element-tree';
import { propertyKeyOf, propertyScope, type StudioDocument } from './schema-properties';

/** A grid item's current engine placement, read when Copy is clicked (doc 185 rule 15). */
export interface ItemPlacement {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface CopyResult extends StudioDocument {
  /** The inserted copy, or `undefined` when the copy was refused (rule 20). */
  readonly copy: UISchemaElement | undefined;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Rule 15: the original's `gridItem` with the engine's x and w, one item-height lower; an authored h stays. */
function placedBelow(element: UISchemaElement, placement: ItemPlacement): UISchemaElement {
  const gridItem = element.options?.['gridItem'];
  return {
    ...element,
    options: {
      ...element.options,
      gridItem: {
        ...(isRecord(gridItem) ? gridItem : {}),
        x: placement.x,
        y: placement.y + placement.h,
        w: placement.w,
      },
    },
  };
}

/**
 * Rule 17: points every Control in `clone` (a fresh deep copy, so mutated in place) at a new key. Controls
 * sharing a key share its new key; `keyMap` collects original → new.
 */
function rekeyControls(
  clone: TreeElement,
  schema: JsonSchema,
  keyMap: Map<string, string>,
  nextKey: () => string,
): void {
  const key = propertyKeyOf(clone, schema);
  if (key !== undefined) {
    const copyKey = keyMap.get(key) ?? nextKey();
    keyMap.set(key, copyKey);
    (clone as { scope: string }).scope = propertyScope(copyKey);
  }
  for (const child of clone.elements ?? []) rekeyControls(child, schema, keyMap, nextKey);
}

const titleOf = (property: JsonSchema, key: string) =>
  typeof property.title === 'string' ? property.title : key;

/** Rule 17: each copied property cloned right after its original, titled "(copy)"; `required` follows. */
function withCopiedProperties(schema: JsonSchema, keyMap: ReadonlyMap<string, string>): JsonSchema {
  if (keyMap.size === 0) return schema;
  // Object.fromEntries defines own properties, so no key can reach the prototype.
  const properties = Object.fromEntries(
    Object.entries(schema.properties ?? {}).flatMap(([key, property]) => {
      const copyKey = keyMap.get(key);
      if (copyKey === undefined) return [[key, property]];
      const copied = { ...structuredClone(property), title: `${titleOf(property, key)} (copy)` };
      return [
        [key, property],
        [copyKey, copied],
      ];
    }),
  );
  const required = Array.isArray(schema.required)
    ? {
        required: schema.required.flatMap((key) => [
          key,
          ...(keyMap.has(key) ? [keyMap.get(key) as string] : []),
        ]),
      }
    : {};
  return { ...schema, properties, ...required } as JsonSchema;
}

/**
 * Rules 15-20: a deep copy of the element with `elementId`, inserted directly after it and placed below
 * it, with new data properties for its Controls. The root or an unknown id returns the same document.
 */
export function copyElement(
  document: StudioDocument,
  elementId: string,
  placement: ItemPlacement,
  ids: ElementIds,
  newKey: () => string,
): CopyResult {
  const root = document.uischema as TreeElement;
  const parent = findParentById(root, elementId, ids);
  const elements = parent?.elements ?? [];
  const index = elements.findIndex((element) => ids.idOf(element) === elementId);
  const original = elements[index];
  if (!parent || !original) return { ...document, copy: undefined };

  const taken = new Set(Object.keys(document.schema.properties ?? {}));
  const nextKey = () => {
    let key = newKey();
    while (taken.has(key)) key = newKey();
    taken.add(key);
    return key;
  };
  const keyMap = new Map<string, string>();
  const clone = structuredClone(original) as TreeElement;
  rekeyControls(clone, document.schema, keyMap, nextKey);
  const copy = placedBelow(clone, placement);

  const uischema = updateById(
    root,
    ids.idOf(parent),
    (grid) => withElements(grid, elements.toSpliced(index + 1, 0, copy), ids),
    ids,
  );
  return { schema: withCopiedProperties(document.schema, keyMap), uischema, copy };
}
