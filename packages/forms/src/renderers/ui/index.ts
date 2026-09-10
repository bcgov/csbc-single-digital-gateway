import type { RendererSet } from '../../types/renderer-set';
import { HeadingDisplayRenderer, headingTester } from './heading-renderer';

// JSONForms renderers for @repo/ui components (doc 180). Every renderer module exports these four.

export const cells: RendererSet['cells'] = [];

export const controlRenderers: RendererSet['controlRenderers'] = [];

export const displayRenderers: RendererSet['displayRenderers'] = [
  { tester: headingTester, renderer: HeadingDisplayRenderer },
];

export const layoutRenderers: RendererSet['layoutRenderers'] = [];
