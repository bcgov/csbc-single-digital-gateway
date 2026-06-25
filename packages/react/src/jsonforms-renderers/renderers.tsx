import type { JsonFormsRendererRegistryEntry } from '@jsonforms/core';
import { BooleanControl, booleanControlTester } from './controls/boolean-control';
import {
  BooleanToggleControl,
  booleanToggleControlTester,
} from './controls/boolean-toggle-control';
import { DateControl, dateControlTester } from './controls/date-control';
import { EnumControl, enumControlTester } from './controls/enum-control';
import { EnumRadioControl, enumRadioControlTester } from './controls/enum-radio-control';
import { MultiEnumControl, multiEnumControlTester } from './controls/multi-enum-control';
import { MultilineControl, multilineControlTester } from './controls/multiline-control';
import { NumberControl, numberControlTester } from './controls/number-control';
import { OneOfEnumControl, oneOfEnumControlTester } from './controls/oneof-enum-control';
import { RichTextControl, richTextControlTester } from './controls/rich-text-control';
import { SliderControl, sliderControlTester } from './controls/slider-control';
import { TextControl, textControlTester } from './controls/text-control';
import {
  CategorizationLayoutRenderer,
  categorizationTester,
} from './layouts/categorization-layout';
import { GroupLayoutRenderer, groupLayoutTester } from './layouts/group-layout';
import { HorizontalLayoutRenderer, horizontalLayoutTester } from './layouts/horizontal-layout';
import { LabelRenderer, labelRendererTester } from './layouts/label-renderer';
import { VerticalLayoutRenderer, verticalLayoutTester } from './layouts/vertical-layout';

/**
 * The complete @repo/ui renderer registry — pass to `<JsonForms renderers={renderers} />`
 * (or rely on the `@repo/react/jsonforms` wrapper, which defaults to this set). Higher
 * ranks win dispatch, so the specific controls (multiline, radio, toggle, slider, date,
 * multi-enum) outrank their generic counterparts.
 */
export const renderers: JsonFormsRendererRegistryEntry[] = [
  // Controls
  { tester: textControlTester, renderer: TextControl },
  { tester: numberControlTester, renderer: NumberControl },
  { tester: booleanControlTester, renderer: BooleanControl },
  { tester: booleanToggleControlTester, renderer: BooleanToggleControl },
  { tester: multilineControlTester, renderer: MultilineControl },
  { tester: enumControlTester, renderer: EnumControl },
  { tester: enumRadioControlTester, renderer: EnumRadioControl },
  { tester: oneOfEnumControlTester, renderer: OneOfEnumControl },
  { tester: multiEnumControlTester, renderer: MultiEnumControl },
  { tester: sliderControlTester, renderer: SliderControl },
  { tester: dateControlTester, renderer: DateControl },
  { tester: richTextControlTester, renderer: RichTextControl },
  // Layouts
  { tester: verticalLayoutTester, renderer: VerticalLayoutRenderer },
  { tester: horizontalLayoutTester, renderer: HorizontalLayoutRenderer },
  { tester: groupLayoutTester, renderer: GroupLayoutRenderer },
  { tester: categorizationTester, renderer: CategorizationLayoutRenderer },
  { tester: labelRendererTester, renderer: LabelRenderer },
];
