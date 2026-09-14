import type { UISchemaElement } from '@jsonforms/core';
import type { GridStackOptions, GridStackWidget } from 'gridstack/dist/react';
import type {
  GridElementOptions,
  GridItemPlacement,
  GridStackLayoutOptions,
} from '../../types/elements';

/** The components-map key every Grid child widget renders through (doc 180 rule 10). */
export const GRID_ELEMENT_COMPONENT = 'jsonforms-element';

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
  'margin',
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

/** The widget id for `element` (doc 183 rule 7): the editor's id when there is one, else `<prefix>-<index>`. */
export function gridElementId(
  element: UISchemaElement,
  index: number,
  idPrefix: string,
  idOf?: ElementIdOf,
): string {
  return idOf ? idOf(element) : `${idPrefix}-${index}`;
}

/**
 * One GridStack widget per element. The element itself is NOT put in `props` — GridStack clones
 * widget JSON — only its id, which `GridElementDispatch` resolves against the Grid context. An id,
 * never an index: gridstack freezes props at add time, and indices change when elements are sorted or
 * moved (doc 183 rule 7). Missing `x`/`y` are left out so gridstack auto-positions the item.
 *
 * `currentHeights` (a mounted grid's engine heights by id) fills `h` for widgets whose `gridItem` has
 * none: gridstack's `load` would otherwise give each of them 1 row and collapse the grid on every reload
 * (doc 183 rule 16b). An authored `h` always wins.
 */
export function toGridWidgets(
  elements: readonly UISchemaElement[],
  idPrefix: string,
  idOf?: ElementIdOf,
  currentHeights?: ReadonlyMap<string, number>,
): GridStackWidget[] {
  return elements.map((element, index) => {
    const id = gridElementId(element, index, idPrefix, idOf);
    const placement = pickDefined(
      element.options?.['gridItem'],
      GRID_ITEM_KEYS,
    ) as GridItemPlacement;
    const currentH = placement.h === undefined ? currentHeights?.get(id) : undefined;
    return {
      ...placement,
      ...(currentH === undefined ? {} : { h: currentH }),
      id,
      component: GRID_ELEMENT_COMPONENT,
      props: { elementId: id },
    };
  });
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
}

/** Whether items size to their content: factory `gridOptions.sizeToContent`, else the default. */
export function resolveSizeToContent(gridOptions: GridStackLayoutOptions | undefined): boolean {
  return gridOptions?.sizeToContent ?? DEFAULT_GRID_OPTIONS.sizeToContent ?? true;
}

/**
 * GridStack options, lowest precedence first: built-in defaults → factory `gridOptions` → the
 * element's allow-listed options. `children` is always derived from `elements`, last, so neither
 * layer can inject widgets, and authored uischema can never reach `staticGrid`.
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
}: GridStackOptionsInput): GridStackOptions {
  return {
    ...DEFAULT_GRID_OPTIONS,
    ...gridOptions,
    ...(pickDefined(elementOptions, GRID_ELEMENT_OPTION_KEYS) as GridElementOptions),
    ...(acceptWidgets ? { acceptWidgets } : {}),
    sizeToContent: false,
    children: toGridWidgets(elements, idPrefix, idOf, currentHeights),
  };
}
