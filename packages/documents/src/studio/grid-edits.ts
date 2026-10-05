import {
  compareCells,
  firstFreeCell,
  freeCells,
  gridPlacement,
  gridSize,
  readingIndex,
  type GridCell,
  type GridDrop,
  type GridRect,
} from '../renderers/default/grid-placement';
import { makeRoom } from '../renderers/studio/grid-cell-engine';
import { placedElements, withGridItem } from '../renderers/studio/grid-order';
import {
  DEFAULT_VARIANT,
  withVariant,
  type DocumentContent,
  type Uischema,
} from './document-types';
import { findById, idOf } from './element-ids';
import { removeElement } from './element-remove';

// Doc 260 rules 18-27: the pure edits that land an element in a Grid's cell, and resize a Grid.

export function isGrid(node: Uischema | undefined): boolean {
  return node?.['type'] === 'Grid';
}

/** Where a new element lands in `grid` (rules 19-22): `cell` when it is free, else — with no cell asked — the first free. */
export interface GridLanding {
  cell: GridCell;
  /** Its index in `elements`: reading order (rule 4). */
  index: number;
}

/**
 * The landing for an element entering `grid` (`except`: an element already in it, whose cells count as free).
 * `undefined` when the asked cell is taken or the grid is full.
 */
export function gridLanding(
  grid: Uischema,
  cell: GridCell | undefined,
  except?: string,
): GridLanding | undefined {
  const placement = gridPlacement(grid);
  const free = freeCells(placement, except);
  const target =
    cell === undefined
      ? firstFreeCell(placement, undefined, except)
      : free.find((candidate) => compareCells(candidate, cell) === 0);
  return target === undefined
    ? undefined
    : { cell: target, index: readingIndex(placement, target, except) };
}

/**
 * `root` with the Grid `gridId`'s own children moved where gridstack put them while making room for a drop (rule 19) —
 * applied BEFORE the arrival lands, in the same edit. The same root with nothing displaced, or no such Grid.
 */
export function withDisplaced(
  root: Uischema,
  gridId: string,
  displaced: ReadonlyMap<string, GridRect> | undefined,
): Uischema {
  if (displaced === undefined || displaced.size === 0) return root;
  return replaceById(root, gridId, (grid) => {
    if (!isGrid(grid)) return grid;
    const elements = placedElements(grid, displaced);
    return elements === grid['elements'] ? grid : { ...grid, elements: [...elements] };
  });
}

/** `drop` with nothing displaced (rule 19 backstop): its landing must then already be free. */
export function withoutDisplaced(drop: GridDrop | undefined): GridDrop | undefined {
  return drop === undefined ? undefined : { x: drop.x, y: drop.y };
}

/**
 * The cell a palette click after the Grid child `childId` targets (rule 19): the first free cell after it in reading
 * order, else the first free; `undefined` when the grid is full.
 */
export function cellAfter(grid: Uischema, childId: string): GridCell | undefined {
  const placement = gridPlacement(grid);
  const child = placement.items.find((item) => item.key === childId);
  return firstFreeCell(placement, child);
}

/** What shrinking a Grid to `size` does (rule 25): the children it deletes, and the grid it leaves. */
export interface GridShrink {
  /** Ids of children whose top-left cell falls outside the new size. */
  removed: string[];
  grid: Uischema;
}

/** `grid` at `size`: children outside removed (by id), spans crossing the new edge trimmed (rules 25-27). */
export function shrinkGrid(grid: Uischema, size: { columns: number; rows: number }): GridShrink {
  const elements = Array.isArray(grid['elements']) ? (grid['elements'] as unknown[]) : [];
  const removed: string[] = [];
  const kept: unknown[] = [];
  for (const item of gridPlacement(grid).items) {
    const child = elements[item.index];
    if (item.x >= size.columns || item.y >= size.rows) {
      const id = isRecord(child) ? idOf(child) : undefined;
      if (id !== undefined) removed.push(id);
      continue;
    }
    const w = Math.min(item.w, size.columns - item.x);
    const h = Math.min(item.h, size.rows - item.y);
    kept.push(
      isRecord(child) && (w !== item.w || h !== item.h)
        ? withGridItem(child, { ...item, w, h })
        : child,
    );
  }
  const options = { ...recordOf(grid['options']), columns: size.columns, rows: size.rows };
  return { removed, grid: { ...grid, options, elements: kept } };
}

/** The children a resize of the Grid `gridId` to `size` would delete (rule 25); empty when it grows. */
export function gridResizeLosses(
  content: DocumentContent,
  gridId: string,
  size: Partial<{ columns: number; rows: number }>,
): string[] {
  const grid = findById(content.variants[DEFAULT_VARIANT], gridId);
  if (grid === undefined || !isGrid(grid)) return [];
  return shrinkGrid(grid, { ...gridSize(grid['options']), ...size }).removed;
}

/**
 * `content` with the Grid `gridId` resized (rules 25-27): its new size written, children outside it deleted with
 * `removeElement` (so their orphaned properties and Implementation Rules go too), spans trimmed. Growing moves nothing.
 */
export function resizeGrid(
  content: DocumentContent,
  gridId: string,
  size: Partial<{ columns: number; rows: number }>,
): DocumentContent {
  const root = content.variants[DEFAULT_VARIANT];
  const grid = findById(root, gridId);
  if (grid === undefined || !isGrid(grid)) return content;
  const shrink = shrinkGrid(grid, { ...gridSize(grid['options']), ...size });
  // Removed through the content-wide delete first, so their bindings and rules are cleaned up.
  const cleaned = shrink.removed.reduce(removeElement, content);
  const resized = replaceById(cleaned.variants[DEFAULT_VARIANT], gridId, (current) => ({
    ...current,
    options: shrink.grid['options'],
    elements: (shrink.grid['elements'] as unknown[]).filter(
      (child) => !isRecord(child) || !shrink.removed.includes(idOf(child) ?? ''),
    ),
  }));
  return withVariant(cleaned, resized);
}

/** `node` with the element `id` (at any depth, or `node` itself) replaced by `replace(it)`. */
export function replaceById(
  node: Uischema,
  id: string,
  replace: (node: Uischema) => Uischema,
): Uischema {
  if (idOf(node) === id) return replace(node);
  const elements = node['elements'];
  if (!Array.isArray(elements)) return node;
  const next = elements.map((child: unknown) =>
    isRecord(child) ? replaceById(child, id, replace) : child,
  );
  return next.some((child, i) => child !== elements[i]) ? { ...node, elements: next } : node;
}

function isRecord(value: unknown): value is Uischema {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

/**
 * `grid` with the child `childId` widened or narrowed to `w` from its column (doc 261 rule 20b) — the neighbours it now
 * covers moved out of the way by the drag-resize's own `makeRoom` (rule 10), in one edit. The SAME grid when refused.
 */
export function resizeGridChild(grid: Uischema, childId: string, w: number): Uischema {
  const rects = widthRects(grid, childId, w);
  if (rects === undefined) return grid;
  const elements = placedElements(grid, rects);
  return elements === grid['elements'] ? grid : { ...grid, elements: [...elements] };
}

/** The widest a Grid child can be from its column with its neighbours moved out of the way (doc 261 rule 20b). */
export function maxGridWidth(grid: Uischema, childId: string): number {
  const placement = gridPlacement(grid);
  const item = placement.items.find((candidate) => candidate.key === childId);
  if (item === undefined) return 1;
  for (let w = placement.columns - item.x; w > item.w; w--)
    if (widthRects(grid, childId, w) !== undefined) return w;
  return item.w;
}

/** Every rectangle that changes when `childId` becomes `w` wide, or `undefined` when there is no room. */
function widthRects(grid: Uischema, childId: string, w: number): Map<string, GridRect> | undefined {
  const placement = gridPlacement(grid);
  const nodes = placement.items.map(({ key, x, y, w: width, h }) => ({
    id: key,
    x,
    y,
    w: width,
    h,
  }));
  const node = nodes.find((candidate) => candidate.id === childId);
  if (node === undefined || w < 1 || node.x + w > placement.columns) return undefined;
  const target = { x: node.x, y: node.y, w, h: node.h };
  const collided = nodes.filter((other) => other !== node && rectsOverlap(target, other));
  const room = makeRoom(nodes, node, target, collided, placement.columns, placement.effectiveRows);
  if (room === undefined) return undefined;
  const rects = new Map<string, GridRect>([[childId, target]]);
  for (const [other, cell] of room)
    rects.set(String(other.id), { x: cell.x, y: cell.y, w: other.w ?? 1, h: other.h ?? 1 });
  return rects;
}

function rectsOverlap(a: GridRect, b: GridRect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
