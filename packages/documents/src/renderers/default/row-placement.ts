import {
  DEFAULT_GRID_ALIGN,
  GRID_ALIGNS,
  gridItemOf,
  itemAlignmentOf,
  type GridAlign,
  type GridJustify,
} from './grid-placement';
import { elementKey } from './vertical-layout';

// Doc 261 rules 1-4, 10-11: the ONLY reader of a HorizontalLayout's options and its children's widths. A row is packed
// in `elements` order — positions are derived, never authored — so only widths and alignment are ever stored.

/** How a row places its packed children: Flex shares the spare columns out; the rest place the group. */
export type RowJustify = 'stretch' | 'start' | 'center' | 'end';

export const DEFAULT_ROW_COLUMNS = 12;
export const MAX_ROW_COLUMNS = 12;
export const DEFAULT_ROW_JUSTIFY: RowJustify = 'stretch';
export const ROW_JUSTIFIES: readonly RowJustify[] = Object.freeze([
  'stretch',
  'start',
  'center',
  'end',
]);

/** A child as placed: DISPLAY column and span, its STORED (fitted) width, and its resolved alignment. */
export interface RowItem {
  key: string;
  index: number;
  x: number;
  w: number;
  stored: number;
  align: GridAlign;
  justify: GridJustify;
}

export interface RowPlacement {
  /** The columns laid out — the authored count, or the child count when more children than that (rule 2). */
  columns: number;
  justify: RowJustify;
  alignItems: GridAlign;
  items: RowItem[];
}

/** A row's sanitised settings (rule 1): anything else is the default. */
export function rowSettings(options: unknown): {
  columns: number;
  justify: RowJustify;
  alignItems: GridAlign;
} {
  const record = recordOf(options);
  const columns = record?.['columns'];
  return {
    columns:
      typeof columns === 'number' &&
      Number.isInteger(columns) &&
      columns >= 1 &&
      columns <= MAX_ROW_COLUMNS
        ? columns
        : DEFAULT_ROW_COLUMNS,
    justify: oneOf(record?.['justify'], ROW_JUSTIFIES) ?? DEFAULT_ROW_JUSTIFY,
    alignItems: oneOf(record?.['alignItems'], GRID_ALIGNS) ?? DEFAULT_GRID_ALIGN,
  };
}

/** A child's authored width in a row: its `gridItem.w`, default 1 (rule 2). */
export function storedWidthOf(child: unknown): number {
  return gridItemOf(child).w ?? 1;
}

/** How wide a new child of a row of `count` children starts (rule 10). */
export function arrivalWidth(count: number, columns: number): number {
  return Math.max(1, Math.floor(columns / (count + 1)));
}

/**
 * `widths` made to fit `columns` (rule 11): the widest children not in `fixed` lose a column at a time — the later on a
 * tie — never below 1. `undefined` when they still don't fit with every shrinkable child at 1.
 */
export function fitWidths(
  widths: readonly number[],
  columns: number,
  fixed: ReadonlySet<number> = new Set(),
): number[] | undefined {
  const next = widths.map((w) => Math.min(Math.max(1, w), columns));
  let total = next.reduce((sum, w) => sum + w, 0);
  while (total > columns) {
    let widest = -1;
    next.forEach((w, i) => {
      if (!fixed.has(i) && w > 1 && (widest === -1 || w >= (next[widest] ?? 0))) widest = i;
    });
    if (widest === -1) return undefined;
    next[widest] = (next[widest] ?? 1) - 1;
    total -= 1;
  }
  return next;
}

/**
 * Where packed children of `widths` sit (rule 3): Left from 0, Right against the end, Center rounded down; Flex starts
 * at 0 and shares the spare columns out in proportion to the widths, by largest remainder (the earlier child on a tie).
 */
export function packRow(
  widths: readonly number[],
  columns: number,
  justify: RowJustify,
): { x: number; w: number }[] {
  const free = Math.max(0, columns - widths.reduce((sum, w) => sum + w, 0));
  const shown = justify === 'stretch' ? shared(widths, free) : [...widths];
  let x = justify === 'end' ? free : justify === 'center' ? Math.floor(free / 2) : 0;
  return shown.map((w) => {
    const cell = { x, w };
    x += w;
    return cell;
  });
}

/** `widths` with `free` columns shared out in proportion, by largest remainder. */
function shared(widths: readonly number[], free: number): number[] {
  const total = widths.reduce((sum, w) => sum + w, 0);
  if (free === 0 || total === 0) return [...widths];
  const exact = widths.map((w) => (w * free) / total);
  const extra = exact.map(Math.floor);
  let left = free - extra.reduce((sum, e) => sum + e, 0);
  const order = exact
    .map((value, index) => ({ index, rest: value - Math.floor(value) }))
    .toSorted((a, b) => b.rest - a.rest || a.index - b.index);
  for (const { index } of order) {
    if (left === 0) break;
    extra[index] = (extra[index] ?? 0) + 1;
    left -= 1;
  }
  return widths.map((w, i) => w + (extra[i] ?? 0));
}

/** Every child of a HorizontalLayout, placed (rules 1-4). */
export function rowPlacement(layout: unknown): RowPlacement {
  const record = recordOf(layout);
  const { columns: authored, justify, alignItems } = rowSettings(record?.['options']);
  const elements = Array.isArray(record?.['elements']) ? (record['elements'] as unknown[]) : [];
  // More children than columns can't fit: lay out as if the columns were the child count (rule 2).
  const columns = Math.max(authored, elements.length);
  const stored = fitWidths(elements.map(storedWidthOf), columns) ?? elements.map(() => 1);
  const cells = packRow(stored, columns, justify);
  const items = elements.map((child, index): RowItem => {
    const own = itemAlignmentOf(child);
    const cell = cells[index] ?? { x: 0, w: 1 };
    return {
      key: elementKey(child, index),
      index,
      x: cell.x,
      w: cell.w,
      stored: stored[index] ?? 1,
      align: own.alignSelf ?? alignItems,
      justify: own.justifySelf ?? 'stretch',
    };
  });
  return { columns, justify, alignItems, items };
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return allowed.find((candidate) => candidate === value);
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
