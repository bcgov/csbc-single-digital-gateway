import type { RendererSet } from '../renderer-set';
import { renderersOf } from '../renderer-set';
import { checkboxControlEntry } from './checkbox-control';
import { headingEntry } from './heading-renderer';
import { switchControlEntry } from './switch-control';

export type { RendererSet } from '../renderer-set';
export { headingOptions, type HeadingOptions } from './heading-options';

export const cells: RendererSet['cells'] = [];
export const contentRenderers: RendererSet['contentRenderers'] = [headingEntry];
/** The boolean controls (doc 237): a Checkbox, or a Switch for `options.component: 'switch'`. */
export const controlRenderers: RendererSet['controlRenderers'] = [
  checkboxControlEntry,
  switchControlEntry,
];
export const layoutRenderers: RendererSet['layoutRenderers'] = [];
export const renderers = renderersOf({
  cells,
  contentRenderers,
  controlRenderers,
  layoutRenderers,
});
