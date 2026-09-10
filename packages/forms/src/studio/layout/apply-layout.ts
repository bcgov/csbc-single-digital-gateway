import type { UISchemaElement } from '@jsonforms/core';
import type { LayoutNode } from '../../renderers/gridstack/grid-editor';
import { resizingFor } from '../../renderers/studio/studio-item-resize';
import type { ElementIds } from './element-ids';

// Pure uischema updates for finished grid gestures (doc 183 rules 6, 11-14). Nothing is mutated:
// every replaced element is a new object that carries its id, and untouched subtrees keep identity.

type Element = UISchemaElement & { elements?: UISchemaElement[] };

/** A cross-grid move, as reported by the Grid editor port. */
export interface LayoutMove {
  elementId: string;
  fromGridId: string;
  toGridId: string;
  fromNodes: readonly LayoutNode[];
  toNodes: readonly LayoutNode[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const gridItemOf = (element: UISchemaElement): Record<string, unknown> => {
  const gridItem = element.options?.['gridItem'];
  return isRecord(gridItem) ? gridItem : {};
};

/** Rule 11: x/y/w always; h only for a content-floor item sized by hand; other keys preserved. */
function placedGridItem(element: UISchemaElement, node: LayoutNode): Record<string, unknown> {
  const { h, ...rest } = gridItemOf(element);
  const placed = { ...rest, x: node.x, y: node.y, w: node.w };
  if (resizingFor(element.type).sizing === 'fit')
    return h === undefined ? placed : { ...placed, h };
  const byHand = node.h !== undefined && node.minH !== undefined && node.h > node.minH;
  return byHand ? { ...placed, h: node.h } : placed;
}

function placeElement(
  element: UISchemaElement,
  node: LayoutNode,
  ids: ElementIds,
): UISchemaElement {
  const current = gridItemOf(element);
  const next = placedGridItem(element, node);
  const keys = new Set([...Object.keys(current), ...Object.keys(next)]);
  if ([...keys].every((key) => current[key] === next[key])) return element;
  const placed = { ...element, options: { ...element.options, gridItem: next } };
  ids.carry(element, placed);
  return placed;
}

const position = (element: UISchemaElement, key: 'x' | 'y') => {
  const value = gridItemOf(element)[key];
  return typeof value === 'number' ? value : Number.MAX_SAFE_INTEGER;
};

/** A Grid with `elements`, carrying its id, or the same Grid when the elements are identical. */
function withElements(grid: Element, elements: UISchemaElement[], ids: ElementIds): Element {
  const current = grid.elements ?? [];
  if (current.length === elements.length && current.every((el, i) => el === elements[i]))
    return grid;
  const next = { ...grid, elements };
  ids.carry(grid, next);
  return next;
}

/** Rules 11 + 13: place every element that has a node, then sort by y, then x. */
function layoutGrid(grid: Element, nodes: readonly LayoutNode[], ids: ElementIds): Element {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const placed = (grid.elements ?? []).map((element) => {
    const node = byId.get(ids.idOf(element));
    return node ? placeElement(element, node, ids) : element;
  });
  const sorted = placed.toSorted(
    (a, b) => position(a, 'y') - position(b, 'y') || position(a, 'x') - position(b, 'x'),
  );
  return withElements(grid, sorted, ids);
}

/** The element with `id` at or below `root`, depth-first. */
function findById(root: Element, id: string, ids: ElementIds): Element | undefined {
  if (ids.idOf(root) === id) return root;
  for (const child of root.elements ?? []) {
    const found = findById(child, id, ids);
    if (found) return found;
  }
  return undefined;
}

/** `update` applied to the element with `id`, rebuilding only its ancestors. */
function updateById(
  root: Element,
  id: string,
  update: (element: Element) => Element,
  ids: ElementIds,
): Element {
  if (ids.idOf(root) === id) return update(root);
  if (!root.elements) return root;
  return withElements(
    root,
    root.elements.map((child) => updateById(child, id, update, ids)),
    ids,
  );
}

/** Rule 11 + 13 for the Grid with `gridId`; unknown grid → the same uischema. */
export function applyLayout(
  uischema: UISchemaElement,
  gridId: string,
  nodes: readonly LayoutNode[],
  ids: ElementIds,
): UISchemaElement {
  return updateById(uischema, gridId, (grid) => layoutGrid(grid, nodes, ids), ids);
}

/**
 * Rules 12-14: move an element from one Grid's `elements` to another's, then lay out both. Refused —
 * the same uischema returned — when either grid is unknown, the element is not directly in the source
 * grid, or the target is the element itself or inside it.
 */
export function applyMove(
  uischema: UISchemaElement,
  move: LayoutMove,
  ids: ElementIds,
): UISchemaElement {
  const source = findById(uischema, move.fromGridId, ids);
  const target = findById(uischema, move.toGridId, ids);
  const moved = source?.elements?.find((element) => ids.idOf(element) === move.elementId);
  if (!source || !target || !moved || source === target) return uischema;
  if (findById(moved, move.toGridId, ids)) return uischema;

  const removed = updateById(
    uischema,
    move.fromGridId,
    (grid) =>
      layoutGrid(
        withElements(
          grid,
          (grid.elements ?? []).filter((el) => el !== moved),
          ids,
        ),
        move.fromNodes,
        ids,
      ),
    ids,
  );
  return updateById(
    removed,
    move.toGridId,
    (grid) =>
      layoutGrid(withElements(grid, [...(grid.elements ?? []), moved], ids), move.toNodes, ids),
    ids,
  );
}
