import * as defaults from '../default/index';
import type { RendererSet } from '../renderer-set';
import { renderersOf } from '../renderer-set';
import { placeholderEntry } from './placeholder-renderer';
import { studioFormEntry } from './studio-form';
import { studioHeadingEntry } from './studio-heading';
import { studioRichContentEntry } from './studio-rich-content';
import { studioSeparatorEntry } from './studio-separator';
import { withStudioElement } from './studio-element';
import { studioVerticalLayoutEntry } from './studio-vertical-layout';

export type { RendererSet } from '../renderer-set';
export {
  StudioEditorProvider,
  useStudioEditor,
  type ElementPatch,
  type StudioEditor,
} from './studio-editor';
export { useStudioElement, type StudioElementState } from './studio-element';

/**
 * Every default category, each entry wrapped in StudioElement, plus the studio's own renderers — which outrank what
 * they replace (doc 236 rules 2-3, 15). The placeholder is the content category's rank-0 fallback.
 */
export const cells: RendererSet['cells'] = [...defaults.cells];
export const contentRenderers: RendererSet['contentRenderers'] = [
  ...defaults.contentRenderers,
  studioHeadingEntry,
  studioSeparatorEntry,
  studioRichContentEntry,
  placeholderEntry,
].map((entry) => withStudioElement(entry));
/** Controls are drawn but inert: a click selects, never fills in (doc 237 rule 13). */
export const controlRenderers: RendererSet['controlRenderers'] = defaults.controlRenderers.map(
  (entry) => withStudioElement(entry, { inert: true }),
);
export const layoutRenderers: RendererSet['layoutRenderers'] = [
  ...defaults.layoutRenderers,
  studioVerticalLayoutEntry,
  studioFormEntry,
].map((entry) => withStudioElement(entry));
export const renderers = renderersOf({
  cells,
  contentRenderers,
  controlRenderers,
  layoutRenderers,
});
