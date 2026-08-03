import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { type Database, documentReferences, documentVersions, documents } from '@repo/database';
import { CatalogService } from '../../../../../src/modules/catalog/services/catalog.service';

const createDbMock = () => {
  const mocks: {
    queries: Array<{
      table?: any;
      action?: 'select' | 'insert' | 'update' | undefined;
      resolve: any;
    }>;
  } = {
    queries: [],
  };

  const createBuilder = () => {
    let activeTable: any = null;
    let action: 'select' | 'insert' | 'update' = 'select';

    const builder = {
      select: vi.fn().mockImplementation(() => {
        action = 'select';
        return builder;
      }),
      insert: vi.fn().mockImplementation((table) => {
        action = 'insert';
        activeTable = table;
        return builder;
      }),
      update: vi.fn().mockImplementation((table) => {
        action = 'update';
        activeTable = table;
        return builder;
      }),
      from: vi.fn().mockImplementation((table) => {
        activeTable = table;
        return builder;
      }),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      // eslint-disable-next-line unicorn/no-thenable -- Drizzle ORM queries are thenables; the mock must implement .then() to support direct await
      then: (onfulfilled: any) => {
        const index = mocks.queries.findIndex(
          (q) =>
            (q.table === undefined || q.table === activeTable) &&
            (q.action === undefined || q.action === action),
        );
        let result: any = [];
        if (index !== -1) {
          const entry = mocks.queries[index];
          if (entry !== undefined) {
            result = entry.resolve;
            mocks.queries.splice(index, 1);
          }
        }
        return Promise.resolve(result).then(onfulfilled);
      },
    };
    return builder;
  };

  const dbMock = {
    ...createBuilder(),
    transaction: vi.fn(async (cb: any) => {
      return cb(createBuilder());
    }),
  };

  const mockResponse = (resolve: any, table?: any, action?: 'select' | 'insert' | 'update') => {
    mocks.queries.push({ table, action, resolve });
  };

  return { dbMock, mockResponse };
};

describe('CatalogService Unit Test Suite', () => {
  let service: CatalogService;
  let dbMock: any;
  let mockResponse: any;

  beforeEach(() => {
    const mocks = createDbMock();
    dbMock = mocks.dbMock;
    mockResponse = mocks.mockResponse;
    service = new CatalogService(dbMock as unknown as Database);
  });

  describe('listServices', () => {
    it('should list services with search and limit filters applied', async () => {
      const mockRows = [
        {
          id: 'service-1',
          docTitle: 'Service 1 Title',
          docDescription: 'Service 1 Desc',
          data: { title: 'Custom Service 1', description: 'Custom Desc 1' },
        },
        {
          id: 'service-2',
          docTitle: 'Service 2 Title',
          docDescription: 'Service 2 Desc',
          data: {}, // no custom fields, should fall back
        },
      ];

      mockResponse(mockRows, documents, 'select');

      const result = await service.listServices({ q: 'health', limit: 10 });

      expect(result).toEqual([
        {
          id: 'service-1',
          title: 'Custom Service 1',
          description: 'Custom Desc 1',
        },
        {
          id: 'service-2',
          title: 'Service 2 Title',
          description: 'Service 2 Desc',
        },
      ]);
    });

    it('should handle undefined search parameter', async () => {
      const mockRows = [
        {
          id: 'service-1',
          docTitle: 'Service 1 Title',
          docDescription: 'Service 1 Desc',
          data: {},
        },
      ];

      mockResponse(mockRows, documents, 'select');

      const result = await service.listServices({ limit: 50 });

      expect(result).toEqual([
        {
          id: 'service-1',
          title: 'Service 1 Title',
          description: 'Service 1 Desc',
        },
      ]);
    });

    it('should handle empty search parameter ("")', async () => {
      const mockRows = [
        {
          id: 'service-1',
          docTitle: 'Service 1 Title',
          docDescription: 'Service 1 Desc',
          data: {},
        },
      ];

      mockResponse(mockRows, documents, 'select');

      const result = await service.listServices({ q: '', limit: 50 });

      expect(result).toEqual([
        {
          id: 'service-1',
          title: 'Service 1 Title',
          description: 'Service 1 Desc',
        },
      ]);
    });

    it('should not add match filter if searchFilter returns undefined', async () => {
      const searchSpy = vi.spyOn(service as any, 'searchFilter').mockReturnValue(undefined);
      mockResponse([], documents, 'select');

      await service.listServices({ q: 'health', limit: 10 });

      expect(searchSpy).toHaveBeenCalledWith('health');
      searchSpy.mockRestore();
    });
  });

  describe('getService', () => {
    it('should throw NotFoundException if service is not found', async () => {
      mockResponse([], documents, 'select');

      await expect(service.getService('svc-invalid')).rejects.toThrow(NotFoundException);
    });

    it('should return service detail with associated applications on success', async () => {
      const mockServiceRow = [
        {
          id: 'service-123',
          docTitle: 'Fallback Title',
          docDescription: 'Fallback Desc',
          versionId: 'version-456',
          version: 1,
          publishedAt: new Date('2026-07-08T12:00:00Z'),
          data: { title: 'Published Service Title', description: 'Published Service Desc' },
          definition: { schema: { type: 'object' }, uischema: { type: 'VerticalLayout' } },
        },
      ];

      const mockApplicationsRow = [
        {
          id: 'ref-1',
          label: 'Apply Online',
          title: 'Intake Form',
          formId: 'form-abc',
          formVersionId: 'form-ver-xyz',
          kind: 'form',
          targetData: { url: null },
        },
      ];

      mockResponse(mockServiceRow, documents, 'select');
      mockResponse(mockApplicationsRow, documentReferences, 'select');

      const result = await service.getService('service-123');

      expect(result).toEqual({
        id: 'service-123',
        title: 'Published Service Title',
        description: 'Published Service Desc',
        publishedVersionId: 'version-456',
        version: 1,
        publishedAt: '2026-07-08T12:00:00.000Z',
        data: { title: 'Published Service Title', description: 'Published Service Desc' },
        schema: { type: 'object' },
        uischema: { type: 'VerticalLayout' },
        applications: [
          {
            id: 'ref-1',
            label: 'Apply Online',
            title: 'Intake Form',
            formId: 'form-abc',
            formVersionId: 'form-ver-xyz',
            kind: 'form',
            url: null,
          },
        ],
      });
    });

    it('should map applications with external url correctly', async () => {
      const mockServiceRow = [
        {
          id: 'service-123',
          docTitle: 'Fallback Title',
          docDescription: 'Fallback Desc',
          versionId: 'version-456',
          version: 1,
          publishedAt: new Date('2026-07-08T12:00:00Z'),
          data: { title: 'Published Service Title', description: 'Published Service Desc' },
          definition: { schema: { type: 'object' }, uischema: { type: 'VerticalLayout' } },
        },
      ];

      const mockApplicationsRow = [
        {
          id: 'ref-1',
          label: 'Apply Externally 1',
          title: 'External Site 1',
          formId: 'form-abc',
          formVersionId: 'form-ver-xyz',
          kind: 'external-application',
          targetData: { url: 'https://example.com' },
        },
        {
          id: 'ref-2',
          label: 'Apply Externally 2',
          title: 'External Site 2',
          formId: 'form-def',
          formVersionId: 'form-ver-uvw',
          kind: 'external-application',
          targetData: { url: 123 },
        },
      ];

      mockResponse(mockServiceRow, documents, 'select');
      mockResponse(mockApplicationsRow, documentReferences, 'select');

      const result = await service.getService('service-123');

      expect(result.applications).toEqual([
        {
          id: 'ref-1',
          label: 'Apply Externally 1',
          title: 'External Site 1',
          formId: 'form-abc',
          formVersionId: 'form-ver-xyz',
          kind: 'external-application',
          url: 'https://example.com',
        },
        {
          id: 'ref-2',
          label: 'Apply Externally 2',
          title: 'External Site 2',
          formId: 'form-def',
          formVersionId: 'form-ver-uvw',
          kind: 'external-application',
          url: null,
        },
      ]);
    });

    it('should handle null publishedAt on success', async () => {
      const mockServiceRow = [
        {
          id: 'service-123',
          docTitle: 'Fallback Title',
          docDescription: 'Fallback Desc',
          versionId: 'version-456',
          version: 1,
          publishedAt: null,
          data: { title: 'Published Service Title', description: 'Published Service Desc' },
          definition: { schema: { type: 'object' }, uischema: { type: 'VerticalLayout' } },
        },
      ];

      mockResponse(mockServiceRow, documents, 'select');
      mockResponse([], documentReferences, 'select');

      const result = await service.getService('service-123');
      expect(result.publishedAt).toBeNull();
    });
  });

  describe('getServiceVersion', () => {
    it('should throw NotFoundException if version is not found', async () => {
      mockResponse([], documentVersions, 'select');

      await expect(service.getServiceVersion('service-123', 'version-invalid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return service version details on success', async () => {
      const mockVersionRow = [
        {
          id: 'version-456',
          version: 2,
          status: 'published',
          data: { title: 'Service Title v2', description: 'Service Desc v2' },
          createdAt: new Date('2026-07-08T10:00:00Z'),
          publishedAt: new Date('2026-07-08T12:00:00Z'),
          archivedAt: null,
          docTitle: 'Fallback Title',
          definition: { schema: { type: 'object' }, uischema: { type: 'VerticalLayout' } },
        },
      ];

      mockResponse(mockVersionRow, documentVersions, 'select');

      const result = await service.getServiceVersion('service-123', 'version-456');

      expect(result).toEqual({
        id: 'version-456',
        serviceId: 'service-123',
        version: 2,
        status: 'published',
        title: 'Service Title v2',
        data: { title: 'Service Title v2', description: 'Service Desc v2' },
        schema: { type: 'object' },
        uischema: { type: 'VerticalLayout' },
        createdAt: '2026-07-08T10:00:00.000Z',
        publishedAt: '2026-07-08T12:00:00.000Z',
        archivedAt: null,
      });
    });

    it('should handle null publishedAt and archivedAt on success', async () => {
      const mockVersionRow = [
        {
          id: 'version-456',
          version: 2,
          status: 'published',
          data: { title: 'Service Title v2', description: 'Service Desc v2' },
          createdAt: new Date('2026-07-08T10:00:00Z'),
          publishedAt: null,
          archivedAt: null,
          docTitle: 'Fallback Title',
          definition: { schema: { type: 'object' }, uischema: { type: 'VerticalLayout' } },
        },
      ];

      mockResponse(mockVersionRow, documentVersions, 'select');

      const result = await service.getServiceVersion('service-123', 'version-456');
      expect(result.publishedAt).toBeNull();
      expect(result.archivedAt).toBeNull();
    });

    it('should return service version details with archived status and defined archivedAt/publishedAt on success', async () => {
      const mockVersionRow = [
        {
          id: 'version-456',
          version: 2,
          status: 'archived',
          data: { title: 'Service Title v2', description: 'Service Desc v2' },
          createdAt: new Date('2026-07-08T10:00:00Z'),
          publishedAt: new Date('2026-07-08T12:00:00Z'),
          archivedAt: new Date('2026-07-08T14:00:00Z'),
          docTitle: 'Fallback Title',
          definition: { schema: { type: 'object' }, uischema: { type: 'VerticalLayout' } },
        },
      ];

      mockResponse(mockVersionRow, documentVersions, 'select');

      const result = await service.getServiceVersion('service-123', 'version-456');

      expect(result).toEqual({
        id: 'version-456',
        serviceId: 'service-123',
        version: 2,
        status: 'archived',
        title: 'Service Title v2',
        data: { title: 'Service Title v2', description: 'Service Desc v2' },
        schema: { type: 'object' },
        uischema: { type: 'VerticalLayout' },
        createdAt: '2026-07-08T10:00:00.000Z',
        publishedAt: '2026-07-08T12:00:00.000Z',
        archivedAt: '2026-07-08T14:00:00.000Z',
      });
    });

    it('should throw NotFoundException if version exists but status is neither published nor archived', async () => {
      const mockVersionRow = [
        {
          id: 'version-456',
          version: 2,
          status: 'draft',
          data: { title: 'Service Title v2', description: 'Service Desc v2' },
          createdAt: new Date('2026-07-08T10:00:00Z'),
          publishedAt: null,
          archivedAt: null,
          docTitle: 'Fallback Title',
          definition: { schema: { type: 'object' }, uischema: { type: 'VerticalLayout' } },
        },
      ];

      mockResponse(mockVersionRow, documentVersions, 'select');

      await expect(service.getServiceVersion('service-123', 'version-456')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
