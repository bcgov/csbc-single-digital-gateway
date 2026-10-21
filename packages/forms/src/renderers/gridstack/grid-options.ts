import type { UISchemaElement } from '@jsonforms/core';
import type { GridStackOptions, GridStackWidget } from 'gridstack/dist/react';
import type {
  GridElementOptions,
  GridItemPlacement,
  GridStackLayoutOptions,
} from '../../types/elements';
import { horizontalColumns, horizontalWidth, type GridLayoutKind } from './grid-layouts';
import { GridFreeEngine } from './grid-free-engine';
import { GridRowEngine } from './grid-row-engine';

/** The components-map key every Grid child widget renders through (doc 180 rule 10). */
export const GRID_ELEMENT_COMPONENT = 'jsonforms-element';

import { gridMarginFor, layoutGapOf } from './layout-gap';

/**
 * Built-in defaults — a fillable form's grid is static and sizes items to their content.
 *
 * Item height is a whole number of rows, so row height bounds how far an item's box (and its
 * drag/resize outline) can overshoot its component. gridstack's default square rows (`'auto'`, row
 * height = column width) rounded a 70px Heading up to 157px; `1rem` rows keep the overshoot under one
 * row while `h` stays meaningful (`h: 5` ≈ 80px) and drags snap to a 16px rhythm. 1px rows were
 * rejected: huge meaningless `h` values, 1px snapping, and saved layouts that break if the unit
 * changes. `margin: '0.5rem'` insets every item's content on all four sides, so neighbours sit 1rem
 * apart (and 0.5rem in from the grid's edges); gridstack counts the margins when sizing to content.
 * `animate: false`: every item mounts one row tall and then grows to its content, so with gridstack's
 * default 0.3s animation the whole form visibly slides into place on load (doc 184).
 */
export const DEFAULT_GRID_OPTIONS: Readonly<GridStackLayoutOptions> = Object.freeze({
  column: 12,
  cellHeight: '1rem',
  margin: '0.5rem',
  animate: false,
  staticGrid: true,
  sizeToContent: true,
});

// Authored uischema is untrusted-shape JSON: only these keys are ever read from it (rules 8-9).
const GRID_ELEMENT_OPTION_KEYS = [
  'column',
  'cellHeight',
  'float',
  'minRow',
  'maxRow',
] as const satisfies readonly (keyof GridElementOptions)[];

const GRID_ITEM_KEYS = [
  'x',
  'y',
  'w',
  'h',
  'minW',
  'maxW',
  'minH',
  'maxH',
  'noMove',
  'noResize',
  'locked',
] as const satisfies readonly (keyof GridItemPlacement)[];

/** The defined values of `keys` on `source`; anything that is not an object yields `{}`. */
function pickDefined(source: unknown, keys: readonly string[]): Record<string, unknown> {
  if (typeof source !== 'object' || source === null) return {};
  const record = source as Record<string, unknown>;
  return Object.fromEntries(
    keys.filter((key) => record[key] !== undefined).map((key) => [key, record[key]]),
  );
}

type ElementIdOf = (element: UISchemaElement) => string;
type Heights = ReadonlyMap<string, number> | undefined;

/** How widgets are placed: authored in a Grid, derived from element order in the other layouts. */
export type WidgetLayout =
  | { kind: 'grid' }
  | { kind: 'vertical' }
  | { kind: 'horizontal'; columns: number };

const GRID_WIDGET_LAYOUT: WidgetLayout = Object.freeze({ kind: 'grid' });

/** The widget id for `element` (doc 183 rule 7): the editor's id when there is one, else `<prefix>-<index>`. */
export function gridElementId(
  element: UISchemaElement,
  index: number,
  idPrefix: string,
  idOf?: ElementIdOf,
): string {
  return idOf ? idOf(element) : `${idPrefix}-${index}`;
}

const withHeight = (h: number | undefined) => (h === undefined ? {} : { h });

/** Doc 180 rule 9 + doc 183 rule 16b: the allow-listed `gridItem`, with the current `h` when none is authored. */
function authoredPlacement(
  element: UISchemaElement,
  id: string,
  heights: Heights,
): GridItemPlacement {
  const placement = pickDefined(element.options?.['gridItem'], GRID_ITEM_KEYS) as GridItemPlacement;
  return placement.h === undefined ? { ...placement, ...withHeight(heights?.get(id)) } : placement;
}

/** Rule 26: one column, each item below the ones before it (current heights, else one row each). */
function stackedPlacements(ids: readonly string[], heights: Heights): GridItemPlacement[] {
  let y = 0;
  return ids.map((id) => {
    const h = heights?.get(id);
    const placement = { x: 0, y, w: 1, ...withHeight(h) };
    y += h ?? 1;
    return placement;
  });
}

/** Rule 28: one row, left to right; a child that would end past the last column gets no x/y. */
function rowPlacements(
  elements: readonly UISchemaElement[],
  ids: readonly string[],
  columns: number,
  heights: Heights,
): GridItemPlacement[] {
  let x = 0;
  return elements.map((element, index) => {
    const w = horizontalWidth(element, columns);
    const sized = { w, ...withHeight(heights?.get(ids[index] ?? '')) };
    if (x + w > columns) return sized;
    const placement = { x, y: 0, ...sized };
    x += w;
    return placement;
  });
}

/**
 * One GridStack widget per element. The element itself is NOT put in `props` — GridStack clones
 * widget JSON — only its id, which `GridElementDispatch` resolves against the Grid context. An id,
 * never an index: gridstack freezes props at add time, and indices change when elements are sorted or
 * moved (doc 183 rule 7).
 *
 * In a Grid, missing `x`/`y` are left out so gridstack auto-positions the item, and `currentHeights`
 * (a mounted grid's engine heights by id) fills `h` for widgets whose `gridItem` has none: gridstack's
 * `load` would otherwise give each of them 1 row and collapse the grid on every reload (doc 183 rule
 * 16b). In a VerticalLayout or HorizontalLayout the placement comes from element order (rules 26, 28).
 */
export function toGridWidgets(
  elements: readonly UISchemaElement[],
  idPrefix: string,
  idOf?: ElementIdOf,
  currentHeights?: ReadonlyMap<string, number>,
  layout: WidgetLayout = GRID_WIDGET_LAYOUT,
): GridStackWidget[] {
  const ids = elements.map((element, index) => gridElementId(element, index, idPrefix, idOf));
  const placements =
    layout.kind === 'vertical'
      ? stackedPlacements(ids, currentHeights)
      : layout.kind === 'horizontal'
        ? rowPlacements(elements, ids, layout.columns, currentHeights)
        : elements.map((element, index) =>
            authoredPlacement(element, ids[index] ?? '', currentHeights),
          );
  // Every placement is a fresh object, so it becomes its widget in place.
  return ids.map((id, index) =>
    Object.assign(placements[index] ?? {}, {
      id,
      component: GRID_ELEMENT_COMPONENT,
      props: { elementId: id },
    }),
  );
}

interface GridStackOptionsInput {
  elements: readonly UISchemaElement[];
  /** The Grid element's authored `options` (allow-listed here). */
  elementOptions: unknown;
  /** The consumer's factory `gridOptions`. */
  gridOptions: GridStackLayoutOptions | undefined;
  idPrefix: string;
  /** Editor-supplied element ids (doc 183); absent → index-derived ids. */
  idOf?: ElementIdOf;
  /** Editor-only drop filter (doc 183 rule 14); absent → the grid accepts no foreign items. */
  acceptWidgets?: (element: Element) => boolean;
  /** The mounted grid's current heights by widget id (doc 183 rule 16b). */
  currentHeights?: ReadonlyMap<string, number>;
  /** Which layout the element is (doc 180 rules 23-28); absent → `'grid'`. */
  layout?: GridLayoutKind;
}

/** Whether items size to their content: factory `gridOptions.sizeToContent`, else the default. */
export function resolveSizeToContent(gridOptions: GridStackLayoutOptions | undefined): boolean {
  return gridOptions?.sizeToContent ?? DEFAULT_GRID_OPTIONS.sizeToContent ?? true;
}

/**
 * The options a layout forces over the factory's, and how its widgets are placed. A Grid forces only
 * its allow-listed authored options (rule 8); the other layouts read no authored gridstack option and
 * force their axis (rules 25, 27). Neither caps its rows: gridstack's `maxRow` counts `cellHeight` rows
 * and clamps every item's height to it (bug B3). `maxRow: 0` is always emitted for them, because
 * `updateOptions` ignores an absent one and would keep a stale cap.
 *
 * Every layout forces `margin` from its `options.gap` (doc 193 rule 11), always emitted for the same reason, so a
 * changed gap reaches a mounted grid; a Grid's authored `margin` is no longer read.
 */
function layoutOptions(
  layout: GridLayoutKind,
  elements: readonly UISchemaElement[],
  elementOptions: unknown,
): { forced: GridStackOptions; widgetLayout: WidgetLayout } {
  const margin = gridMarginFor(layoutGapOf(elementOptions));
  if (layout === 'vertical') {
    return {
      forced: { column: 1, disableResize: true, maxRow: 0, margin },
      widgetLayout: { kind: 'vertical' },
    };
  }
  if (layout === 'horizontal') {
    const columns = horizontalColumns(elementOptions, elements.length);
    return {
      forced: { column: columns, maxRow: 0, margin, engineClass: GridRowEngine },
      widgetLayout: { kind: 'horizontal', columns },
    };
  }
  return {
    // Doc 189 rule 21c: the free-grid engine widens palette items as they enter, so the placeholder shows the drop.
    forced: {
      ...(pickDefined(elementOptions, GRID_ELEMENT_OPTION_KEYS) as GridElementOptions),
      margin,
      engineClass: GridFreeEngine,
    },
    widgetLayout: GRID_WIDGET_LAYOUT,
  };
}

/**
 * GridStack options, lowest precedence first: built-in defaults → factory `gridOptions` → what the
 * layout forces (a Grid's allow-listed authored options, or another layout's axis). `children` is
 * always derived from `elements`, last, so no layer can inject widgets, and authored uischema can
 * never reach `staticGrid`.
 *
 * `sizeToContent` is always handed to GridStack as `false`: gridstack would otherwise measure each
 * item before React has portalled its content in. The resolved flag (`resolveSizeToContent`) drives
 * `useSizeToContent` instead (rules 8, 10c).
 */
export function buildGridStackOptions({
  elements,
  elementOptions,
  gridOptions,
  idPrefix,
  idOf,
  acceptWidgets,
  currentHeights,
  layout = 'grid',
}: GridStackOptionsInput): GridStackOptions {
  const { forced, widgetLayout } = layoutOptions(layout, elements, elementOptions);
  return {
    ...DEFAULT_GRID_OPTIONS,
    ...gridOptions,
    ...forced,
    ...(acceptWidgets ? { acceptWidgets } : {}),
    sizeToContent: false,
    children: toGridWidgets(elements, idPrefix, idOf, currentHeights, widgetLayout),
  };
}
