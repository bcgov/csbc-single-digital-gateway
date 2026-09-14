import type { RendererSet } from '../../types/renderer-set';
import { controlRenderers as uiControlRenderers } from '../ui/index';
import { SectionLayoutRenderer, sectionTester } from './section-layout';
import { StackLayoutRenderer, stackTester } from './stack-layout';
import { SwitchControlRenderer, switchTester } from './switch-renderer';

// JSONForms renderers for the Form Studio inspector (doc 187 rules 1-7): the renderers/ui controls, a
// Switch for booleans, and compact section / stack layouts — no gridstack. Every renderer module exports
// these four.

export const cells: RendererSet['cells'] = [];

// The ui entries are reused by reference; Switch matches only booleans, so nothing ties at the top rank.
export const controlRenderers: RendererSet['controlRenderers'] = [
  ...uiControlRenderers,
  { tester: switchTester, renderer: SwitchControlRenderer },
];

export const displayRenderers: RendererSet['displayRenderers'] = [];

export const layoutRenderers: RendererSet['layoutRenderers'] = [
  { tester: sectionTester, renderer: SectionLayoutRenderer },
  { tester: stackTester, renderer: StackLayoutRenderer },
];
