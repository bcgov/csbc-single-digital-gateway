import type { RendererSet } from '../renderer-set';
import { renderersOf } from '../renderer-set';
import { headingEntry } from './heading-renderer';

export type { RendererSet } from '../renderer-set';
export { headingOptions, type HeadingOptions } from './heading-options';

export const cells: RendererSet['cells'] = [];
export const contentRenderers: RendererSet['contentRenderers'] = [headingEntry];
export const controlRenderers: RendererSet['controlRenderers'] = [];
export const layoutRenderers: RendererSet['layoutRenderers'] = [];
export const renderers = renderersOf({
  cells,
  contentRenderers,
  controlRenderers,
  layoutRenderers,
});
