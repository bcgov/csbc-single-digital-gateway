import type { JsonFormsRendererRegistryEntry } from '@jsonforms/core';
import {
  AccordionGroupControl,
  accordionGroupControlTester,
} from './controls/accordion-group/accordion-group-control';
import { AddressControl, addressControlTester } from './controls/address/address-control';
import { BooleanControl, booleanControlTester } from './controls/boolean-control';
import {
  ContactMethodsControl,
  contactMethodsControlTester,
} from './controls/contact-methods/contact-methods-control';
import {
  BooleanToggleControl,
  booleanToggleControlTester,
} from './controls/boolean-toggle-control';
import { ChoiceControl, choiceControlTester } from './controls/choice/choice-control';
import { DateControl, dateControlTester } from './controls/date-control';
import { DateRangeControl, dateRangeControlTester } from './controls/date-range-control';
import { DateTimeControl, dateTimeControlTester } from './controls/datetime-control';
import { EnumControl, enumControlTester } from './controls/enum-control';
import { EnumRadioControl, enumRadioControlTester } from './controls/enum-radio-control';
import { MultiEnumControl, multiEnumControlTester } from './controls/multi-enum-control';
import { NumberControl, numberControlTester } from './controls/number-control';
import { OneOfEnumControl, oneOfEnumControlTester } from './controls/oneof-enum-control';
import { PhoneControl, phoneControlTester } from './controls/phone-control';
import { RichTextControl, richTextControlTester } from './controls/rich-text-control';
import { SliderControl, sliderControlTester } from './controls/slider-control';
import { TextControl, textControlTester } from './controls/text-control';
import { TimeControl, timeControlTester } from './controls/time-control';
import {
  CategorizationLayoutRenderer,
  categorizationTester,
} from './layouts/categorization-layout';
import { GridLayoutRenderer, gridLayoutTester } from './layouts/grid-layout';
import { GroupLayoutRenderer, groupLayoutTester } from './layouts/group-layout';
import { HorizontalLayoutRenderer, horizontalLayoutTester } from './layouts/horizontal-layout';
import { LabelRenderer, labelRendererTester } from './layouts/label-renderer';
import { SectionLayoutRenderer, sectionLayoutTester } from './layouts/section-layout';
import { VerticalLayoutRenderer, verticalLayoutTester } from './layouts/vertical-layout';

/**
 * The complete @repo/ui renderer registry — pass to `<JsonForms renderers={renderers} />`
 * (or rely on the `@repo/react/jsonforms` wrapper, which defaults to this set). Higher
 * ranks win dispatch, so the specific controls (radio, toggle, slider, date, multi-enum) outrank
 * their generic counterparts. The single text control (feature 158) branches Input/Textarea internally.
 */
export const renderers: JsonFormsRendererRegistryEntry[] = [
  // Controls
  { tester: textControlTester, renderer: TextControl },
  { tester: numberControlTester, renderer: NumberControl },
  { tester: booleanControlTester, renderer: BooleanControl },
  { tester: booleanToggleControlTester, renderer: BooleanToggleControl },
  { tester: enumControlTester, renderer: EnumControl },
  { tester: enumRadioControlTester, renderer: EnumRadioControl },
  { tester: oneOfEnumControlTester, renderer: OneOfEnumControl },
  { tester: multiEnumControlTester, renderer: MultiEnumControl },
  // Feature 156 (Step 2): the unified choice control (options.format:'choice') outranks the above.
  { tester: choiceControlTester, renderer: ChoiceControl },
  { tester: sliderControlTester, renderer: SliderControl },
  { tester: dateControlTester, renderer: DateControl },
  { tester: dateRangeControlTester, renderer: DateRangeControl },
  { tester: timeControlTester, renderer: TimeControl },
  { tester: dateTimeControlTester, renderer: DateTimeControl },
  { tester: richTextControlTester, renderer: RichTextControl },
  { tester: phoneControlTester, renderer: PhoneControl },
  { tester: contactMethodsControlTester, renderer: ContactMethodsControl },
  { tester: addressControlTester, renderer: AddressControl },
  // Feature 171: repeatable accordion items (title + rich-text description).
  { tester: accordionGroupControlTester, renderer: AccordionGroupControl },
  // Layouts
  { tester: verticalLayoutTester, renderer: VerticalLayoutRenderer },
  { tester: horizontalLayoutTester, renderer: HorizontalLayoutRenderer },
  { tester: gridLayoutTester, renderer: GridLayoutRenderer },
  { tester: groupLayoutTester, renderer: GroupLayoutRenderer },
  // Feature 172: a fieldset+legend band of related fields.
  { tester: sectionLayoutTester, renderer: SectionLayoutRenderer },
  { tester: categorizationTester, renderer: CategorizationLayoutRenderer },
  { tester: labelRendererTester, renderer: LabelRenderer },
];
