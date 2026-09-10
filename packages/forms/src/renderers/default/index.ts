import type { RendererSet } from '../../types/renderer-set';
import { createGridRenderers } from '../gridstack/index';
import * as ui from '../ui/index';

// Renderers for user-fillable forms (doc 180 rule 14): @repo/ui renderers plus a STATIC Grid.
// `createGridRenderers` is deliberately not re-exported — its one public home is
// @repo/forms/renderers/gridstack. A new source set is spread here AND in renderers/studio.
const grid = createGridRenderers();

export const cells: RendererSet['cells'] = [...ui.cells, ...grid.cells];

export const controlRenderers: RendererSet['controlRenderers'] = [
  ...ui.controlRenderers,
  ...grid.controlRenderers,
];

export const displayRenderers: RendererSet['displayRenderers'] = [
  ...ui.displayRenderers,
  ...grid.displayRenderers,
];

export const layoutRenderers: RendererSet['layoutRenderers'] = [
  ...ui.layoutRenderers,
  ...grid.layoutRenderers,
];
