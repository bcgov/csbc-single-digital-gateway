import type { JsonFormsRendererRegistryEntry } from '@jsonforms/core';
// Layouts are presentation-neutral (they arrange children via JsonFormsDispatch, which resolves
// against whatever registry is active) — so the form layout renderers are reused verbatim here.
import {
  CategorizationLayoutRenderer,
  categorizationTester,
} from '../jsonforms-renderers/layouts/categorization-layout';
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
  { tester: sliderDisplayTester, renderer: SliderDisplay },
  { tester: dateDisplayTester, renderer: DateDisplay },
  { tester: richTextDisplayTester, renderer: RichTextDisplay },
  // Layouts (reused from the form renderer set)
  { tester: verticalLayoutTester, renderer: VerticalLayoutRenderer },
  { tester: horizontalLayoutTester, renderer: HorizontalLayoutRenderer },
  { tester: groupLayoutTester, renderer: GroupLayoutRenderer },
  { tester: categorizationTester, renderer: CategorizationLayoutRenderer },
  { tester: labelRendererTester, renderer: LabelRenderer },
];
