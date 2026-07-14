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
  CONTACT_METHOD_TYPES,
  CONTACT_METHOD_META,
  type ContactMethod,
  type ContactMethodType,
  type ContactEntry,
  type ValueEntry,
  type AddressEntry,
} from '../jsonforms-renderers/controls/contact-methods/model';
