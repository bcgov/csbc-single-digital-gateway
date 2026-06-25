import { describe, expect, it } from 'vitest';
import {
  createDocumentTypeSchema,
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
    expect(documentKindSchema.safeParse('other').success).toBe(false);
  });

  it('accepts a valid basic-form create payload', () => {
    const parsed = createDocumentTypeSchema.parse({
      name: 'Basic Form',
      kind: 'basic-form',
      definition: basicDefinition,
    });
    expect(parsed.kind).toBe('basic-form');
  });

  it('accepts a valid multi-stage-form create payload', () => {
    const parsed = createDocumentTypeSchema.parse({
      name: 'Multi-stage Form',
      kind: 'multi-stage-form',
      definition: multiStageDefinition,
    });
    expect(parsed.kind).toBe('multi-stage-form');
  });

  it('rejects an unknown kind and an empty name', () => {
    expect(
      createDocumentTypeSchema.safeParse({ name: 'X', kind: 'nope', definition: basicDefinition })
        .success,
    ).toBe(false);
    expect(
      createDocumentTypeSchema.safeParse({
        name: '',
        kind: 'basic-form',
        definition: basicDefinition,
      }).success,
    ).toBe(false);
  });

  it('rejects a basic-form definition missing its schema', () => {
    const bad = { name: 'x', description: 'y', uischema: { type: 'VerticalLayout', elements: [] } };
    expect(
      createDocumentTypeSchema.safeParse({ name: 'B', kind: 'basic-form', definition: bad })
        .success,
    ).toBe(false);
  });

  it('validates a definition against a kind via definitionForKind', () => {
    expect(definitionForKind('basic-form').safeParse(basicDefinition).success).toBe(true);
    expect(definitionForKind('multi-stage-form').safeParse(basicDefinition).success).toBe(false);
    expect(definitionForKind('multi-stage-form').safeParse(multiStageDefinition).success).toBe(
      true,
    );
  });
});
