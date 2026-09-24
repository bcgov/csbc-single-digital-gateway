import { describe, expect, it } from 'vitest';
import {
  agreementDefinitionSchema,
  createServiceAgreementSchema,
  listServiceAgreementsPageSchema,
  listServiceAgreementsSchema,
  serviceAgreementDetailSchema,
  serviceAgreementSchema,
  serviceAgreementSummarySchema,
  serviceAgreementVersionSchema,
  serviceAgreementWithVersionSchema,
  toAgreementDto,
  toAgreementVersionDto,
  updateServiceAgreementSchema,
} from '../../../../../src/modules/service-agreements/dtos/service-agreement.dtos';

const VALID_UUID = 'e6005cbb-84f9-467a-bb48-e8cbffc9c991';
const CONTENT = {
  schema: { type: 'object', properties: {} },
  uischema: { type: 'Form', elements: [], label: 'Terms' },
};

describe('service-agreement DTO schemas (feature 217)', () => {
  describe('createServiceAgreementSchema', () => {
    it('accepts a workspace-scoped create', () => {
      const parsed = createServiceAgreementSchema.parse({
        workspaceId: VALID_UUID,
        title: 'Terms',
      });

      expect(parsed).toEqual({ workspaceId: VALID_UUID, title: 'Terms' });
    });

    it('accepts a global create (no workspaceId)', () => {
      expect(createServiceAgreementSchema.parse({ title: 'Terms' })).toEqual({ title: 'Terms' });
    });

    it('requires a non-empty title and trims it', () => {
      expect(createServiceAgreementSchema.parse({ title: '  Terms  ' }).title).toBe('Terms');
      expect(createServiceAgreementSchema.safeParse({ title: '   ' }).success).toBe(false);
      expect(createServiceAgreementSchema.safeParse({}).success).toBe(false);
    });

    it('no longer accepts a `data` payload — an agreement is authored, not filled', () => {
      const parsed = createServiceAgreementSchema.safeParse({ data: { title: 'Terms' } });

      expect(parsed.success).toBe(false);
    });
  });

  describe('updateServiceAgreementSchema', () => {
    it('accepts a StudioDocument content', () => {
      expect(updateServiceAgreementSchema.parse({ content: CONTENT })).toEqual({
        content: CONTENT,
      });
    });

    it('rejects a content missing either half', () => {
      expect(updateServiceAgreementSchema.safeParse({ content: { schema: {} } }).success).toBe(
        false,
      );
      expect(
        updateServiceAgreementSchema.safeParse({ content: { uischema: CONTENT.uischema } }).success,
      ).toBe(false);
    });

    it('preserves unknown keys inside schema and uischema', () => {
      const parsed = updateServiceAgreementSchema.parse({
        content: {
          schema: { type: 'object', properties: {}, $id: 'x' },
          uischema: { type: 'Form', elements: [], options: { gap: 'lg' } },
        },
      });

      expect(parsed.content.schema['$id']).toBe('x');
      expect(parsed.content.uischema['options']).toEqual({ gap: 'lg' });
    });
  });

  describe('list queries', () => {
    it('makes workspaceId optional on the simple list', () => {
      expect(listServiceAgreementsSchema.parse({})).toEqual({});
      expect(listServiceAgreementsSchema.parse({ workspaceId: VALID_UUID })).toEqual({
        workspaceId: VALID_UUID,
      });
    });

    it('defaults the paged list to updated/desc/20/0', () => {
      expect(listServiceAgreementsPageSchema.parse({})).toEqual({
        sort: 'updated',
        order: 'desc',
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('response schemas', () => {
    it('allows a null title and requires the service-agreement type', () => {
      const agreement = {
        id: VALID_UUID,
        workspaceId: null,
        title: null,
        type: 'service-agreement',
        createdAt: '2026-07-28T12:00:00.000Z',
        updatedAt: '2026-07-28T12:00:00.000Z',
      };

      expect(serviceAgreementSchema.parse(agreement)).toEqual(agreement);
      expect(serviceAgreementSchema.safeParse({ ...agreement, type: 'service' }).success).toBe(
        false,
      );
    });

    it('carries content, revision and generated title/description on a version', () => {
      const version = {
        id: VALID_UUID,
        versionNumber: 1,
        revision: 3,
        status: 'draft',
        title: 'Terms',
        description: null,
        content: CONTENT,
        createdAt: '2026-07-28T12:00:00.000Z',
        publishedAt: null,
        archivedAt: null,
      };

      expect(serviceAgreementVersionSchema.parse(version)).toEqual(version);
    });

    it('composes the with-version and summary envelopes', () => {
      const agreement = {
        id: VALID_UUID,
        workspaceId: null,
        title: 'Terms',
        type: 'service-agreement' as const,
        createdAt: '2026-07-28T12:00:00.000Z',
        updatedAt: '2026-07-28T12:00:00.000Z',
      };
      const version = {
        id: VALID_UUID,
        versionNumber: 1,
        revision: 1,
        status: 'published' as const,
        title: 'Terms',
        description: null,
        content: CONTENT,
        createdAt: '2026-07-28T12:00:00.000Z',
        publishedAt: '2026-07-28T12:00:00.000Z',
        archivedAt: null,
      };

      expect(serviceAgreementWithVersionSchema.parse({ agreement, version })).toBeDefined();
      expect(
        serviceAgreementSummarySchema.parse({ ...agreement, status: 'published', isGlobal: true }),
      ).toBeDefined();
      expect(
        serviceAgreementDetailSchema.parse({
          agreement,
          versions: [version],
          definition: { schema: {}, uischema: {} },
        }),
      ).toBeDefined();
    });

    it('no longer carries the attached-services list', () => {
      // Feature 217: `services` was derived from document_references.
      const parsed = serviceAgreementDetailSchema.parse({
        agreement: {
          id: VALID_UUID,
          workspaceId: null,
          title: 'Terms',
          type: 'service-agreement',
          createdAt: '2026-07-28T12:00:00.000Z',
          updatedAt: '2026-07-28T12:00:00.000Z',
        },
        versions: [],
        definition: { schema: {}, uischema: {} },
        services: [{ id: 'srv-1', title: 'A service', workspaceSlug: 'ws' }],
      });

      expect(parsed).not.toHaveProperty('services');
    });

    it('keeps the definition envelope opaque', () => {
      expect(agreementDefinitionSchema.parse({ schema: {}, uischema: {} })).toEqual({
        schema: {},
        uischema: {},
      });
    });
  });

  describe('row → DTO mappers', () => {
    const now = new Date('2026-07-28T12:00:00.000Z');

    it('takes title from the CURRENT VERSION, not the document row', () => {
      const dto = toAgreementDto(
        {
          id: VALID_UUID,
          templateId: null,
          workspaceId: null,
          kind: 'document',
          type: 'service-agreement',
          templateKind: 'template',
          createdAt: now,
          updatedAt: now,
        },
        { title: 'Terms' },
      );

      expect(dto.title).toBe('Terms');
      expect(dto.type).toBe('service-agreement');
    });

    it('yields a null title when there is no current version', () => {
      const dto = toAgreementDto({
        id: VALID_UUID,
        templateId: null,
        workspaceId: null,
        kind: 'document',
        type: 'service-agreement',
        templateKind: 'template',
        createdAt: now,
        updatedAt: now,
      });

      expect(dto.title).toBeNull();
    });

    it('refuses a document of the wrong type rather than mislabelling it', () => {
      expect(() =>
        toAgreementDto({
          id: VALID_UUID,
          templateId: null,
          workspaceId: null,
          kind: 'document',
          type: 'service',
          templateKind: 'template',
          createdAt: now,
          updatedAt: now,
        }),
      ).toThrow(/not a service agreement/);
    });

    it('maps a version row, serialising dates and passing content through', () => {
      const dto = toAgreementVersionDto({
        id: VALID_UUID,
        documentId: VALID_UUID,
        templateId: null,
        templateVersionId: null,
        versionNumber: 2,
        revision: 5,
        title: 'Terms',
        description: null,
        content: CONTENT,
        status: 'published',
        publishedAt: now,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      });

      expect(dto).toEqual({
        id: VALID_UUID,
        versionNumber: 2,
        revision: 5,
        status: 'published',
        title: 'Terms',
        description: null,
        content: CONTENT,
        createdAt: '2026-07-28T12:00:00.000Z',
        publishedAt: '2026-07-28T12:00:00.000Z',
        archivedAt: null,
      });
    });
  });
});
