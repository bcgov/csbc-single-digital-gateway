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
export { EnumControl, enumControlTester } from './controls/enum-control';
export { EnumRadioControl, enumRadioControlTester } from './controls/enum-radio-control';
export { OneOfEnumControl, oneOfEnumControlTester } from './controls/oneof-enum-control';
export { MultiEnumControl, multiEnumControlTester } from './controls/multi-enum-control';
export { SliderControl, sliderControlTester } from './controls/slider-control';
export { DateControl, dateControlTester } from './controls/date-control';
export { RichTextControl, richTextControlTester } from './controls/rich-text-control';
export { AddressControl, addressControlTester } from './controls/address/address-control';
// Accordion group field (feature 171): a repeatable list of title + rich-text-description items.
export {
  AccordionGroupControl,
  accordionGroupControlTester,
} from './controls/accordion-group/accordion-group-control';
export {
  normalizeAccordionItems,
  emptyAccordionItem,
  resolveDefaultOpen,
  itemNoun,
  addItemText,
  emptyStateText,
  isAccordionDefaultOpen,
  ACCORDION_DEFAULT_OPEN_VALUES,
  type AccordionItem,
  type AccordionDefaultOpen,
} from './controls/accordion-group/model';
// Address field geo-data injection (feature 153): the app wraps its form host in `GeoDataProvider`
// and supplies country/state data hooks so the address control can filter states by country.
export { GeoDataProvider, useGeo } from './controls/address/geo-context';
export type {
  GeoData,
  GeoCountryOption,
  GeoStateOption,
  GeoQueryResult,
  AddressSuggestion,
  AddressSearchRegion,
  AddressSearchParams,
} from './controls/address/geo-context';
export {
  addressLabelsForIso2,
  DEFAULT_ADDRESS_LABELS,
  type AddressLabels,
} from './controls/address/labels';
export { VerticalLayoutRenderer, verticalLayoutTester } from './layouts/vertical-layout';
export { HorizontalLayoutRenderer, horizontalLayoutTester } from './layouts/horizontal-layout';
export { GroupLayoutRenderer, groupLayoutTester } from './layouts/group-layout';
export { SectionLayoutRenderer, sectionLayoutTester } from './layouts/section-layout';
export {
  CategorizationLayoutRenderer,
  categorizationTester,
} from './layouts/categorization-layout';
// Categorization "flow" variant (feature 176): a step rail + windowed content + pinned save bar,
// opted into with `options.variant: 'flow'`. The app wraps its form host in `FlowActionProvider` to
// supply Save & next / Save & exit — no provider → the bar is navigation-only and never throws.
export {
  CategorizationFlowLayoutRenderer,
  categorizationFlowTester,
} from './layouts/flow/categorization-flow-layout';
export {
  FlowActionProvider,
  useFlowActions,
  type FlowActions,
} from './layouts/flow/flow-actions-context';
// Feature 177: a host that wants the current step in the URL mounts `FlowStepProvider` and drives it
// — no provider → the layout keeps its own local step state, exactly as before.
export {
  FlowStepProvider,
  useFlowStep,
  type FlowStepControl,
} from './layouts/flow/flow-step-context';
export {
  categoriesOf,
  isFlowVariant,
  resolveStepIndex,
  stepStatuses,
  FLOW_VARIANT,
  type FlowStep,
  type FlowStepStatus,
} from './layouts/flow/model';
export { LabelRenderer, labelRendererTester } from './layouts/label-renderer';
// Windowed section editing (feature 175): the app wraps its read-only surface in
// `EditActionProvider` and returns an affordance per section marked `options.edit` in the uischema.
// No provider → the layouts render exactly as before. Pair with `@repo/react/uischema-edit`, whose
// `stampEditIds` resolves the section ids the renderers read.
export {
  EditActionProvider,
  useEditActions,
  useEditAction,
  type EditActions,
  type EditActionSection,
} from './layouts/edit-actions-context';
