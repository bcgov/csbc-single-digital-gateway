import type { UISchemaElement } from '@jsonforms/core';
import type { ElementIds } from './element-ids';
import type { TreeElement } from './element-tree';

// The pure primitives every element edit is built from. Extracted (doc 210 rule 24) because `flow-edits.ts`,
// `condition-edit-parts.ts` and the node factory each held their own copy, and `flow-edits.ts` had reached the
// 300-line gate with no room for the join and the Else stage.

/** `element` with `options` merged with `changes`, carrying its id. */
export function withOptions(
  element: TreeElement,
  changes: Record<string, unknown>,
  ids: ElementIds,
): TreeElement {
  const next = { ...element, options: { ...element.options, ...changes } };
  ids.carry(element, next);
  return next;
}

/**
 * A new id from `newId`, regenerated while `taken` has it. `taken` is a set of UNKNOWNS so a caller can hand it
 * the raw values it has — edge ids off the authored entries, `authoredStageId` results that may be undefined —
 * without first proving they are strings.
 */
export function freshId(taken: ReadonlySet<unknown>, newId: () => string): string {
  let id = newId();
  while (taken.has(id)) id = newId();
  return id;
}

/** The Flow's `options.edges` as authored, or `[]`. */
export const rawEdges = (flow: UISchemaElement): readonly unknown[] => {
  const edges = flow.options?.['edges'];
  return Array.isArray(edges) ? edges : [];
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** An authored edge entry's id, whatever shape the entry turns out to be. */
export const edgeIdOf = (entry: unknown): unknown => (isRecord(entry) ? entry['id'] : undefined);
