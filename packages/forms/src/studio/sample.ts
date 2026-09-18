import type { JsonSchema } from '@jsonforms/core';
import type {
  CheckboxControlElement,
  ComboboxControlElement,
  FormElement,
  GridElement,
  HeadingElement,
  HorizontalLayoutElement,
  InputControlElement,
  MultiComboboxControlElement,
  NumberInputControlElement,
  RadioGroupControlElement,
  SwitchControlElement,
  TextareaControlElement,
  VerticalLayoutElement,
} from '../types/elements';

// The built-in form FormStudio renders until the studio can load real forms (doc 180 rule 18,
// doc 182 rule 24, doc 188 rule 32). No field is required, so the sample does not open with validation errors.
//
// Data properties are keyed like the ones the studio creates — nanoid(8) — but with fixed literals so
// the sample is deterministic; each property's `title` is the field's label (doc 185 rule 28).
const NAME = 'Vd3kQ9xL';
const ABOUT = 'pR7nW2cM';
const QUANTITY = 'h4TzB8yE';
const BUDGET = 'Kq6sJ1uA';
const TEAM_SIZE = 'Ws4nC7pQ';
const EMAIL = 'Tn5wQ2rK';
const PHONE = 'c8LpV4hZ';
const BEST_TIME = 'Ye3mD7sG';
const CONTACT_METHOD = 'Gk2vR8tJ';
const SUPPORTS = 'Jw8sE4nB';
const CITY = 'mX9fL3oD';
const POSTAL_CODE = 'Zb2gN7wS';
const PROVINCE = 'uB6hY3eM';
const PRODUCT_NEWS = 'Rf9aX2jN';
const DELIVERY_TEXTS = 'Lq7cP5dT';

const greeting: HeadingElement = {
  type: 'Heading',
  text: 'Hello, FormStudio!',
  options: { level: 1 },
};

const name: InputControlElement = {
  type: 'Control',
  scope: `#/properties/${NAME}`,
  options: { placeholder: 'Jane Doe' },
};

const about: TextareaControlElement = {
  type: 'Control',
  scope: `#/properties/${ABOUT}`,
  options: { component: 'textarea', placeholder: 'A sentence or two' },
};

const quantity: NumberInputControlElement = {
  type: 'Control',
  scope: `#/properties/${QUANTITY}`,
  options: { component: 'number', step: 5 },
};

const budget: NumberInputControlElement = {
  type: 'Control',
  scope: `#/properties/${BUDGET}`,
  options: {
    format: { style: 'currency', currency: 'CAD' },
    locale: 'en-CA',
  },
};

// A number oneOf renders as a Combobox by default (doc 188 rule 4).
const teamSize: ComboboxControlElement = {
  type: 'Control',
  scope: `#/properties/${TEAM_SIZE}`,
  options: { placeholder: 'Choose a size' },
};

const contactHeading: HeadingElement = {
  type: 'Heading',
  text: 'Contact',
  options: { level: 2, size: 4 },
};

const email: InputControlElement = {
  type: 'Control',
  scope: `#/properties/${EMAIL}`,
  options: { placeholder: 'jane@example.com', gridItem: { w: 2 } },
};

const phone: InputControlElement = {
  type: 'Control',
  scope: `#/properties/${PHONE}`,
  options: { placeholder: '250 555 0100' },
};

// A HorizontalLayout (doc 180 rules 27-28) with one free column, so a field can be widened or copied.
const contactRow: HorizontalLayoutElement = {
  type: 'HorizontalLayout',
  options: { columns: 4 },
  elements: [email, phone],
};

const bestTime: InputControlElement = {
  type: 'Control',
  scope: `#/properties/${BEST_TIME}`,
  options: { placeholder: 'Weekday mornings' },
};

const contactMethod: RadioGroupControlElement = {
  type: 'Control',
  scope: `#/properties/${CONTACT_METHOD}`,
  options: { component: 'radio-group' },
};

// Doc 205 rules 40-41: a multi-choice field, shown in its DEFAULT presentation — the chips combobox.
const supports: MultiComboboxControlElement = {
  type: 'Control',
  scope: `#/properties/${SUPPORTS}`,
  options: { placeholder: 'Choose any that apply' },
};

// A VerticalLayout nested in the root Form (doc 180 rules 25-26): its children stack in order, the row among them.
const contact: VerticalLayoutElement = {
  type: 'VerticalLayout',
  elements: [contactHeading, contactRow, bestTime, contactMethod, supports],
};

const deliveryHeading: HeadingElement = {
  type: 'Heading',
  text: 'Delivery address',
  options: { level: 2, size: 4, gridItem: { w: 12 } },
};

const city: InputControlElement = {
  type: 'Control',
  scope: `#/properties/${CITY}`,
  options: { placeholder: 'Victoria', gridItem: { w: 8 } },
};

const postalCode: InputControlElement = {
  type: 'Control',
  scope: `#/properties/${POSTAL_CODE}`,
  options: { placeholder: 'V8W 1A1', gridItem: { w: 4 } },
};

const province: ComboboxControlElement = {
  type: 'Control',
  scope: `#/properties/${PROVINCE}`,
  options: { component: 'combobox', placeholder: 'Choose a province', gridItem: { w: 6 } },
};

// A Grid inside the root Form: its own heading and side-by-side fields, laid out on its own 12 columns.
// Elements are named consts, not inline literals — inline, `elements: UISchemaElement[]` rejects
// element-specific keys like `text` as excess properties.
const delivery: GridElement = {
  type: 'Grid',
  elements: [deliveryHeading, city, postalCode, province],
};

const productNews: CheckboxControlElement = {
  type: 'Control',
  scope: `#/properties/${PRODUCT_NEWS}`,
};

const deliveryTexts: SwitchControlElement = {
  type: 'Control',
  scope: `#/properties/${DELIVERY_TEXTS}`,
  options: { component: 'switch' },
};

// The root is a Form (doc 192 rule 8, amending doc 182 rule 24c): it renders like a VerticalLayout, so its
// children stack in order and none carries a `gridItem` — only the Delivery Grid's children are placed.
// Doc 201 rule 17: every document the studio seeds arrives titled, so the sample satisfies the metaschema's
// required `label` (rule 15).
export const STUDIO_SAMPLE_UISCHEMA: FormElement = {
  type: 'Form',
  label: 'Untitled form',
  elements: [
    greeting,
    name,
    about,
    quantity,
    budget,
    teamSize,
    contact,
    delivery,
    productNews,
    deliveryTexts,
  ],
};

const PROVINCES: readonly [code: string, name: string][] = [
  ['AB', 'Alberta'],
  ['BC', 'British Columbia'],
  ['MB', 'Manitoba'],
  ['NB', 'New Brunswick'],
  ['NL', 'Newfoundland and Labrador'],
  ['NS', 'Nova Scotia'],
  ['NT', 'Northwest Territories'],
  ['NU', 'Nunavut'],
  ['ON', 'Ontario'],
  ['PE', 'Prince Edward Island'],
  ['QC', 'Quebec'],
  ['SK', 'Saskatchewan'],
  ['YT', 'Yukon'],
];

export const STUDIO_SAMPLE_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    [NAME]: { type: 'string', title: 'Name', maxLength: 80 },
    [ABOUT]: {
      type: 'string',
      title: 'About',
      description: 'Shown on your public profile.',
      maxLength: 500,
    },
    [QUANTITY]: { type: 'number', title: 'Quantity', minimum: 0, maximum: 100 },
    [BUDGET]: { type: 'number', title: 'Budget', minimum: 0 },
    [TEAM_SIZE]: {
      type: 'number',
      title: 'Team size',
      oneOf: [
        { const: 1, title: 'Just me' },
        { const: 10, title: '2–10 people' },
        { const: 50, title: '11–50 people' },
        { const: 100, title: '51+ people' },
      ],
    },
    [EMAIL]: { type: 'string', title: 'Email', maxLength: 120 },
    [PHONE]: { type: 'string', title: 'Phone', maxLength: 20 },
    [BEST_TIME]: { type: 'string', title: 'Best time to call', maxLength: 60 },
    [CONTACT_METHOD]: {
      type: 'string',
      title: 'Preferred contact method',
      oneOf: [
        { const: 'email', title: 'Email' },
        { const: 'phone', title: 'Phone' },
        { const: 'mail', title: 'Mail' },
      ],
    },
    [SUPPORTS]: {
      type: 'array',
      title: 'Supports needed',
      uniqueItems: true,
      items: {
        oneOf: [
          { const: 'wheelchair', title: 'Wheelchair access', description: 'Step-free entry' },
          { const: 'interpreter', title: 'Interpreter' },
          { const: 'large-print', title: 'Large print' },
        ],
      },
    },
    [CITY]: { type: 'string', title: 'City', maxLength: 60 },
    [POSTAL_CODE]: { type: 'string', title: 'Postal Code', maxLength: 7 },
    [PROVINCE]: {
      type: 'string',
      title: 'Province',
      oneOf: PROVINCES.map(([code, title]) => ({ const: code, title })),
    },
    [PRODUCT_NEWS]: {
      type: 'boolean',
      title: 'Email me product news',
      description: 'About once a month.',
    },
    [DELIVERY_TEXTS]: { type: 'boolean', title: 'Text me delivery updates' },
  },
};

export const STUDIO_SAMPLE_DATA = {};
