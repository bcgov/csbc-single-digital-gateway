// Public API for @repo/react/jsonforms-renderers.
export { renderers } from './renderers';

// Shared wrapper (Field/FieldLabel/FieldError) — exported for custom renderers.
export { ControlWrapper } from './util/control-wrapper';
export type { ControlWrapperProps } from './util/control-wrapper';

// Individual renderers + their testers, for composing a custom registry.
export { TextControl, textControlTester } from './controls/text-control';
export { NumberControl, numberControlTester } from './controls/number-control';
export { BooleanControl, booleanControlTester } from './controls/boolean-control';
export {
  BooleanToggleControl,
  booleanToggleControlTester,
} from './controls/boolean-toggle-control';
export { MultilineControl, multilineControlTester } from './controls/multiline-control';
export { EnumControl, enumControlTester } from './controls/enum-control';
export { EnumRadioControl, enumRadioControlTester } from './controls/enum-radio-control';
export { OneOfEnumControl, oneOfEnumControlTester } from './controls/oneof-enum-control';
export { MultiEnumControl, multiEnumControlTester } from './controls/multi-enum-control';
export { SliderControl, sliderControlTester } from './controls/slider-control';
export { DateControl, dateControlTester } from './controls/date-control';
export { VerticalLayoutRenderer, verticalLayoutTester } from './layouts/vertical-layout';
export { HorizontalLayoutRenderer, horizontalLayoutTester } from './layouts/horizontal-layout';
export { GroupLayoutRenderer, groupLayoutTester } from './layouts/group-layout';
export {
  CategorizationLayoutRenderer,
  categorizationTester,
} from './layouts/categorization-layout';
export { LabelRenderer, labelRendererTester } from './layouts/label-renderer';
