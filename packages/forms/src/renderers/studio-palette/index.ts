import type { RendererSet } from '../../types/renderer-set';
import { PaletteEmptyRenderer, paletteEmptyTester } from './palette-empty';
import { PaletteGroupRenderer, paletteGroupTester } from './palette-group';
import { PaletteItemRenderer, paletteItemTester } from './palette-item';
import { PaletteStackRenderer, paletteStackTester } from './palette-stack';
import { SearchControlRenderer, searchTester } from './search-control';

// JSONForms renderers for the Form Studio palette (doc 189 rules 1-11): a search Control, a plain stack, labelled
// groups and draggable items. Every renderer module exports these four; the actions port (palette-actions.ts) and
// the search helpers (palette-search.ts) stay package-internal.

export const cells: RendererSet['cells'] = [];

export const controlRenderers: RendererSet['controlRenderers'] = [
  { tester: searchTester, renderer: SearchControlRenderer },
];

export const displayRenderers: RendererSet['displayRenderers'] = [
  { tester: paletteItemTester, renderer: PaletteItemRenderer },
  { tester: paletteEmptyTester, renderer: PaletteEmptyRenderer },
];

export const layoutRenderers: RendererSet['layoutRenderers'] = [
  { tester: paletteStackTester, renderer: PaletteStackRenderer },
  { tester: paletteGroupTester, renderer: PaletteGroupRenderer },
];
