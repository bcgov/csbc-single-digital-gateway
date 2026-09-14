import type { JsonSchema } from '@jsonforms/core';
import type {
  GridElement,
  HeadingElement,
  InputControlElement,
  NumberInputControlElement,
  TextareaControlElement,
} from '../types/elements';

// The built-in form FormStudio renders until the studio can load real forms (doc 180 rule 18,
// doc 182 rule 24). No field is required, so the sample does not open with validation errors.
//
// Data properties are keyed like the ones the studio creates — nanoid(8) — but with fixed literals so
// the sample is deterministic; each property's `title` is the field's label (doc 185 rule 28).
const NAME = 'Vd3kQ9xL';
const ABOUT = 'pR7nW2cM';
const QUANTITY = 'h4TzB8yE';
const BUDGET = 'Kq6sJ1uA';
const CITY = 'mX9fL3oD';
const POSTAL_CODE = 'Zb2gN7wS';

const greeting: HeadingElement = {
  type: 'Heading',
  text: 'Hello, FormStudio!',
  options: { level: 1, gridItem: { w: 12 } },
};

const name: InputControlElement = {
  type: 'Control',
  scope: `#/properties/${NAME}`,
  options: { placeholder: 'Jane Doe', gridItem: { w: 12 } },
};

const about: TextareaControlElement = {
  type: 'Control',
  scope: `#/properties/${ABOUT}`,
  options: { component: 'textarea', placeholder: 'A sentence or two', gridItem: { w: 12 } },
};

const quantity: NumberInputControlElement = {
  type: 'Control',
  scope: `#/properties/${QUANTITY}`,
  options: { component: 'number', step: 5, gridItem: { w: 6 } },
};

const budget: NumberInputControlElement = {
  type: 'Control',
  scope: `#/properties/${BUDGET}`,
  options: {
    format: { style: 'currency', currency: 'CAD' },
    locale: 'en-CA',
    gridItem: { w: 6 },
  },
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

// A Grid inside a Grid item: its own heading and side-by-side fields, laid out on its own 12 columns.
// Elements are named consts, not inline literals — inline, `elements: UISchemaElement[]` rejects
// element-specific keys like `text` as excess properties.
const delivery: GridElement = {
  type: 'Grid',
  options: { gridItem: { w: 12 } },
  elements: [deliveryHeading, city, postalCode],
};

export const STUDIO_SAMPLE_UISCHEMA: GridElement = {
  type: 'Grid',
  elements: [greeting, name, about, quantity, budget, delivery],
};

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
    [CITY]: { type: 'string', title: 'City', maxLength: 60 },
    [POSTAL_CODE]: { type: 'string', title: 'Postal Code', maxLength: 7 },
  },
};

export const STUDIO_SAMPLE_DATA = {};
