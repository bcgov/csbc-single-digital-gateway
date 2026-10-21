import type { UISchemaElement } from '@jsonforms/core';
import { mayMove } from '../../capabilities/capability-gates';
import type { CapabilityMap } from '../../capabilities/capability-types';
import type { LayoutNode } from '../../renderers/gridstack/grid-editor';
import {
  allowedInLayout,
  horizontalColumns,
  horizontalWidth,
  layoutKindOf,
} from '../../renderers/gridstack/grid-layouts';
import { resizingFor } from '../../renderers/studio/studio-item-resize';
import type { ElementIds } from './element-ids';
import { elementPath } from './element-path';
import { findById, updateById, withElements, type TreeElement } from './element-tree';

// Pure uischema updates for finished grid gestures (doc 183 rules 6, 11-14, 12b). Nothing is mutated:
// every replaced element is a new object that carries its id, and untouched subtrees keep identity.

type Element = TreeElement;
type NodesById = ReadonlyMap<string, LayoutNode>;

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
  if (resizingFor(element.type, 'grid').sizing === 'fit')
    return h === undefined ? placed : { ...placed, h };
  const byHand = node.h !== undefined && node.minH !== undefined && node.h > node.minH;
  return byHand ? { ...placed, h: node.h } : placed;
}

/** `element` with its `gridItem` replaced by `next`, carrying its id — or `element` when no key changed. */
function withGridItem(
  element: UISchemaElement,
  next: Record<string, unknown>,
  ids: ElementIds,
): UISchemaElement {
  const current = gridItemOf(element);
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

/** A stable sort key from each element's node; elements without a node go last, in their order. */
const nodeKey = (byId: NodesById, ids: ElementIds, key: 'x' | 'y') => (element: UISchemaElement) =>
  byId.get(ids.idOf(element))?.[key] ?? Number.MAX_SAFE_INTEGER;

/** Rules 11 + 13 (Grid): place every element that has a node, then sort by y, then x. */
function layoutFree(grid: Element, byId: NodesById, ids: ElementIds): Element {
  const placed = (grid.elements ?? []).map((element) => {
    const node = byId.get(ids.idOf(element));
    return node ? withGridItem(element, placedGridItem(element, node), ids) : element;
  });
  const sorted = placed.toSorted(
    (a, b) => position(a, 'y') - position(b, 'y') || position(a, 'x') - position(b, 'x'),
  );
  return withElements(grid, sorted, ids);
}

/** Rule 12b (VerticalLayout): order by node y; no gridItem is written. */
function layoutStack(grid: Element, byId: NodesById, ids: ElementIds): Element {
  const y = nodeKey(byId, ids, 'y');
  return withElements(
    grid,
    (grid.elements ?? []).toSorted((a, b) => y(a) - y(b)),
    ids,
  );
}

/** Rule 12b (HorizontalLayout): order by node x; only `w` is written, and `arrived` gets width 1. */
function layoutRow(
  grid: Element,
  byId: NodesById,
  ids: ElementIds,
  arrived: UISchemaElement | undefined,
): Element {
  const elements = grid.elements ?? [];
  const columns = horizontalColumns(grid.options, elements.length);
  const sized = elements.map((element) => {
    const w = element === arrived ? 1 : byId.get(ids.idOf(element))?.w;
    if (w === undefined || w === horizontalWidth(element, columns)) return element;
    return withGridItem(element, { ...gridItemOf(element), w }, ids);
  });
  const x = nodeKey(byId, ids, 'x');
  return withElements(
    grid,
    sized.toSorted((a, b) => x(a) - x(b)),
    ids,
  );
}

/**
 * Lays out `grid` by its layout type (rules 11-13, 12b); `arrived` is an element just moved — or, from the palette,
 * inserted (doc 189 rule 21) — into it.
 */
export function layoutGrid(
  grid: Element,
  nodes: readonly LayoutNode[],
  ids: ElementIds,
  arrived?: UISchemaElement,
): Element {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const kind = layoutKindOf(grid.type);
  if (kind === 'vertical') return layoutStack(grid, byId, ids);
  if (kind === 'horizontal') return layoutRow(grid, byId, ids, arrived);
  return layoutFree(grid, byId, ids);
}

/** Rules 11-13 + 12b for the grid element with `gridId`; unknown grid → the same uischema. */
export function applyLayout(
  uischema: UISchemaElement,
  gridId: string,
  nodes: readonly LayoutNode[],
  ids: ElementIds,
): UISchemaElement {
  return updateById(uischema, gridId, (grid) => layoutGrid(grid, nodes, ids), ids);
}

/**
 * Rules 12-14 + 12b: move an element from one grid element's `elements` to another's, then lay out
 * both. Refused — the same uischema returned — when either grid is unknown, the element is not directly
 * in the source grid, the target is the element itself or inside it, or the target's kind cannot hold the
 * element (doc 194 rule 9).
 */
export function applyMove(
  uischema: UISchemaElement,
  move: LayoutMove,
  ids: ElementIds,
  capabilities?: CapabilityMap | undefined,
): UISchemaElement {
  const source = findById(uischema, move.fromGridId, ids);
  const target = findById(uischema, move.toGridId, ids);
  const moved = source?.elements?.find((element) => ids.idOf(element) === move.elementId);
  if (!source || !target || !moved || source === target) return uischema;
  if (findById(moved, move.toGridId, ids)) return uischema;
  // Doc 194 rule 9: an element the target's kind cannot hold (a Separator into a row) stays where it is.
  // Doc 216 rule 11: the target's ancestor types — the target layout included — decide it too, so a Tabs
  // can never be dragged into a Tab.
  const targetKind = layoutKindOf(target.type);
  const ancestors = elementPath(uischema as TreeElement, move.toGridId, ids).map((el) => el.type);
  if (targetKind && !allowedInLayout(moved.type, targetKind, ancestors)) return uischema;
  // Doc 221: placement says the target CAN hold it; a capability says the owner MAY move it there.
  // Three permissions have to hold — see `mayMove`. Ungoverned passes.
  if (!mayMove(capabilities, moved, source, target)) return uischema;

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
      layoutGrid(
        withElements(grid, [...(grid.elements ?? []), moved], ids),
        move.toNodes,
        ids,
        moved,
      ),
    ids,
  );
}
