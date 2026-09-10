import type { RendererSet } from '../../types/renderer-set';
import { HeadingDisplayRenderer, headingTester } from './heading-renderer';
import { InputControlRenderer, inputTester } from './input-renderer';
import { NumberInputControlRenderer, numberInputTester } from './number-input-renderer';
import { TextareaControlRenderer, textareaTester } from './textarea-renderer';

// JSONForms renderers for @repo/ui components (docs 180, 182). Every renderer module exports these four.

export const cells: RendererSet['cells'] = [];

// Input and Textarea both match string controls; Textarea outranks Input only when
// `options.component` is 'textarea', so no element ever ties at the top rank (doc 182 rule 11).
export const controlRenderers: RendererSet['controlRenderers'] = [
  { tester: inputTester, renderer: InputControlRenderer },
  { tester: textareaTester, renderer: TextareaControlRenderer },
  { tester: numberInputTester, renderer: NumberInputControlRenderer },
];

export const displayRenderers: RendererSet['displayRenderers'] = [
  { tester: headingTester, renderer: HeadingDisplayRenderer },
];

export const layoutRenderers: RendererSet['layoutRenderers'] = [];
