import { describe, expect, it } from 'vitest';
import {
  definitionForKind,
  documentKindSchema,
} from '../src/modules/document-types/dtos/document-type.dtos';

const basicDefinition = {
  name: 'Applicant details',
  description: 'Basic applicant info',
  schema: { type: 'object', properties: {}, required: [] },
  uischema: { type: 'VerticalLayout', elements: [] },
};

const multiStageDefinition = {
  stages: [
    {
      id: 's1',
      name: 'Stage 1',
      pages: [
        {
          id: 'p1',
          name: 'Page 1',
          description: 'First page',
          schema: { type: 'object', properties: {}, required: [] },
          uischema: { type: 'VerticalLayout', elements: [] },
        },
      ],
    },
  ],
};

describe('document type DTO schemas', () => {
  it('constrains kind to the known set', () => {
    expect(documentKindSchema.safeParse('basic-form').success).toBe(true);
    expect(documentKindSchema.safeParse('multi-stage-form').success).toBe(true);
    expect(documentKindSchema.safeParse('service').success).toBe(true);
    expect(documentKindSchema.safeParse('other').success).toBe(false);
  });

  it('validates a definition against a kind via definitionForKind', () => {
    expect(definitionForKind('basic-form').safeParse(basicDefinition).success).toBe(true);
    expect(definitionForKind('basic-form').safeParse({ name: 'x' }).success).toBe(false);
    expect(definitionForKind('multi-stage-form').safeParse(basicDefinition).success).toBe(false);
    expect(definitionForKind('multi-stage-form').safeParse(multiStageDefinition).success).toBe(
      true,
    );
    expect(definitionForKind('service').safeParse(serviceDefinition).success).toBe(true);
    expect(definitionForKind('service').safeParse({ schema: {} }).success).toBe(false);
  });
});

const serviceDefinition = {
  schema: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string', title: 'Title' },
      about: { type: 'object', title: 'About' },
    },
  },
  uischema: {
    type: 'VerticalLayout',
    elements: [{ type: 'Control', scope: '#/properties/about', options: { format: 'richtext' } }],
  },
};
