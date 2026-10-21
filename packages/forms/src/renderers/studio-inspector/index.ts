import type { RendererSet } from '../../types/renderer-set';
import { controlRenderers as uiControlRenderers } from '../ui/index';
import { SectionLayoutRenderer, sectionTester } from './section-layout';
import { StackLayoutRenderer, stackTester } from './stack-layout';

// JSONForms renderers for the Form Studio inspector (doc 187 rules 1-7, doc 188 rule 21): the renderers/ui controls
// and compact section / stack layouts — no gridstack. Every renderer module exports these four.

export const cells: RendererSet['cells'] = [];

// The ui entries by reference and nothing else: inspector booleans ask for the ui Switch through
// `options.component: 'switch'` (doc 188 rule 22), so no inspector-only control can tie with a ui one.
export const controlRenderers: RendererSet['controlRenderers'] = [...uiControlRenderers];

export const displayRenderers: RendererSet['displayRenderers'] = [];

export const layoutRenderers: RendererSet['layoutRenderers'] = [
  { tester: sectionTester, renderer: SectionLayoutRenderer },
  { tester: stackTester, renderer: StackLayoutRenderer },
];
