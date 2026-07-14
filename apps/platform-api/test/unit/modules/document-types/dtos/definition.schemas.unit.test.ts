import { describe, expect, it } from 'vitest';
import {
  jsonSchemaSchema,
  uiSchemaSchema,
  basicFormDefinitionSchema,
  multiStageDefinitionSchema,
  serviceDefinitionSchema,
} from '../../../../../src/modules/document-types/dtos/definition.schemas';

describe('definition.schemas', () => {
  const validJsonSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
    },
    required: ['name'],
    additionalKey: 'preserved',
  };

  const validUiSchema = {
    type: 'VerticalLayout',
    elements: [
      {
        type: 'Control',
        scope: '#/properties/name',
      },
    ],
    options: {
      showUnfocusedDescription: true,
    },
  };

  describe('jsonSchemaSchema', () => {
    it('validates a valid JSON Schema and preserves additional properties', () => {
      const parsed = jsonSchemaSchema.safeParse(validJsonSchema);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.additionalKey).toBe('preserved');
      }
    });

    it('rejects when type, properties, or required is missing', () => {
      expect(jsonSchemaSchema.safeParse({ type: 'object', properties: {} }).success).toBe(false);
      expect(jsonSchemaSchema.safeParse({ type: 'object', required: [] }).success).toBe(false);
      expect(jsonSchemaSchema.safeParse({ properties: {}, required: [] }).success).toBe(false);
    });
  });

  describe('uiSchemaSchema', () => {
    it('validates a valid UI Schema and preserves additional properties', () => {
      const parsed = uiSchemaSchema.safeParse(validUiSchema);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.options).toEqual({ showUnfocusedDescription: true });
      }
    });

    it('rejects when type or elements is missing', () => {
      expect(uiSchemaSchema.safeParse({ type: 'VerticalLayout' }).success).toBe(false);
      expect(uiSchemaSchema.safeParse({ elements: [] }).success).toBe(false);
    });
  });

  describe('basicFormDefinitionSchema', () => {
    it('validates a valid basic form definition', () => {
      const validBasicForm = {
        name: 'Form Name',
        description: 'Form Description',
        schema: validJsonSchema,
        uischema: validUiSchema,
      };
      expect(basicFormDefinitionSchema.safeParse(validBasicForm).success).toBe(true);
    });

    it('rejects when name, description, schema, or uischema is missing', () => {
      const base = {
        name: 'Form Name',
        description: 'Form Description',
        schema: validJsonSchema,
        uischema: validUiSchema,
      };

      expect(basicFormDefinitionSchema.safeParse({ ...base, name: undefined }).success).toBe(false);
      expect(basicFormDefinitionSchema.safeParse({ ...base, description: undefined }).success).toBe(
        false,
      );
      expect(basicFormDefinitionSchema.safeParse({ ...base, schema: undefined }).success).toBe(
        false,
      );
      expect(basicFormDefinitionSchema.safeParse({ ...base, uischema: undefined }).success).toBe(
        false,
      );
    });
  });

  describe('multiStageDefinitionSchema', () => {
    it('validates a valid multi-stage form definition', () => {
      const validMultiStageForm = {
        stages: [
          {
            id: 'stage-1',
            name: 'Stage 1',
            pages: [
              {
                id: 'page-1',
                name: 'Page 1',
                description: 'Page Description',
                schema: validJsonSchema,
                uischema: validUiSchema,
              },
            ],
          },
        ],
      };
      expect(multiStageDefinitionSchema.safeParse(validMultiStageForm).success).toBe(true);
    });

    it('rejects when stages array is missing, or invalid stage/page properties are provided', () => {
      expect(multiStageDefinitionSchema.safeParse({}).success).toBe(false);
      expect(
        multiStageDefinitionSchema.safeParse({
          stages: [
            {
              id: 'stage-1',
              // missing name
              pages: [],
            },
          ],
        }).success,
      ).toBe(false);
    });
  });

  describe('serviceDefinitionSchema', () => {
    it('validates a valid service definition', () => {
      const validServiceForm = {
        schema: validJsonSchema,
        uischema: validUiSchema,
      };
      expect(serviceDefinitionSchema.safeParse(validServiceForm).success).toBe(true);
    });

    it('rejects when schema or uischema is missing', () => {
      expect(serviceDefinitionSchema.safeParse({ schema: validJsonSchema }).success).toBe(false);
      expect(serviceDefinitionSchema.safeParse({ uischema: validUiSchema }).success).toBe(false);
    });
  });
});
