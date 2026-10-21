import { elementKey } from './vertical-layout';

// Doc 260 rules 1-4: the ONLY reader of a Grid's `columns` / `rows` and its children's `options.gridItem`. Both renderers
// and every studio edit go through it, so what is drawn, dropped on and written can never disagree.

export const DEFAULT_GRID_COLUMNS = 2;
export const DEFAULT_GRID_ROWS = 2;
export const MAX_GRID_COLUMNS = 12;
export const MAX_GRID_ROWS = 24;

/** A cell: 0-based column and row. */
export interface GridCell {
  x: number;
  y: number;
}

/**
 * Where a drop lands in a Grid (doc 260 rule 19): the cell, and the rectangles gridstack moved the Grid's own items to
 * while making room for it (rule 10) — written with the arrival, in one edit.
 */
export interface GridDrop extends GridCell {
  displaced?: ReadonlyMap<string, GridRect>;
}

/** A rectangle of cells: its top-left cell and its spans. */
export interface GridRect extends GridCell {
  w: number;
  h: number;
}

/** Where content sits in its cell, vertically (doc 260 rule 29). */
export type GridAlign = 'start' | 'center' | 'end';
/** Where content sits in its cell, horizontally — or filling it. */
export type GridJustify = GridAlign | 'stretch';

export const DEFAULT_GRID_ALIGN: GridAlign = 'start';
export const DEFAULT_GRID_JUSTIFY: GridJustify = 'stretch';
export const GRID_ALIGNS: readonly GridAlign[] = Object.freeze(['start', 'center', 'end']);
export const GRID_JUSTIFIES: readonly GridJustify[] = Object.freeze([
  'start',
  'center',
  'end',
  'stretch',
]);

/** A child as placed: its key (`elementKey`), its index in `elements`, and its RESOLVED alignment (rule 29). */
export interface PlacedItem extends GridRect {
  key: string;
  index: number;
  align: GridAlign;
  justify: GridJustify;
}

export interface GridPlacement {
  columns: number;
  /** The Grid's default alignment (rule 29). */
  alignItems: GridAlign;
  justifyItems: GridJustify;
  /** The authored row count, sanitised. */
  rows: number;
  /** `rows`, grown only when hand-authored children overflow it (rule 3). */
  effectiveRows: number;
  /** One per child, in `elements` order. */
  items: PlacedItem[];
}

/** A Grid's sanitised size (rule 1): a whole number within its limits, else the default. */
export function gridSize(options: unknown): { columns: number; rows: number } {
  const record = recordOf(options);
  return {
    columns: within(record?.['columns'], MAX_GRID_COLUMNS, DEFAULT_GRID_COLUMNS),
    rows: within(record?.['rows'], MAX_GRID_ROWS, DEFAULT_GRID_ROWS),
  };
}

/** A Grid's sanitised default alignment (rule 29): anything else is the default. */
export function gridAlignment(options: unknown): {
  alignItems: GridAlign;
  justifyItems: GridJustify;
} {
  const record = recordOf(options);
  return {
    alignItems: oneOf(record?.['alignItems'], GRID_ALIGNS) ?? DEFAULT_GRID_ALIGN,
    justifyItems: oneOf(record?.['justifyItems'], GRID_JUSTIFIES) ?? DEFAULT_GRID_JUSTIFY,
  };
}

/** A child's own alignment override (rule 29), each wrong value absent. */
export function itemAlignmentOf(element: unknown): {
  alignSelf?: GridAlign;
  justifySelf?: GridJustify;
} {
  const item = recordOf(recordOf(recordOf(element)?.['options'])?.['gridItem']);
  const alignSelf = oneOf(item?.['alignSelf'], GRID_ALIGNS);
  const justifySelf = oneOf(item?.['justifySelf'], GRID_JUSTIFIES);
  return {
    ...(alignSelf !== undefined && { alignSelf }),
    ...(justifySelf !== undefined && { justifySelf }),
  };
}

/** A child's authored `options.gridItem`, each wrong-typed field absent (rule 1). */
export function gridItemOf(element: unknown): Partial<GridRect> {
  const item = recordOf(recordOf(recordOf(element)?.['options'])?.['gridItem']);
  const result: Partial<GridRect> = {};
  for (const key of ['x', 'y'] as const) {
    const value = item?.[key];
    if (isWhole(value, 0)) result[key] = value;
  }
  for (const key of ['w', 'h'] as const) {
    const value = item?.[key];
    if (isWhole(value, 1)) result[key] = value;
  }
  return result;
}

/**
 * Where every child of `grid` sits (rules 2-3): an authored rectangle that is inside the grid (spans clamped to its
 * edge) and free of earlier children is kept; anything else takes the first free cell, 1×1, growing the rows when none
 * is left — so no child is ever lost.
 */
export function gridPlacement(grid: unknown): GridPlacement {
  const record = recordOf(grid);
  const { columns, rows } = gridSize(record?.['options']);
  const { alignItems, justifyItems } = gridAlignment(record?.['options']);
  const elements = Array.isArray(record?.['elements']) ? record['elements'] : [];
  const taken = new Set<string>();
  let effectiveRows = rows;
  const items = elements.map((child: unknown, index): PlacedItem => {
    const key = elementKey(child, index);
    const authored = authoredRect(gridItemOf(child), columns, rows);
    const rect =
      authored !== undefined && cellsOf(authored).every((cell) => !taken.has(cellKey(cell)))
        ? authored
        : { ...nextFree(taken, columns), w: 1, h: 1 };
    for (const cell of cellsOf(rect)) taken.add(cellKey(cell));
    effectiveRows = Math.max(effectiveRows, rect.y + rect.h);
    const own = itemAlignmentOf(child);
    return {
      key,
      index,
      x: rect.x,
      y: rect.y,
      w: rect.w,
      h: rect.h,
      align: own.alignSelf ?? alignItems,
      justify: own.justifySelf ?? justifyItems,
    };
  });
  return { columns, rows, alignItems, justifyItems, effectiveRows, items };
}

/** Every cell of the grid no item covers, in reading order; `except` is an item treated as gone (one being moved). */
export function freeCells(placement: GridPlacement, except?: string): GridCell[] {
  const taken = new Set(
    placement.items
      .filter((item) => item.key !== except)
      .flatMap((item) => cellsOf(item).map(cellKey)),
  );
  const free: GridCell[] = [];
  for (let y = 0; y < placement.effectiveRows; y++)
    for (let x = 0; x < placement.columns; x++)
      if (!taken.has(cellKey({ x, y }))) free.push({ x, y });
  return free;
}

/** The first free cell after `after` in reading order, else the first free cell at all; `undefined` when full. */
export function firstFreeCell(
  placement: GridPlacement,
  after?: GridCell,
  except?: string,
): GridCell | undefined {
  const free = freeCells(placement, except);
  return (
    (after === undefined ? undefined : free.find((cell) => compareCells(cell, after) > 0)) ??
    free[0]
  );
}

/** Where a child at `cell` goes in `elements`: how many other items come before it in reading order (rule 4). */
export function readingIndex(placement: GridPlacement, cell: GridCell, except?: string): number {
  return placement.items.filter((item) => item.key !== except && compareCells(item, cell) < 0)
    .length;
}

/** Reading order (rule 4): by row, then column. */
export function compareCells(a: GridCell, b: GridCell): number {
  return a.y - b.y || a.x - b.x;
}

/** The `options.gridItem` a rectangle is written as: spans only when wider or taller than one cell. */
export function gridItemOption(rect: GridRect): Record<string, number> {
  return {
    x: rect.x,
    y: rect.y,
    ...(rect.w > 1 && { w: rect.w }),
    ...(rect.h > 1 && { h: rect.h }),
  };
}

/** Every cell a rectangle covers. */
export function cellsOf(rect: GridRect): GridCell[] {
  const cells: GridCell[] = [];
  for (let y = rect.y; y < rect.y + rect.h; y++)
    for (let x = rect.x; x < rect.x + rect.w; x++) cells.push({ x, y });
  return cells;
}

/** An authored rectangle inside the grid, its spans clamped to the edge; `undefined` when it has no cell in it. */
function authoredRect(
  item: Partial<GridRect>,
  columns: number,
  rows: number,
): GridRect | undefined {
  const { x, y } = item;
  if (x === undefined || y === undefined || x >= columns || y >= rows) return undefined;
  return { x, y, w: Math.min(item.w ?? 1, columns - x), h: Math.min(item.h ?? 1, rows - y) };
}

/** The first cell not in `taken`, row by row — past the last row when every row is full (rule 3). */
function nextFree(taken: ReadonlySet<string>, columns: number): GridCell {
  for (let y = 0; ; y++)
    for (let x = 0; x < columns; x++) if (!taken.has(cellKey({ x, y }))) return { x, y };
}

const cellKey = ({ x, y }: GridCell) => `${x},${y}`;

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return allowed.find((candidate) => candidate === value);
}

function within(value: unknown, max: number, fallback: number): number {
  return isWhole(value, 1) && value <= max ? value : fallback;
}

function isWhole(value: unknown, min: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min;
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
