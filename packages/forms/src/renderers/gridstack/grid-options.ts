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
 */
export const DEFAULT_GRID_OPTIONS: Readonly<GridStackLayoutOptions> = Object.freeze({
  column: 12,
  cellHeight: '1rem',
  margin: '0.5rem',
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

/**
 * One GridStack widget per element. The element itself is NOT put in `props` — GridStack clones
 * widget JSON — only its index, which `GridElementDispatch` resolves against the Grid context.
 * Missing `x`/`y` are left out so gridstack auto-positions the item.
 */
export function toGridWidgets(
  elements: readonly UISchemaElement[],
  idPrefix: string,
): GridStackWidget[] {
  return elements.map((element, index) => ({
    ...(pickDefined(element.options?.['gridItem'], GRID_ITEM_KEYS) as GridItemPlacement),
    id: `${idPrefix}-${index}`,
    component: GRID_ELEMENT_COMPONENT,
    props: { index },
  }));
}

interface GridStackOptionsInput {
  elements: readonly UISchemaElement[];
  /** The Grid element's authored `options` (allow-listed here). */
  elementOptions: unknown;
  /** The consumer's factory `gridOptions`. */
  gridOptions: GridStackLayoutOptions | undefined;
  idPrefix: string;
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
}: GridStackOptionsInput): GridStackOptions {
  return {
    ...DEFAULT_GRID_OPTIONS,
    ...gridOptions,
    ...(pickDefined(elementOptions, GRID_ELEMENT_OPTION_KEYS) as GridElementOptions),
    sizeToContent: false,
    children: toGridWidgets(elements, idPrefix),
  };
}
