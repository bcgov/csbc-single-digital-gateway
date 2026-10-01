import * as ui from '../ui/index';
import type { RendererSet } from '../renderer-set';
import { renderersOf } from '../renderer-set';
import { checkboxControlEntry } from './checkbox-control';
import { formEntry } from './form-renderer';
import { switchControlEntry } from './switch-control';
import { verticalLayoutEntry } from './vertical-layout';

export type { RendererSet } from '../renderer-set';
export { GAP_REM, layoutGap, type LayoutGap } from './layout-gap';

/** Every ui category, plus the fillable layouts (doc 236 rule 2). */
export const cells: RendererSet['cells'] = [...ui.cells];
export const contentRenderers: RendererSet['contentRenderers'] = [...ui.contentRenderers];
export const controlRenderers: RendererSet['controlRenderers'] = [
  ...ui.controlRenderers,
  checkboxControlEntry,
  switchControlEntry,
];
export const layoutRenderers: RendererSet['layoutRenderers'] = [
  ...ui.layoutRenderers,
  verticalLayoutEntry,
  formEntry,
];
export const renderers = renderersOf({
  cells,
  contentRenderers,
  controlRenderers,
  layoutRenderers,
});
