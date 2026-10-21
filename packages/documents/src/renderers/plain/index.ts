import * as defaults from '../default/index';
import type { RendererSet } from '../renderer-set';
import { renderersOf } from '../renderer-set';
import { plainControlEntry } from './plain-control';
import { plainFunnelEntry } from './plain-funnel';
import { plainObjectArrayEntry } from './plain-object-array';
import { plainTabsEntry } from './plain-tabs';

export type { RendererSet } from '../renderer-set';
export { NOT_ANSWERED } from './plain-control';

/**
 * The read-back set (doc 282): the default set, with every Control answered as plain text (rank 10), Tabs listed and a
 * Funnel's answered path stacked (rank 2). Content renders as everywhere else. Internal: `DocumentView` is its one user.
 */
export const cells: RendererSet['cells'] = [...defaults.cells];
export const contentRenderers: RendererSet['contentRenderers'] = [...defaults.contentRenderers];
export const controlRenderers: RendererSet['controlRenderers'] = [
  ...defaults.controlRenderers,
  plainControlEntry,
  plainObjectArrayEntry,
];
export const layoutRenderers: RendererSet['layoutRenderers'] = [
  ...defaults.layoutRenderers,
  plainTabsEntry,
  plainFunnelEntry,
];
export const renderers = renderersOf({
  cells,
  contentRenderers,
  controlRenderers,
  layoutRenderers,
});
