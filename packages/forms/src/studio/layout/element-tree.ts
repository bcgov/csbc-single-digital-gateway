import type { UISchemaElement } from '@jsonforms/core';
import type { ElementIds } from './element-ids';

// Immutable uischema tree helpers shared by the studio's document updates (docs 183, 185). Nothing is
// mutated: every replaced element is a new object that carries its studio id, and untouched subtrees
// keep identity.

export type TreeElement = UISchemaElement & { elements?: UISchemaElement[] };

/** A Grid with `elements`, carrying its id, or the same Grid when the elements are identical. */
export function withElements(
  grid: TreeElement,
  elements: UISchemaElement[],
  ids: ElementIds,
): TreeElement {
  const current = grid.elements ?? [];
  if (current.length === elements.length && current.every((el, i) => el === elements[i]))
    return grid;
  const next = { ...grid, elements };
  ids.carry(grid, next);
  return next;
}

/** The element with `id` at or below `root`, depth-first. */
export function findById(root: TreeElement, id: string, ids: ElementIds): TreeElement | undefined {
  if (ids.idOf(root) === id) return root;
  for (const child of root.elements ?? []) {
    const found = findById(child, id, ids);
    if (found) return found;
  }
  return undefined;
}

/** The element whose `elements` directly hold the element with `id`; `undefined` for the root. */
export function findParentById(
  root: TreeElement,
  id: string,
  ids: ElementIds,
): TreeElement | undefined {
  for (const child of root.elements ?? []) {
    if (ids.idOf(child) === id) return root;
    const found = findParentById(child, id, ids);
    if (found) return found;
  }
  return undefined;
}

/** `update` applied to the element with `id`, rebuilding only its ancestors. */
export function updateById(
  root: TreeElement,
  id: string,
  update: (element: TreeElement) => TreeElement,
  ids: ElementIds,
): TreeElement {
  if (ids.idOf(root) === id) return update(root);
  if (!root.elements) return root;
  return withElements(
    root,
    root.elements.map((child) => updateById(child, id, update, ids)),
    ids,
  );
}
