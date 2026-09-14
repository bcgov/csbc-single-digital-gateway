import type { UISchemaElement } from '@jsonforms/core';

/** Which gridstack layout a renderer draws (doc 180 rules 23-24). */
export type GridLayoutKind = 'grid' | 'vertical' | 'horizontal';

/** The uischema `type` each layout kind renders. */
export const GRID_LAYOUT_TYPES: Readonly<Record<GridLayoutKind, string>> = Object.freeze({
  grid: 'Grid',
  vertical: 'VerticalLayout',
  horizontal: 'HorizontalLayout',
});

const KIND_BY_TYPE: ReadonlyMap<string, GridLayoutKind> = new Map(
  (Object.keys(GRID_LAYOUT_TYPES) as GridLayoutKind[]).map((kind) => [
    GRID_LAYOUT_TYPES[kind],
    kind,
  ]),
);

/** The layout kind rendering `type`, or `undefined` for anything that is not a gridstack layout. */
export function layoutKindOf(type: string): GridLayoutKind | undefined {
  return KIND_BY_TYPE.get(type);
}

/** Whether `type` is rendered by gridstack — `Grid`, `VerticalLayout` or `HorizontalLayout`. */
export function isGridLayoutType(type: string): boolean {
  return KIND_BY_TYPE.has(type);
}

const MIN_COLUMNS = 2;
const MAX_COLUMNS = 6;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * A HorizontalLayout's column count (rule 27): its authored `options.columns` when that is an integer
 * 2-6, otherwise the child count clamped to 2-6.
 */
export function horizontalColumns(elementOptions: unknown, childCount: number): number {
  const columns =
    typeof elementOptions === 'object' && elementOptions !== null
      ? (elementOptions as { columns?: unknown }).columns
      : undefined;
  if (typeof columns === 'number' && Number.isInteger(columns)) {
    if (columns >= MIN_COLUMNS && columns <= MAX_COLUMNS) return columns;
  }
  return clamp(childCount, MIN_COLUMNS, MAX_COLUMNS);
}

/** A HorizontalLayout child's width (rule 28): an integer `gridItem.w` clamped to 1..columns, else 1. */
export function horizontalWidth(element: UISchemaElement, columns: number): number {
  const gridItem = element.options?.['gridItem'];
  const w =
    typeof gridItem === 'object' && gridItem !== null ? (gridItem as { w?: unknown }).w : undefined;
  return typeof w === 'number' && Number.isInteger(w) ? clamp(w, 1, columns) : 1;
}

/**
 * Whether a HorizontalLayout's row has a free column (rule 30, doc 185 rule 15b): its children's widths
 * sum to less than its columns. A dropped or copied item arrives at width 1, so one column is enough.
 */
export function rowHasRoom(elementOptions: unknown, elements: readonly UISchemaElement[]): boolean {
  const columns = horizontalColumns(elementOptions, elements.length);
  return elements.reduce((used, element) => used + horizontalWidth(element, columns), 0) < columns;
}
