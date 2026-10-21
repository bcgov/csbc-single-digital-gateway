import type { RendererSet } from '../../types/renderer-set';
import { CheckboxControlRenderer, checkboxTester } from './checkbox-renderer';
import { CheckboxGroupControlRenderer, checkboxGroupTester } from './checkbox-group-renderer';
import { ComboboxControlRenderer, comboboxTester } from './combobox-renderer';
import { HeadingDisplayRenderer, headingTester } from './heading-renderer';
import { InputControlRenderer, inputTester } from './input-renderer';
import { MultiComboboxControlRenderer, multiComboboxTester } from './multi-combobox-renderer';
import { NumberInputControlRenderer, numberInputTester } from './number-input-renderer';
import { RadioGroupControlRenderer, radioGroupTester } from './radio-group-renderer';
import { RichContentDisplayRenderer, richContentTester } from './rich-content-renderer';
import { RichTextControlRenderer, richTextTester } from './rich-text-renderer';
import { SeparatorDisplayRenderer, separatorTester } from './separator-renderer';
import { SwitchControlRenderer, switchTester } from './switch-renderer';
import { TextareaControlRenderer, textareaTester } from './textarea-renderer';

// JSONForms renderers for @repo/ui components (docs 180, 182, 188, 194). Every renderer module exports these four.

export const cells: RendererSet['cells'] = [];

// No element ever ties at the top rank (doc 182 rule 11, doc 188 rule 6): Textarea outranks Input only with
// `options.component: 'textarea'`; Combobox (3) outranks every string and number control for a choice schema, and
// RadioGroup (4) outranks Combobox only with 'radio-group'; Switch outranks Checkbox only with 'switch'.
//
// Doc 205 rules 5-7: the two multi-choice entries are APPENDED, never inserted — `integer-control.test.tsx`
// reaches the number entry by position. They sit at 5 and 6 over their own disjoint tester: nothing ties today,
// but reusing 3 and 4 would tie the moment either predicate widened.
export const controlRenderers: RendererSet['controlRenderers'] = [
  { tester: inputTester, renderer: InputControlRenderer },
  { tester: textareaTester, renderer: TextareaControlRenderer },
  { tester: numberInputTester, renderer: NumberInputControlRenderer },
  { tester: comboboxTester, renderer: ComboboxControlRenderer },
  { tester: radioGroupTester, renderer: RadioGroupControlRenderer },
  { tester: checkboxTester, renderer: CheckboxControlRenderer },
  { tester: switchTester, renderer: SwitchControlRenderer },
  { tester: multiComboboxTester, renderer: MultiComboboxControlRenderer },
  { tester: checkboxGroupTester, renderer: CheckboxGroupControlRenderer },
  // Doc 207 rule 6: appended for the same reason the multi-choice pair was. It ties with nothing —
  // `isStringControl` cannot match an object property — so rank 7 is free of contention entirely.
  { tester: richTextTester, renderer: RichTextControlRenderer },
];

export const displayRenderers: RendererSet['displayRenderers'] = [
  { tester: headingTester, renderer: HeadingDisplayRenderer },
  { tester: separatorTester, renderer: SeparatorDisplayRenderer },
  // Doc 207 rule 18: rank 1 like the others — display testers match distinct types, so none contend.
  { tester: richContentTester, renderer: RichContentDisplayRenderer },
];

export const layoutRenderers: RendererSet['layoutRenderers'] = [];
