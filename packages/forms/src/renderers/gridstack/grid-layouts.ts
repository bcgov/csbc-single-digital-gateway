import type { UISchemaElement } from '@jsonforms/core';
import { CONDITION_TYPE, FLOW_TYPE, STAGE_TYPE } from '../xyflow/flow-elements';

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

/**
 * Doc 212 rule 1: the titled, nestable division INSIDE a page — a `vertical` layout with a heading and a
 * description, identified by its own type exactly as a Form is.
 */
export const SECTION_TYPE = 'Section';

/**
 * Doc 215 rule 1: the OTHER root-only boundary — a service, rendered exactly as a Form is. A second type of the
 * `vertical` kind, like the Section.
 */
export const SERVICE_TYPE = 'Service';

/**
 * Doc 215 rule 4: whether `type` is a root that is ONE PAGE of elements — a `Form` or a `Service` — as opposed to a
 * `Flow`, which is a journey of Stages.
 *
 * This is the ONE test for that idea. Every boundary decision reads it: the inspector's Title and Description fields,
 * `dropTargetFor`, `StudioCanvas`'s preview branch, `FormRunner` and `SubmissionView`. A bare `=== FORM_TYPE` written
 * for this reason is a bug waiting for the next boundary — the data-flow audit found the same comparison written twice
 * before there was a second one. Comparisons meaning "a Form INSIDE A STAGE" are a different question and stay literal
 * (rule 5).
 */
export function isPageRoot(type: string): boolean {
  return type === FORM_TYPE || type === SERVICE_TYPE;
}

const KIND_BY_TYPE: ReadonlyMap<string, GridLayoutKind> = new Map([
  ...(Object.keys(GRID_LAYOUT_TYPES) as GridLayoutKind[]).map(
    (kind) => [GRID_LAYOUT_TYPES[kind], kind] as const,
  ),
  // Doc 192 rule 3: every kind-keyed decision treats a Form exactly like a VerticalLayout.
  [FORM_TYPE, 'vertical'] as const,
  // Doc 212: and a Section too. THIS MAP, never `GRID_LAYOUT_TYPES` — that one is one type per kind, read by
  // the axis testers and by `fill-layouts`, so a second entry there would DISPLACE `VerticalLayout`. Nothing
  // type-checks the difference, which is why `test/studio-section-placement.test.tsx` pins both halves.
  [SECTION_TYPE, 'vertical'] as const,
  // Doc 215 rules 2-3: and a Service, for the same reason and with the same warning about `GRID_LAYOUT_TYPES`.
  [SERVICE_TYPE, 'vertical'] as const,
]);

/** The layout kind rendering `type`, or `undefined` for anything that is not a gridstack layout. */
export function layoutKindOf(type: string): GridLayoutKind | undefined {
  return KIND_BY_TYPE.get(type);
}

/** Whether `type` is rendered by gridstack — `Grid`, `VerticalLayout`, `HorizontalLayout`, `Form`, `Service` or `Section`. */
export function isGridLayoutType(type: string): boolean {
  return KIND_BY_TYPE.has(type);
}

/** The horizontal rule display element (doc 194). */
export const SEPARATOR_TYPE = 'Separator';

/**
 * Doc 195 rule 16: a Flow is only the root, a Stage only in a Flow, a Form only the root or in a Stage.
 * Doc 199 rule 21: a Condition is a Flow node too, so no layout accepts one either.
 * Doc 215 rule 13: a Service is root-only with no Stage exception at all, so this one entry is the whole of its
 * placement rule — it is what `insert-element`, `apply-layout`, the drop gate and the grid's `accepts` all read.
 */
const NEVER_IN_LAYOUT: ReadonlySet<string> = new Set([
  FORM_TYPE,
  SERVICE_TYPE,
  FLOW_TYPE,
  STAGE_TYPE,
  CONDITION_TYPE,
]);

/**
 * Whether an element of `type` may sit in a layout of `kind` (doc 194 rule 7, doc 195 rule 16): everything may, except a
 * Form, Flow or Stage in any layout, and a Separator in a HorizontalLayout, where it would take one of the row's columns
 * (rows draw `options.dividers` instead).
 *
 * Doc 212 rules 4-5: a Section sits in VERTICAL contexts only — the root, a VerticalLayout, or another Section
 * (whose own kind is `vertical`). A heading, a description and a stack of fields inside one cell of a row reads
 * as a mistake, and the row engine (doc 180 rule 30b) would have to size the whole block as a single-line item.
 */
export function allowedInLayout(type: string, kind: GridLayoutKind): boolean {
  if (NEVER_IN_LAYOUT.has(type)) return false;
  if (type === SECTION_TYPE) return kind === 'vertical';
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
