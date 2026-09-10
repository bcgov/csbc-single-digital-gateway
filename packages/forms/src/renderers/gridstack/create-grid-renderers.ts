import { rankWith, uiTypeIs, type RankedTester } from '@jsonforms/core';
import type { ComponentMap } from 'gridstack/dist/react';
import type { GridRenderersOptions } from '../../types/elements';
import type { RendererSet } from '../../types/renderer-set';
import { GridElementDispatch } from './grid-element';
import { GRID_ELEMENT_COMPONENT } from './grid-options';
import { createGridLayoutRenderer } from './grid-renderer';

export const gridTester: RankedTester = rankWith(1, uiTypeIs('Grid'));

/** The built-in item component, with the consumer's map merged over it (so it may override it). */
export function buildComponentMap(components: ComponentMap | undefined): ComponentMap {
  return { [GRID_ELEMENT_COMPONENT]: GridElementDispatch, ...components };
}

/**
 * Builds a `RendererSet` holding one `Grid` layout renderer (doc 180 rules 6-13).
 *
 * A factory because the grid is configured per consumer: `default` calls it with the static
 * defaults, `studio` with a draggable grid, its own item component and item styling. The same
 * `{ type: 'Grid' }` uischema then renders static or draggable depending on which registry the
 * `<JsonForms>` instance was given — the tester is identical. This module imports no other renderer
 * set, so any components a consumer needs arrive through `components`.
 */
export function createGridRenderers({
  components,
  gridOptions,
  className,
}: GridRenderersOptions = {}): RendererSet {
  return {
    cells: [],
    controlRenderers: [],
    displayRenderers: [],
    layoutRenderers: [
      {
        tester: gridTester,
        renderer: createGridLayoutRenderer(buildComponentMap(components), gridOptions, className),
      },
    ],
  };
}
