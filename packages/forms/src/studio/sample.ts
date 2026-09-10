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

const greeting: HeadingElement = {
  type: 'Heading',
  text: 'Hello, FormStudio!',
  options: { level: 1, gridItem: { w: 12 } },
};

const name: InputControlElement = {
  type: 'Control',
  scope: '#/properties/name',
  options: { placeholder: 'Jane Doe', gridItem: { w: 12 } },
};

const about: TextareaControlElement = {
  type: 'Control',
  scope: '#/properties/about',
  options: { component: 'textarea', placeholder: 'A sentence or two', gridItem: { w: 12 } },
};

const quantity: NumberInputControlElement = {
  type: 'Control',
  scope: '#/properties/quantity',
  options: { component: 'number', step: 5, gridItem: { w: 6 } },
};

const budget: NumberInputControlElement = {
  type: 'Control',
  scope: '#/properties/budget',
  options: {
    format: { style: 'currency', currency: 'CAD' },
    locale: 'en-CA',
    gridItem: { w: 6 },
  },
};

export const STUDIO_SAMPLE_UISCHEMA: GridElement = {
  type: 'Grid',
  elements: [greeting, name, about, quantity, budget],
};

export const STUDIO_SAMPLE_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', maxLength: 80 },
    about: { type: 'string', description: 'Shown on your public profile.', maxLength: 500 },
    quantity: { type: 'number', minimum: 0, maximum: 100 },
    budget: { type: 'number', minimum: 0 },
  },
};

export const STUDIO_SAMPLE_DATA = {};
