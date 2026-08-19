// Public API for @repo/react/jsonforms-renderers-display — read-only "display" renderers that show
// a JSON-Schema document's values as presentational content (the counterpart to jsonforms-renderers).
export { displayRenderers } from './display-renderers';

// Shared read-only field wrapper, for composing custom display renderers.
export { DisplayField, EmptyValue } from './util/display-field';

// Individual display renderers + their testers.
export {
  TextDisplay,
  textDisplayTester,
  MultilineDisplay,
  multilineDisplayTester,
  NumberDisplay,
  numberDisplayTester,
  SliderDisplay,
  sliderDisplayTester,
  BooleanDisplay,
  booleanDisplayTester,
  BooleanToggleDisplay,
  booleanToggleDisplayTester,
  DateDisplay,
  dateDisplayTester,
} from './controls/primitive-displays';
export {
  EnumDisplay,
  enumDisplayTester,
  EnumRadioDisplay,
  enumRadioDisplayTester,
  OneOfEnumDisplay,
  oneOfEnumDisplayTester,
  MultiEnumDisplay,
  multiEnumDisplayTester,
} from './controls/enum-displays';
export { RichTextDisplay, richTextDisplayTester } from './controls/rich-text-display';
export {
  ContactMethodsDisplay,
  contactMethodsDisplayTester,
} from './controls/contact-methods-display';

// The "list of cards" view for a service's contact methods (feature 130). Exported so apps can
// render contact methods outside a JsonForms dispatch (e.g. the citizen portal's Contact section).
export { ContactMethodsView } from './controls/contact-methods-view';
export {
  normalizeContactMethods,
  methodDetailLines,
  CONTACT_METHOD_TYPES,
  CONTACT_METHOD_META,
  type ContactMethod,
  type ContactMethodType,
} from '../jsonforms-renderers/controls/contact-methods/model';

// The read-only address view (feature 153). Exported so apps can render an address outside a
// JsonForms dispatch (e.g. a citizen portal review section), mirroring ContactMethodsView.
export { AddressView } from './controls/address-view';
export {
  normalizeAddress,
  emptyAddress,
  addressDisplayLines,
  isAddressEmpty,
  ADDRESS_FIELD_KEYS,
  type AddressValue,
  type AddressFieldKey,
} from '../jsonforms-renderers/controls/address/model';

// The read-only accordion group (feature 171). `AccordionGroupView` is exported so apps can render
// the value outside a JsonForms dispatch, mirroring ContactMethodsView / AddressView.
export {
  AccordionGroupDisplay,
  accordionGroupDisplayTester,
} from './controls/accordion-group-display';
export { AccordionGroupView, type AccordionGroupViewProps } from './controls/accordion-group-view';
export {
  normalizeAccordionItems,
  resolveDefaultOpen,
  type AccordionItem,
  type AccordionDefaultOpen,
} from '../jsonforms-renderers/controls/accordion-group/model';
