import type { RendererSet } from '../../types/renderer-set';
import { CheckboxControlRenderer, checkboxTester } from './checkbox-renderer';
import { ComboboxControlRenderer, comboboxTester } from './combobox-renderer';
import { HeadingDisplayRenderer, headingTester } from './heading-renderer';
import { InputControlRenderer, inputTester } from './input-renderer';
import { NumberInputControlRenderer, numberInputTester } from './number-input-renderer';
import { RadioGroupControlRenderer, radioGroupTester } from './radio-group-renderer';
import { SeparatorDisplayRenderer, separatorTester } from './separator-renderer';
import { SwitchControlRenderer, switchTester } from './switch-renderer';
import { TextareaControlRenderer, textareaTester } from './textarea-renderer';

// JSONForms renderers for @repo/ui components (docs 180, 182, 188, 194). Every renderer module exports these four.

export const cells: RendererSet['cells'] = [];

// No element ever ties at the top rank (doc 182 rule 11, doc 188 rule 6): Textarea outranks Input only with
// `options.component: 'textarea'`; Combobox (3) outranks every string and number control for a choice schema, and
// RadioGroup (4) outranks Combobox only with 'radio-group'; Switch outranks Checkbox only with 'switch'.
export const controlRenderers: RendererSet['controlRenderers'] = [
  { tester: inputTester, renderer: InputControlRenderer },
  { tester: textareaTester, renderer: TextareaControlRenderer },
  { tester: numberInputTester, renderer: NumberInputControlRenderer },
  { tester: comboboxTester, renderer: ComboboxControlRenderer },
  { tester: radioGroupTester, renderer: RadioGroupControlRenderer },
  { tester: checkboxTester, renderer: CheckboxControlRenderer },
  { tester: switchTester, renderer: SwitchControlRenderer },
];

export const displayRenderers: RendererSet['displayRenderers'] = [
  { tester: headingTester, renderer: HeadingDisplayRenderer },
  { tester: separatorTester, renderer: SeparatorDisplayRenderer },
];

export const layoutRenderers: RendererSet['layoutRenderers'] = [];
