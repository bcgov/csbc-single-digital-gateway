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

    it("renders from the version's OWN content and answers, with an empty methods list when none are referenced", async () => {
      mockResponse(
        serviceRow({
          content: {
            schema: { type: 'object' },
            variants: { default: { type: 'Form', elements: [] } },
            data: { about: 'x' },
          },
        }),
        documents,
        'select',
      );

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
        data: { about: 'x' },
        // Doc 291: the ways to apply are back — none, for a version that references no method.
        applicationMethods: [],
      });
      expect(result).not.toHaveProperty('applications');
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
        data: {},
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
        data: {},
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

// Doc 291.
const M1 = '11111111-1111-4111-8111-111111111111';
const M2 = '22222222-2222-4222-8222-222222222222';
const referencing = (ids: string[]) =>
  serviceRow({
    workspaceId: 'ws-1',
    content: {
      schema: { type: 'object' },
      variants: {
        default: {
          type: 'Form',
          elements: [
            {
              type: 'Control',
              scope: '#/properties/methods',
              options: {
                component: 'document-reference',
                documentType: 'services.service-application-method',
              },
            },
          ],
        },
      },
      data: { methods: ids.map((id) => ({ id })) },
    },
  });
const methodRow = (id: string, title: string) => ({
  id,
  title,
  description: `${title} description`,
  content: {
    schema: { type: 'object', properties: { name: { type: 'string' } } },
    variants: {
      default: { type: 'Form', elements: [] },
      Citizen: { type: 'Form', elements: [] },
    },
    data: { secret: 'never sent' },
  },
});

describe('CatalogService — application methods (doc 291 rules 4-7)', () => {
  let service: CatalogService;
  let mockResponse: any;

  beforeEach(() => {
    const db = createDbMock();
    mockResponse = db.mockResponse;
    service = new CatalogService(db.dbMock as unknown as Database);
  });

  describe('getService', () => {
    it('lists the published methods the published version references, in order, with title and description', async () => {
      mockResponse(referencing([M2, M1]), documents, 'select');
      // The DB answers in its own order; the list keeps the reference order.
      mockResponse([methodRow(M1, 'Online'), methodRow(M2, 'By mail')], documents, 'select');

      const result = await service.getService('service-123');

      expect(result.applicationMethods).toEqual([
        { id: M2, title: 'By mail', description: 'By mail description' },
        { id: M1, title: 'Online', description: 'Online description' },
      ]);
      // The workspace is used, never returned.
      expect(result).not.toHaveProperty('workspaceId');
    });

    it('leaves out ids that are not published application methods in the service workspace', async () => {
      mockResponse(referencing([M1, M2, 'not-a-uuid']), documents, 'select');
      // The workspace/type/published filter is the query's: it returned only M1.
      mockResponse([methodRow(M1, 'Online')], documents, 'select');

      const result = await service.getService('service-123');

      expect(result.applicationMethods.map((method) => method.id)).toEqual([M1]);
    });
  });

  describe('getApplicationMethod', () => {
    it('returns the method published content for a listed method', async () => {
      mockResponse(referencing([M1]), documents, 'select');
      mockResponse([methodRow(M1, 'Online')], documents, 'select');

      const result = await service.getApplicationMethod('service-123', M1);

      expect(result).toEqual({
        id: M1,
        title: 'Online',
        description: 'Online description',
        schema: { type: 'object', properties: { name: { type: 'string' } } },
        variants: {
          default: { type: 'Form', elements: [] },
          Citizen: { type: 'Form', elements: [] },
        },
      });
      // Only the form — never stored answers.
      expect(result).not.toHaveProperty('data');
    });

    it('throws NotFound for a method the service does not list', async () => {
      mockResponse(referencing([M1]), documents, 'select');
      mockResponse([methodRow(M1, 'Online')], documents, 'select');

      await expect(service.getApplicationMethod('service-123', M2)).rejects.toThrow(
        'Application method not found',
      );
      mockResponse([], documents, 'select');
      await expect(service.getApplicationMethod('missing', M1)).rejects.toThrow(NotFoundException);
    });
  });
});
