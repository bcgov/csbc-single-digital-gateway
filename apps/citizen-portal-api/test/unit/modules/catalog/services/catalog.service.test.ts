import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { type Database, documentVersions, documents } from '@repo/database';
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

/**
 * Feature 217. A service is an AUTHORED document: title and description are GENERATED columns on
 * its version (nullable), the version's own `content` is what renders, and the "ways to apply"
 * list is gone with `document_references`.
 */
const serviceRow = (over: Record<string, unknown> = {}) => [
  {
    id: 'service-123',
    title: 'Published Service Title',
    description: 'Published Service Desc',
    versionId: 'version-456',
    versionNumber: 1,
    publishedAt: new Date('2026-07-08T12:00:00Z'),
    content: {
      schema: { type: 'object' },
      variants: { default: { type: 'Form', elements: [] } },
    },
    ...over,
  },
];

const versionRow = (over: Record<string, unknown> = {}) => [
  {
    id: 'version-456',
    versionNumber: 2,
    status: 'published',
    title: 'Published Service Title',
    content: { schema: { type: 'object' }, variants: { default: { type: 'Form', elements: [] } } },
    createdAt: new Date('2026-07-01T12:00:00Z'),
    publishedAt: new Date('2026-07-08T12:00:00Z'),
    archivedAt: null,
    ...over,
  },
];

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
    it("lists services from the published version's generated columns", async () => {
      mockResponse(
        [
          { id: 'service-1', title: 'Business licence', description: 'Apply for a licence' },
          { id: 'service-2', title: 'Waste permit', description: null },
        ],
        documents,
        'select',
      );

      const result = await service.listServices({ q: 'licence', limit: 10 });

      expect(result).toEqual([
        { id: 'service-1', title: 'Business licence', description: 'Apply for a licence' },
        { id: 'service-2', title: 'Waste permit', description: null },
      ]);
    });

    it('passes a NULL title and description straight through', async () => {
      // A service whose content carries no root label, or a rich (Lexical) description, yields
      // NULL from the generated column — the portal decides how to present that, not the API.
      mockResponse([{ id: 'service-1', title: null, description: null }], documents, 'select');

      const result = await service.listServices({ limit: 50 });

      expect(result).toEqual([{ id: 'service-1', title: null, description: null }]);
    });

    it('handles an undefined search parameter', async () => {
      mockResponse([{ id: 'service-1', title: 'A', description: null }], documents, 'select');

      await expect(service.listServices({ limit: 50 })).resolves.toHaveLength(1);
    });

    it('handles an empty search parameter', async () => {
      mockResponse([{ id: 'service-1', title: 'A', description: null }], documents, 'select');

      await expect(service.listServices({ q: '', limit: 50 })).resolves.toHaveLength(1);
    });
  });

  describe('getService', () => {
    it('throws NotFoundException if the service is not found', async () => {
      mockResponse([], documents, 'select');

      await expect(service.getService('svc-invalid')).rejects.toThrow(NotFoundException);
    });

    it("renders from the version's OWN content, with no ways-to-apply list", async () => {
      mockResponse(serviceRow(), documents, 'select');

      const result = await service.getService('service-123');

      expect(result).toEqual({
        id: 'service-123',
        title: 'Published Service Title',
        description: 'Published Service Desc',
        publishedVersionId: 'version-456',
        versionNumber: 1,
        publishedAt: '2026-07-08T12:00:00.000Z',
        schema: { type: 'object' },
        variants: { default: { type: 'Form', elements: [] } },
      });
      expect(result).not.toHaveProperty('applications');
      expect(result).not.toHaveProperty('data');
    });

    it('resolves the whole detail in ONE query', async () => {
      // It used to need a second query for the application-method references.
      mockResponse(serviceRow(), documents, 'select');

      await service.getService('service-123');

      expect(dbMock.select).toHaveBeenCalledTimes(1);
    });

    it('handles a null publishedAt', async () => {
      mockResponse(serviceRow({ publishedAt: null }), documents, 'select');

      await expect(service.getService('service-123')).resolves.toMatchObject({
        publishedAt: null,
      });
    });

    it('defaults both halves when the content is empty', async () => {
      mockResponse(serviceRow({ content: {} }), documents, 'select');

      await expect(service.getService('service-123')).resolves.toMatchObject({
        schema: {},
        variants: { default: {} },
      });
    });
  });

  describe('getServiceVersion', () => {
    it('throws NotFoundException if the version is not found', async () => {
      mockResponse([], documentVersions, 'select');

      await expect(service.getServiceVersion('service-123', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns a published version rendered from its own content', async () => {
      mockResponse(versionRow(), documentVersions, 'select');

      const result = await service.getServiceVersion('service-123', 'version-456');

      expect(result).toEqual({
        id: 'version-456',
        serviceId: 'service-123',
        versionNumber: 2,
        status: 'published',
        title: 'Published Service Title',
        schema: { type: 'object' },
        variants: { default: { type: 'Form', elements: [] } },
        createdAt: '2026-07-01T12:00:00.000Z',
        publishedAt: '2026-07-08T12:00:00.000Z',
        archivedAt: null,
      });
    });

    it('returns an archived version with both timestamps', async () => {
      mockResponse(
        versionRow({ status: 'archived', archivedAt: new Date('2026-08-01T12:00:00Z') }),
        documentVersions,
        'select',
      );

      await expect(service.getServiceVersion('service-123', 'version-456')).resolves.toMatchObject({
        status: 'archived',
        archivedAt: '2026-08-01T12:00:00.000Z',
        publishedAt: '2026-07-08T12:00:00.000Z',
      });
    });

    it('handles null publishedAt and archivedAt', async () => {
      mockResponse(versionRow({ publishedAt: null, archivedAt: null }), documentVersions, 'select');

      await expect(service.getServiceVersion('service-123', 'version-456')).resolves.toMatchObject({
        publishedAt: null,
        archivedAt: null,
      });
    });

    it('refuses a version that is neither published nor archived', async () => {
      // The query already filters on status; this is the belt-and-braces guard behind it.
      mockResponse(versionRow({ status: 'draft' }), documentVersions, 'select');

      await expect(service.getServiceVersion('service-123', 'version-456')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('allows a null title', async () => {
      mockResponse(versionRow({ title: null }), documentVersions, 'select');

      await expect(service.getServiceVersion('service-123', 'version-456')).resolves.toMatchObject({
        title: null,
      });
    });
  });
});
