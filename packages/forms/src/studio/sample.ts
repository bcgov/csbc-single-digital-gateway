import type { JsonSchema } from '@jsonforms/core';
import type { GridElement, HeadingElement } from '../types/elements';

// The built-in form FormStudio renders until the studio can load real forms (doc 180 rule 18).

const greeting: HeadingElement = {
  type: 'Heading',
  text: 'Hello, FormStudio!',
  options: { level: 1, gridItem: { w: 12 } },
};

export const STUDIO_SAMPLE_UISCHEMA: GridElement = {
  type: 'Grid',
  elements: [greeting],
};

export const STUDIO_SAMPLE_SCHEMA: JsonSchema = { type: 'object', properties: {} };

export const STUDIO_SAMPLE_DATA = {};
