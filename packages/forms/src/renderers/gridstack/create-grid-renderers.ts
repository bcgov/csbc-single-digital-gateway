import { rankWith, uiTypeIs, type RankedTester } from '@jsonforms/core';
import type { ComponentMap } from 'gridstack/dist/react';
import type { GridRenderersOptions } from '../../types/elements';
import type { RendererSet } from '../../types/renderer-set';
import { GridElementDispatch } from './grid-element';
import { GRID_LAYOUT_TYPES, type GridLayoutKind } from './grid-layouts';
import { GRID_ELEMENT_COMPONENT } from './grid-options';
import { createGridLayoutRenderer } from './grid-renderer';
import { installGridUpdateGuard } from './grid-update-guard';

export const gridTester: RankedTester = rankWith(1, uiTypeIs(GRID_LAYOUT_TYPES.grid));
export const verticalLayoutTester: RankedTester = rankWith(1, uiTypeIs(GRID_LAYOUT_TYPES.vertical));
export const horizontalLayoutTester: RankedTester = rankWith(
  1,
  uiTypeIs(GRID_LAYOUT_TYPES.horizontal),
);

// Registry order (doc 180 rule 23). The types differ, so no two testers ever tie on one element.
const LAYOUT_TESTERS: readonly (readonly [GridLayoutKind, RankedTester])[] = [
  ['grid', gridTester],
  ['vertical', verticalLayoutTester],
  ['horizontal', horizontalLayoutTester],
];

/** The built-in item component, with the consumer's map merged over it (so it may override it). */
export function buildComponentMap(components: ComponentMap | undefined): ComponentMap {
  return { [GRID_ELEMENT_COMPONENT]: GridElementDispatch, ...components };
}

/**
 * Builds a `RendererSet` holding the gridstack layout renderers — `Grid`, `VerticalLayout` and
 * `HorizontalLayout` (doc 180 rules 6-13, 23-30).
 *
 * A factory because the grid is configured per consumer: `default` calls it with the static
 * defaults, `studio` with a draggable grid, its own item component and item styling. The same
 * uischema then renders static or draggable depending on which registry the `<JsonForms>` instance
 * was given — the testers are identical. This module imports no other renderer set, so any
 * components a consumer needs arrive through `components`.
 */
export function createGridRenderers({
  components,
  gridOptions,
  className,
}: GridRenderersOptions = {}): RendererSet {
  // Doc 183 rule 15b: every grid's items may be updated with a live, cyclic mid-drag node.
  installGridUpdateGuard();
  const componentMap = buildComponentMap(components);
  return {
    cells: [],
    controlRenderers: [],
    displayRenderers: [],
    layoutRenderers: LAYOUT_TESTERS.map(([layout, tester]) => ({
      tester,
      renderer: createGridLayoutRenderer(componentMap, gridOptions, className, layout),
    })),
  };
}
