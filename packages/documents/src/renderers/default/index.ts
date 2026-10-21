import * as ui from '../ui/index';
import type { RendererSet } from '../renderer-set';
import { renderersOf } from '../renderer-set';
import { cardLayoutEntry } from './card-layout';
import { formEntry } from './form-renderer';
import { funnelEntry } from './funnel/funnel-renderer';
import { gridLayoutEntry } from './grid-layout';
import { horizontalLayoutEntry } from './horizontal-layout';
import { sectionLayoutEntry } from './section-layout';
import { tabsLayoutEntry } from './tabs-layout';
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
  tabsLayoutEntry,
  cardLayoutEntry,
  // Doc 278: a titled vertical layout.
  sectionLayoutEntry,
  // Doc 274: a Funnel filled one Form at a time.
  funnelEntry,
];
export const renderers = renderersOf({
  cells,
  contentRenderers,
  controlRenderers,
  layoutRenderers,
});
