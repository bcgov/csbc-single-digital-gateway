import type { JsonFormsRendererRegistryEntry } from '@jsonforms/core';
// Layouts are presentation-neutral (they arrange children via JsonFormsDispatch, which resolves
// against whatever registry is active) — so the form layout renderers are reused verbatim here.
import {
  CategorizationLayoutRenderer,
  categorizationTester,
} from '../jsonforms-renderers/layouts/categorization-layout';
import { GridLayoutRenderer, gridLayoutTester } from '../jsonforms-renderers/layouts/grid-layout';
import {
  GroupLayoutRenderer,
  groupLayoutTester,
} from '../jsonforms-renderers/layouts/group-layout';
import {
  HorizontalLayoutRenderer,
  horizontalLayoutTester,
} from '../jsonforms-renderers/layouts/horizontal-layout';
import { LabelRenderer, labelRendererTester } from '../jsonforms-renderers/layouts/label-renderer';
import {
  SectionLayoutRenderer,
  sectionLayoutTester,
} from '../jsonforms-renderers/layouts/section-layout';
import {
  VerticalLayoutRenderer,
  verticalLayoutTester,
} from '../jsonforms-renderers/layouts/vertical-layout';
import {
  EnumDisplay,
  EnumRadioDisplay,
  MultiEnumDisplay,
  OneOfEnumDisplay,
  enumDisplayTester,
  enumRadioDisplayTester,
  multiEnumDisplayTester,
  oneOfEnumDisplayTester,
} from './controls/enum-displays';
import {
  BooleanDisplay,
  BooleanToggleDisplay,
  DateDisplay,
  MultilineDisplay,
  NumberDisplay,
  SliderDisplay,
  TextDisplay,
  booleanDisplayTester,
  booleanToggleDisplayTester,
  dateDisplayTester,
  multilineDisplayTester,
  numberDisplayTester,
  sliderDisplayTester,
  textDisplayTester,
} from './controls/primitive-displays';
import {
  AccordionGroupDisplay,
  accordionGroupDisplayTester,
} from './controls/accordion-group-display';
import { AddressDisplay, addressDisplayTester } from './controls/address-display';
import { ChoiceDisplay, choiceDisplayTester } from './controls/choice-view';
import { DateRangeDisplay, dateRangeDisplayTester } from './controls/date-range-display';
import { DateTimeDisplay, dateTimeDisplayTester } from './controls/datetime-display';
import { TimeDisplay, timeDisplayTester } from './controls/time-display';
import {
  ContactMethodsDisplay,
  contactMethodsDisplayTester,
} from './controls/contact-methods-display';
import { PhoneDisplay, phoneDisplayTester } from './controls/phone-display';
import { RichTextDisplay, richTextDisplayTester } from './controls/rich-text-display';

/**
 * The read-only counterpart to the `@repo/react/jsonforms-renderers` form set: same dispatch
 * (identical testers/ranks), but every control renders its value as presentational content instead
 * of an input. Pass to the host: `<JsonForms renderers={displayRenderers} schema uischema data />`.
 * Layouts are shared with the form set.
 */
export const displayRenderers: JsonFormsRendererRegistryEntry[] = [
  // Controls
  { tester: textDisplayTester, renderer: TextDisplay },
  { tester: numberDisplayTester, renderer: NumberDisplay },
  { tester: booleanDisplayTester, renderer: BooleanDisplay },
  { tester: booleanToggleDisplayTester, renderer: BooleanToggleDisplay },
  { tester: multilineDisplayTester, renderer: MultilineDisplay },
  { tester: enumDisplayTester, renderer: EnumDisplay },
  { tester: enumRadioDisplayTester, renderer: EnumRadioDisplay },
  { tester: oneOfEnumDisplayTester, renderer: OneOfEnumDisplay },
  { tester: multiEnumDisplayTester, renderer: MultiEnumDisplay },
  // Feature 156 (Step 2): the unified choice display (options.format:'choice') outranks the above.
  { tester: choiceDisplayTester, renderer: ChoiceDisplay },
  { tester: sliderDisplayTester, renderer: SliderDisplay },
  { tester: dateDisplayTester, renderer: DateDisplay },
  { tester: dateRangeDisplayTester, renderer: DateRangeDisplay },
  { tester: timeDisplayTester, renderer: TimeDisplay },
  { tester: dateTimeDisplayTester, renderer: DateTimeDisplay },
  { tester: richTextDisplayTester, renderer: RichTextDisplay },
  { tester: phoneDisplayTester, renderer: PhoneDisplay },
  { tester: contactMethodsDisplayTester, renderer: ContactMethodsDisplay },
  { tester: addressDisplayTester, renderer: AddressDisplay },
  // Feature 171: the read-only accordion group.
  { tester: accordionGroupDisplayTester, renderer: AccordionGroupDisplay },
  // Layouts (reused from the form renderer set)
  { tester: verticalLayoutTester, renderer: VerticalLayoutRenderer },
  { tester: horizontalLayoutTester, renderer: HorizontalLayoutRenderer },
  { tester: gridLayoutTester, renderer: GridLayoutRenderer },
  { tester: groupLayoutTester, renderer: GroupLayoutRenderer },
  // Feature 172: a fieldset+legend band of related fields.
  { tester: sectionLayoutTester, renderer: SectionLayoutRenderer },
  { tester: categorizationTester, renderer: CategorizationLayoutRenderer },
  { tester: labelRendererTester, renderer: LabelRenderer },
];
