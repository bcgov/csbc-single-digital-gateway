import * as ui from '../ui/index';
import type { RendererSet } from '../renderer-set';
import { renderersOf } from '../renderer-set';
import { formEntry } from './form-renderer';
import { gridLayoutEntry } from './grid-layout';
import { horizontalLayoutEntry } from './horizontal-layout';
import { verticalLayoutEntry } from './vertical-layout';

export type { RendererSet } from '../renderer-set';
export { GAP_REM, layoutGap, type LayoutGap } from './layout-gap';
export { gridPlacement, type GridCell, type GridPlacement, type GridRect } from './grid-placement';

/** Every ui category, plus the fillable layouts (doc 236 rule 2). */
export const cells: RendererSet['cells'] = [...ui.cells];
export const contentRenderers: RendererSet['contentRenderers'] = [...ui.contentRenderers];
export const controlRenderers: RendererSet['controlRenderers'] = [...ui.controlRenderers];
export const layoutRenderers: RendererSet['layoutRenderers'] = [
  ...ui.layoutRenderers,
  verticalLayoutEntry,
  formEntry,
  gridLayoutEntry,
  horizontalLayoutEntry,
];
export const renderers = renderersOf({
  cells,
  contentRenderers,
  controlRenderers,
  layoutRenderers,
});
