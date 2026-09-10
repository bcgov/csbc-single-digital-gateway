import type { RendererSet } from '../../types/renderer-set';
import { createGridRenderers } from '../gridstack/index';
import * as ui from '../ui/index';
import { frameCells, frameRenderers } from './with-studio-frame';

// Management-style presentation of a form (doc 180 rule 15): @repo/ui renderers plus a DRAGGABLE
// Grid, every entry — the Grid included — wrapped in the studio frame.
//
// Deliberately NOT built from renderers/default: its static Grid has the same tester, and on a rank
// tie JSONForms takes the FIRST entry, so the static grid would silently win.
const grid = createGridRenderers({ gridOptions: { staticGrid: false } });

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
