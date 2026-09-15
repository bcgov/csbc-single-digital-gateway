import type { UISchemaElement } from '@jsonforms/core';

/** Which gridstack layout a renderer draws (doc 180 rules 23-24). */
export type GridLayoutKind = 'grid' | 'vertical' | 'horizontal';

/** The uischema `type` each layout kind renders — one type per kind, the axis testers' types. */
export const GRID_LAYOUT_TYPES: Readonly<Record<GridLayoutKind, string>> = Object.freeze({
  grid: 'Grid',
  vertical: 'VerticalLayout',
  horizontal: 'HorizontalLayout',
});

/** The root-only Form element (doc 192): a `vertical` layout identified by its own type. */
export const FORM_TYPE = 'Form';

const KIND_BY_TYPE: ReadonlyMap<string, GridLayoutKind> = new Map([
  ...(Object.keys(GRID_LAYOUT_TYPES) as GridLayoutKind[]).map(
    (kind) => [GRID_LAYOUT_TYPES[kind], kind] as const,
  ),
  // Doc 192 rule 3: every kind-keyed decision treats a Form exactly like a VerticalLayout.
  [FORM_TYPE, 'vertical'] as const,
]);

/** The layout kind rendering `type`, or `undefined` for anything that is not a gridstack layout. */
export function layoutKindOf(type: string): GridLayoutKind | undefined {
  return KIND_BY_TYPE.get(type);
}

/** Whether `type` is rendered by gridstack — `Grid`, `VerticalLayout`, `HorizontalLayout` or `Form`. */
export function isGridLayoutType(type: string): boolean {
  return KIND_BY_TYPE.has(type);
}

/** The horizontal rule display element (doc 194). */
export const SEPARATOR_TYPE = 'Separator';

/**
 * Whether an element of `type` may sit in a layout of `kind` (doc 194 rule 7): everything may, except a Separator in a
 * HorizontalLayout, where it would take one of the row's columns (rows draw `options.dividers` instead).
 */
export function allowedInLayout(type: string, kind: GridLayoutKind): boolean {
  return !(type === SEPARATOR_TYPE && kind === 'horizontal');
}

/** Whether a HorizontalLayout draws dividers between its children (doc 194 rule 14): only `dividers: true`. */
export function dividersOf(elementOptions: unknown): boolean {
  return (
    typeof elementOptions === 'object' &&
    elementOptions !== null &&
    (elementOptions as { dividers?: unknown }).dividers === true
  );
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
