import type { RendererSet } from '../renderer-set';
import { renderersOf } from '../renderer-set';
import { checkboxControlEntry } from './checkbox-control';
import { headingEntry } from './heading-renderer';
import { inputControlEntry } from './input-control';
import { multiChoiceControlEntry } from './multi-choice-control';
import { separatorEntry } from './separator-renderer';
import { singleChoiceControlEntry } from './single-choice-control';
import { switchControlEntry } from './switch-control';
import { textareaControlEntry } from './textarea-control';

export type { RendererSet } from '../renderer-set';
export { headingOptions, type HeadingOptions } from './heading-options';

export const cells: RendererSet['cells'] = [];
export const contentRenderers: RendererSet['contentRenderers'] = [headingEntry, separatorEntry];
/**
 * The boolean controls (doc 237) — a Checkbox, or a Switch for `options.component: 'switch'` — and the string controls
 * (doc 239) — an Input, or a Textarea for `options.component: 'textarea'` — and the single choice (doc 244) — a
 * Select, or a Radio group for `options.component: 'radio-group'` — and the multiple choice (doc 245) — a
 * Multi-select, or a Checkbox group for `options.component: 'checkbox-group'`.
 */
export const controlRenderers: RendererSet['controlRenderers'] = [
  checkboxControlEntry,
  switchControlEntry,
  inputControlEntry,
  textareaControlEntry,
  singleChoiceControlEntry,
  multiChoiceControlEntry,
];
export const layoutRenderers: RendererSet['layoutRenderers'] = [];
export const renderers = renderersOf({
  cells,
  contentRenderers,
  controlRenderers,
  layoutRenderers,
});
