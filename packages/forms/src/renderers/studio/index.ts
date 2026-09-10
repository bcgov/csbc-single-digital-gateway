import type { RendererSet } from '../../types/renderer-set';
import { createGridRenderers, GRID_ELEMENT_COMPONENT } from '../gridstack/index';
import * as ui from '../ui/index';
import { STUDIO_GRID_CLASS } from './studio-grid-class';
import { StudioGridElement } from './studio-grid-element';
import { frameCells, frameRenderers } from './with-studio-frame';

// Management-style presentation of a form (doc 180 rules 15-17c): @repo/ui renderers plus a
// DRAGGABLE Grid, every entry — the Grid included — wrapped in the studio frame. Grid children are
// framed by their grid item instead, and all content renders disabled and inert.
//
// Deliberately NOT built from renderers/default: its static Grid has the same tester, and on a rank
// tie JSONForms takes the FIRST entry, so the static grid would silently win.
const grid = createGridRenderers({
  components: { [GRID_ELEMENT_COMPONENT]: StudioGridElement },
  // Height is always size-to-content, so only the side handles resize; animation off stops every
  // swap during a drag sliding the neighbours over 0.3s, which read as choppy (rule 15).
  gridOptions: { staticGrid: false, animate: false, resizable: { handles: 'e, w' } },
  className: STUDIO_GRID_CLASS,
});

export const cells: RendererSet['cells'] = frameCells([...ui.cells, ...grid.cells]);

export const controlRenderers: RendererSet['controlRenderers'] = frameRenderers([
  ...ui.controlRenderers,
  ...grid.controlRenderers,
]);

export const displayRenderers: RendererSet['displayRenderers'] = frameRenderers([
  ...ui.displayRenderers,
  ...grid.displayRenderers,
]);

export const layoutRenderers: RendererSet['layoutRenderers'] = frameRenderers([
  ...ui.layoutRenderers,
  ...grid.layoutRenderers,
]);
