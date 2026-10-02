import type { RendererSet } from '../renderer-set';
import { renderersOf } from '../renderer-set';
import { checkboxControlEntry } from './checkbox-control';
import { headingEntry } from './heading-renderer';
import { inputControlEntry } from './input-control';
import { separatorEntry } from './separator-renderer';
import { switchControlEntry } from './switch-control';
import { textareaControlEntry } from './textarea-control';

export type { RendererSet } from '../renderer-set';
export { headingOptions, type HeadingOptions } from './heading-options';

export const cells: RendererSet['cells'] = [];
export const contentRenderers: RendererSet['contentRenderers'] = [headingEntry, separatorEntry];
/**
 * The boolean controls (doc 237) — a Checkbox, or a Switch for `options.component: 'switch'` — and the string controls
 * (doc 239) — an Input, or a Textarea for `options.component: 'textarea'`.
 */
export const controlRenderers: RendererSet['controlRenderers'] = [
  checkboxControlEntry,
  switchControlEntry,
  inputControlEntry,
  textareaControlEntry,
];
export const layoutRenderers: RendererSet['layoutRenderers'] = [];
export const renderers = renderersOf({
  cells,
  contentRenderers,
  controlRenderers,
  layoutRenderers,
});
