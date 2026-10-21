import { rankWith, uiTypeIs, type RankedTester } from '@jsonforms/core';
import type { ComponentMap } from 'gridstack/dist/react';
import type { GridRenderersOptions } from '../../types/elements';
import type { RendererSet } from '../../types/renderer-set';
import { TabsRenderer } from './tabs-renderer';
import { createFormRenderer } from './form-renderer';
import { StudioFormTitle, StudioServiceTitle } from './studio-title';
import { GridElementDispatch } from './grid-element';
import {
  TABS_TYPE,
  TAB_CONTENT_TYPE,
  FORM_TYPE,
  GRID_LAYOUT_TYPES,
  SECTION_TYPE,
  SERVICE_TYPE,
  type GridLayoutKind,
} from './grid-layouts';
import { NESTED_SERVICE_MESSAGE } from './service-renderer';
import { createSectionRenderer } from './section-renderer';
import { GRID_ELEMENT_COMPONENT } from './grid-options';
import { createGridLayoutRenderer } from './grid-renderer';
import { installGrabOffsetClamp } from './grid-grab-offset';
import { installGridUpdateGuard } from './grid-update-guard';

export const gridTester: RankedTester = rankWith(1, uiTypeIs(GRID_LAYOUT_TYPES.grid));
export const verticalLayoutTester: RankedTester = rankWith(1, uiTypeIs(GRID_LAYOUT_TYPES.vertical));
export const horizontalLayoutTester: RankedTester = rankWith(
  1,
  uiTypeIs(GRID_LAYOUT_TYPES.horizontal),
);
/** Doc 192 rule 2: the root-only Form, rendered by the vertical layout. */
export const formTester: RankedTester = rankWith(1, uiTypeIs(FORM_TYPE));
/** Doc 215 rule 8: the other root-only boundary, rendered by the vertical layout exactly as the Form is. */
export const serviceTester: RankedTester = rankWith(1, uiTypeIs(SERVICE_TYPE));
/** Doc 212 rule 1: the Section, also rendered by the vertical layout — a second type of the same kind. */
export const sectionTester: RankedTester = rankWith(1, uiTypeIs(SECTION_TYPE));
/**
 * Doc 216 rule 4: ONE entry on the bare type. The component is chosen INSIDE the renderer from the sanitised
 * `options.component`, not by a second tester — with `tabs` both the default and the only value, a rank-2
 * `optionIs` entry would resolve to the same component as this one.
 */
export const tabsTester: RankedTester = rankWith(1, uiTypeIs(TABS_TYPE));
/**
 * Doc 216 rule 1: a TabContent IS a vertical layout — the same renderer, no wrapper of its own. There is no
 * `Tab` entry: a Tab is a TRIGGER, drawn by the strip from its label, and never dispatched.
 */
export const tabContentTester: RankedTester = rankWith(1, uiTypeIs(TAB_CONTENT_TYPE));

// Registry order (doc 180 rule 23, doc 192 rule 2). The types differ, so no two testers ever tie on one element.
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
 * Builds a `RendererSet` holding the gridstack layout renderers — `Grid`, `VerticalLayout`,
 * `HorizontalLayout` and the root `Form` (doc 180 rules 6-13, 23-30; doc 192).
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
  // Doc 190 B1: gridstack picks the grid by the CURSOR but the cell by the HELPER's top-left. Without this a
  // tall element grabbed below its top lands in the PARENT of the layout the pointer is over.
  installGrabOffsetClamp();
  const componentMap = buildComponentMap(components);
  const rendererFor = (layout: GridLayoutKind) =>
    createGridLayoutRenderer(componentMap, gridOptions, className, layout);
  return {
    cells: [],
    controlRenderers: [],
    displayRenderers: [],
    layoutRenderers: [
      ...LAYOUT_TESTERS.map(([layout, tester]) => ({ tester, renderer: rendererFor(layout) })),
      // Doc 201 rule 7: on the canvas the title is the heading alone, with a placeholder when it is empty.
      {
        tester: formTester,
        renderer: createFormRenderer(rendererFor('vertical'), StudioFormTitle, { dropZone: true }),
      },
      // Doc 215 rule 8: the Service — the same renderer, the same drop zone, its own title and nested message.
      {
        tester: serviceTester,
        renderer: createFormRenderer(rendererFor('vertical'), StudioServiceTitle, {
          dropZone: true,
          nestedMessage: NESTED_SERVICE_MESSAGE,
        }),
      },
      // Doc 212 rules 1-2: the same vertical renderer the kind already has, inside a titled shell. APPENDED, like
      // the Form entry — `renderers-studio.test.tsx` reaches these by position from the end.
      { tester: sectionTester, renderer: createSectionRenderer(rendererFor('vertical')) },
      // Doc 216 rules 1-2: the strip, and the panel as the vertical renderer the kind already has. APPENDED for
      // the same reason as the entries above — tests reach this list by position from the end. TWO entries, not
      // three: a Tab is never dispatched.
      { tester: tabsTester, renderer: TabsRenderer },
      { tester: tabContentTester, renderer: rendererFor('vertical') },
    ],
  };
}
