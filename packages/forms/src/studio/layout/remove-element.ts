import { authoredId } from '../../renderers/ui/authored-id';
import type { JsonSchema } from '@jsonforms/core';
import { flowNodeKind, FLOW_TYPE } from '../../renderers/xyflow/flow-elements';
import type { ElementIds } from './element-ids';
import { findParentById, updateById, withElements, type TreeElement } from './element-tree';
import { clearFlowStart } from './flow-edits';
import { joinAroundNode } from './node-join';
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
 * data property the removed Controls used that no remaining Control uses. A removed Flow NODE — a Stage or, since
 * doc 199 rule 27, a Condition — also takes every edge touching its authored id out of its Flow, without
 * reconnecting neighbours (doc 196 rule 9). A Condition's branch edges are covered without further work:
 * `removeStageEdges` drops edges by `source` and `target` id, whatever handle they leave by. Doc 203 rule 20: a
 * removed node also takes the Flow's `options.startId` with it when it was the start — no other Stage is promoted,
 * the resolver simply falls back to the first one. The root or an unknown id returns the same document.
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
  const stageId =
    flowNodeKind(removed) !== undefined && parent.type === FLOW_TYPE
      ? authoredId(removed)
      : undefined;

  const uischema = updateById(
    root,
    ids.idOf(parent),
    (grid) => {
      /**
       * Doc 210 rule 1: the edges are resolved on the Flow that STILL HOLDS the node. `joinAroundNode` counts
       * SANITISED edges, and `flowEdges` drops an edge whose end no longer exists — so running it after the
       * removal left the node with no edges to join and every chain broke silently.
       */
      const joined =
        stageId === undefined
          ? grid
          : clearFlowStart(joinAroundNode(grid, stageId, ids), stageId, ids);
      return withElements(
        joined,
        (joined.elements ?? []).filter((element) => element !== removed),
        ids,
      );
    },
    ids,
  );
  const stillUsed = propertyKeysUsed(uischema, document.schema);
  const unused = [...propertyKeysUsed(removed, document.schema)].filter(
    (key) => !stillUsed.has(key),
  );
  return { schema: withoutProperties(document.schema, unused), uischema };
}
