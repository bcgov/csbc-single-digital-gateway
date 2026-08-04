import { describe, expect, it } from 'vitest';
import {
  definitionSchema,
  createFormSchema,
  updateFormSchemaSchema,
  toFormDto,
  toFormVersionDto,
} from '../../../../../src/modules/forms/dtos/form.dtos';
import type { Document, DocumentVersion } from '@repo/database';

describe('form DTO schemas', () => {
  describe('definitionSchema', () => {
    it('validates a basic form definition', () => {
      const basicDef = {
        schema: { type: 'object', properties: {} },
        uischema: { type: 'VerticalLayout', elements: [] },
      };
      const result = definitionSchema.safeParse(basicDef);
      expect(result.success).toBe(true);
    });

    it('validates a multi-stage form definition', () => {
      const multiStageDef = {
        stages: [
          {
            id: 's1',
            name: 'Stage 1',
            position: { x: 100, y: 200 },
            pages: [
              {
                id: 'p1',
                name: 'Page 1',
                description: 'A test page',
                schema: { type: 'object' },
                uischema: { type: 'VerticalLayout' },
              },
            ],
          },
        ],
        edges: [
          {
            id: 'e1',
            source: 's1',
            target: 's2',
          },
        ],
      };
      const result = definitionSchema.safeParse(multiStageDef);
      expect(result.success).toBe(true);
    });

    it('rejects an invalid definition', () => {
      const invalidDef = {
        invalidKey: 'invalidValue',
      };
      const result = definitionSchema.safeParse(invalidDef);
      expect(result.success).toBe(false);
    });
  });

  describe('createFormSchema', () => {
    it('validates a valid createForm payload', () => {
      const payload = {
        workspaceId: 'e6005cbb-84f9-467a-bb48-e8cbffc9c991',
        typeId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        title: 'Form Title',
        definition: {
          schema: {},
          uischema: {},
        },
      };
      const result = createFormSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects payload with invalid workspaceId or typeId format', () => {
      const payload = {
        workspaceId: 'invalid-uuid',
        typeId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        title: 'Form Title',
        definition: {
          schema: {},
          uischema: {},
        },
      };
      const result = createFormSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('rejects payload with empty title', () => {
      const payload = {
        workspaceId: 'e6005cbb-84f9-467a-bb48-e8cbffc9c991',
        typeId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        title: '   ',
        definition: {
          schema: {},
          uischema: {},
        },
      };
      const result = createFormSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('updateFormSchemaSchema', () => {
    it('validates a valid updateForm payload', () => {
      const payload = {
        definition: {
          schema: {},
          uischema: {},
        },
        title: 'Updated Title',
      };
      const result = updateFormSchemaSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('validates a valid updateForm payload without title', () => {
      const payload = {
        definition: {
          schema: {},
          uischema: {},
        },
      };
      const result = updateFormSchemaSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('toFormDto', () => {
    it('correctly maps a Document row to FormResponse', () => {
      const mockRow = {
        id: 'doc-1',
        workspaceId: 'ws-1',
        title: 'My Document',
        kind: 'basic-form',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };

      const mapped = toFormDto(mockRow as unknown as Document);

      expect(mapped).toEqual({
        id: 'doc-1',
        workspaceId: 'ws-1',
        title: 'My Document',
        kind: 'basic-form',
        createdAt: '2026-07-12T00:00:00.000Z',
      });
    });

    it('throws an error if workspaceId is null', () => {
      const mockRow = {
        id: 'doc-1',
        workspaceId: null,
        title: 'My Document',
        kind: 'basic-form',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };

      expect(() => toFormDto(mockRow as unknown as Document)).toThrow(
        'form document has no workspace',
      );
    });
  });

  describe('toFormVersionDto', () => {
    it('correctly maps a DocumentVersion row with a definition schema to FormVersionResponse', () => {
      const mockRow = {
        id: 'v-1',
        documentId: 'doc-1',
        version: 2,
        status: 'published',
        schema: {
          schema: { type: 'object' },
          uischema: { type: 'VerticalLayout' },
        },
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };

      const mapped = toFormVersionDto(mockRow as unknown as DocumentVersion);

      expect(mapped).toEqual({
        id: 'v-1',
        documentId: 'doc-1',
        version: 2,
        status: 'published',
        schema: {
          schema: { type: 'object' },
          uischema: { type: 'VerticalLayout' },
        },
        createdAt: '2026-07-12T00:00:00.000Z',
      });
    });

    it('falls back to default empty schema/uischema when row schema is null or undefined', () => {
      const mockRow = {
        id: 'v-1',
        documentId: 'doc-1',
        version: 1,
        status: 'draft',
        schema: null,
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };

      const mapped = toFormVersionDto(mockRow as unknown as DocumentVersion);

      expect(mapped.schema).toEqual({
        schema: {},
        uischema: {},
      });
    });
  });
});
