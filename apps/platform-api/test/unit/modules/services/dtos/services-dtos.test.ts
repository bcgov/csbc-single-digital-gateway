import { describe, expect, it } from 'vitest';
import {
  createServiceSchema,
  definitionSchema,
  listServicesPageQuerySchema,
  listServicesQuerySchema,
  serviceDetailSchema,
  serviceListResponseSchema,
  serviceSchema,
  serviceSummarySchema,
  serviceVersionSchema,
  serviceWithVersionsSchema,
  toServiceDto,
  toServiceVersionDto,
  updateVersionContentSchema,
} from '../../../../../src/modules/services/dtos/service.dtos';

const VALID_UUID = 'e6005cbb-84f9-467a-bb48-e8cbffc9c991';
const CONTENT = {
  schema: { type: 'object', properties: {} },
  uischema: { type: 'Service', elements: [], label: 'Waste permit' },
};

describe('service DTO schemas (feature 217)', () => {
  describe('createServiceSchema', () => {
    it('takes just a workspace and a title', () => {
      expect(createServiceSchema.parse({ workspaceId: VALID_UUID, title: 'Waste permit' })).toEqual(
        { workspaceId: VALID_UUID, title: 'Waste permit' },
      );
    });

    it('trims the title and rejects an empty one', () => {
      expect(
        createServiceSchema.parse({ workspaceId: VALID_UUID, title: ' Waste permit ' }).title,
      ).toBe('Waste permit');
      expect(createServiceSchema.safeParse({ workspaceId: VALID_UUID, title: '  ' }).success).toBe(
        false,
      );
    });

    it('requires a workspace — a service is never global', () => {
      expect(createServiceSchema.safeParse({ title: 'Waste permit' }).success).toBe(false);
    });

    it('no longer accepts `data` or `applications`', () => {
      // Feature 217: a service is authored (no filled values), and links to its ways to apply
      // went with document_references.
      const parsed = createServiceSchema.parse({
        workspaceId: VALID_UUID,
        title: 'Waste permit',
        data: { title: 'ignored' },
        applications: [{ label: 'Apply' }],
      });

      expect(parsed).not.toHaveProperty('data');
      expect(parsed).not.toHaveProperty('applications');
    });
  });

  describe('updateVersionContentSchema', () => {
    it('accepts a StudioDocument content', () => {
      expect(updateVersionContentSchema.parse({ content: CONTENT })).toEqual({ content: CONTENT });
    });

    it('rejects a content missing either half', () => {
      expect(updateVersionContentSchema.safeParse({ content: { schema: {} } }).success).toBe(false);
      expect(updateVersionContentSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('list queries', () => {
    it('requires a workspace on the simple list', () => {
      expect(listServicesQuerySchema.parse({ workspaceId: VALID_UUID })).toEqual({
        workspaceId: VALID_UUID,
      });
      expect(listServicesQuerySchema.safeParse({}).success).toBe(false);
    });

    it('defaults the paged list to updated/desc/20/0 and coerces numeric query strings', () => {
      expect(listServicesPageQuerySchema.parse({ workspaceId: VALID_UUID })).toEqual({
        workspaceId: VALID_UUID,
        sort: 'updated',
        order: 'desc',
        limit: 20,
        offset: 0,
      });

      const parsed = listServicesPageQuerySchema.parse({
        workspaceId: VALID_UUID,
        limit: '50',
        offset: '10',
      });
      expect(parsed.limit).toBe(50);
      expect(parsed.offset).toBe(10);
    });

    it('caps the page size at 100 and rejects an unknown sort', () => {
      expect(
        listServicesPageQuerySchema.safeParse({ workspaceId: VALID_UUID, limit: 101 }).success,
      ).toBe(false);
      expect(
        listServicesPageQuerySchema.safeParse({ workspaceId: VALID_UUID, sort: 'kind' }).success,
      ).toBe(false);
    });
  });

  describe('response schemas', () => {
    const service = {
      id: VALID_UUID,
      workspaceId: VALID_UUID,
      title: 'Waste permit',
      description: null,
      createdAt: '2026-07-28T12:00:00.000Z',
      updatedAt: '2026-07-28T12:00:00.000Z',
    };
    const version = {
      id: VALID_UUID,
      documentId: VALID_UUID,
      templateVersionId: VALID_UUID,
      versionNumber: 1,
      revision: 1,
      status: 'draft' as const,
      title: 'Waste permit',
      description: null,
      content: CONTENT,
      createdAt: '2026-07-28T12:00:00.000Z',
      publishedAt: null,
      archivedAt: null,
    };

    it('allows a null title and description (both are generated and may be absent)', () => {
      expect(serviceSchema.parse({ ...service, title: null, description: null })).toBeDefined();
      expect(serviceVersionSchema.parse({ ...version, title: null })).toBeDefined();
    });

    it('allows a null templateVersionId (a version need not follow a template)', () => {
      expect(serviceVersionSchema.parse({ ...version, templateVersionId: null })).toBeDefined();
    });

    it('composes the with-versions, summary, list and detail envelopes', () => {
      expect(serviceWithVersionsSchema.parse({ service, versions: [version] })).toBeDefined();

      const summary = {
        ...service,
        status: 'draft' as const,
        versionCount: 1,
        hasSubmissions: false,
        latestPublished: false,
      };
      expect(serviceSummarySchema.parse(summary)).toBeDefined();
      expect(
        serviceListResponseSchema.parse({ items: [summary], total: 1, limit: 20, offset: 0 }),
      ).toBeDefined();
      expect(
        serviceDetailSchema.parse({
          service,
          versions: [version],
          definition: { schema: {}, uischema: {} },
          definitions: { [VALID_UUID]: { schema: {}, uischema: {} } },
          hasSubmissions: false,
        }),
      ).toBeDefined();
    });

    it('keeps the definition envelope opaque', () => {
      expect(definitionSchema.parse({ schema: { a: 1 }, uischema: { b: 2 } })).toEqual({
        schema: { a: 1 },
        uischema: { b: 2 },
      });
    });
  });

  describe('row → DTO mappers', () => {
    const now = new Date('2026-07-28T12:00:00.000Z');
    const doc = {
      id: VALID_UUID,
      templateId: null,
      workspaceId: VALID_UUID,
      kind: 'document' as const,
      type: 'services.service' as const,
      templateKind: 'template' as const,
      createdAt: now,
      updatedAt: now,
    };

    it('takes title and description from the CURRENT VERSION, not the document row', () => {
      const dto = toServiceDto(doc, { title: 'Waste permit', description: 'Apply here' });

      expect(dto.title).toBe('Waste permit');
      expect(dto.description).toBe('Apply here');
    });

    it('yields nulls when there is no current version', () => {
      const dto = toServiceDto(doc);

      expect(dto.title).toBeNull();
      expect(dto.description).toBeNull();
    });

    it('refuses a workspace-less service document (a data invariant violation)', () => {
      expect(() => toServiceDto({ ...doc, workspaceId: null })).toThrow(/no workspace/);
    });

    it('maps a version row, serialising dates and passing content through', () => {
      const dto = toServiceVersionDto({
        id: VALID_UUID,
        documentId: VALID_UUID,
        templateId: VALID_UUID,
        templateVersionId: VALID_UUID,
        versionNumber: 3,
        revision: 7,
        title: 'Waste permit',
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
        documentId: VALID_UUID,
        templateVersionId: VALID_UUID,
        versionNumber: 3,
        revision: 7,
        status: 'published',
        title: 'Waste permit',
        description: null,
        content: CONTENT,
        createdAt: '2026-07-28T12:00:00.000Z',
        publishedAt: '2026-07-28T12:00:00.000Z',
        archivedAt: null,
      });
    });
  });
});
