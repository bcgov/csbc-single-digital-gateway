import * as defaults from '../default/index';
import type { RendererSet } from '../renderer-set';
import { renderersOf } from '../renderer-set';
import { placeholderEntry } from './placeholder-renderer';
import { studioAccordionGroupEntry } from './studio-accordion-group';
import { studioAccordionInputEntry } from './studio-accordion-input';
import { studioCardEntry } from './studio-card';
import { studioDataTableEntry } from './studio-data-table';
import { studioDocumentReferenceEntry } from './studio-document-reference';
import { studioRecordEntry } from './studio-record';
import { studioFormEntry } from './studio-form';
import { studioHeadingEntry } from './studio-heading';
import { studioRichContentEntry } from './studio-rich-content';
import { studioSectionEntry } from './studio-section';
import { studioSeparatorEntry } from './studio-separator';
import { studioTableEntry } from './studio-table';
import { withStudioElement } from './studio-element';
import { studioGridEntry } from './studio-grid';
import { studioHorizontalLayoutEntry } from './studio-horizontal-layout';
import { studioTabsEntry } from './studio-tabs';
import { studioVerticalLayoutEntry } from './studio-vertical-layout';

export type { RendererSet } from '../renderer-set';
export {
  StudioEditorProvider,
  useStudioEditor,
  type ElementPatch,
  type StudioEditor,
} from './studio-editor';
export type { ColumnEdit } from './column-edit';
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
  studioTableEntry,
  studioAccordionGroupEntry,
  placeholderEntry,
].map((entry) => withStudioElement(entry));
/**
 * Controls are drawn but inert: a click selects, never fills in (doc 237 rule 13). The data table outranks its default
 * and is NOT inert — its column headers are edited in place (doc 263 rule 18).
 */
export const controlRenderers: RendererSet['controlRenderers'] = [
  ...defaults.controlRenderers.map((entry) => withStudioElement(entry, { inert: true })),
  withStudioElement(studioDataTableEntry),
  // The record holds an editable layout, so it is not inert either (doc 271 rule 9).
  withStudioElement(studioRecordEntry),
  // A greyed sample item: inert like any other control (doc 280 rule 11).
  withStudioElement(studioAccordionInputEntry, { inert: true }),
  // Inert like any control, so live only on a fillable canvas (doc 287 rule 12).
  withStudioElement(studioDocumentReferenceEntry, { inert: true }),
];
export const layoutRenderers: RendererSet['layoutRenderers'] = [
  ...defaults.layoutRenderers,
  studioVerticalLayoutEntry,
  studioFormEntry,
  studioGridEntry,
  studioHorizontalLayoutEntry,
  studioTabsEntry,
  studioCardEntry,
  studioSectionEntry,
].map((entry) => withStudioElement(entry));
export const renderers = renderersOf({
  cells,
  contentRenderers,
  controlRenderers,
  layoutRenderers,
});
