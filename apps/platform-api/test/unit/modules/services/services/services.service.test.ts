import { readFileSync } from 'node:fs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ServicesService } from '../../../../../src/modules/services/services/services.service';
import {
  resolveApplications,
  insertApplication,
} from '../../../../../src/modules/services/util/applications';
import { reactivateServiceTx } from '../../../../../src/modules/services/util/version-copy';
import { documents, documentVersions } from '@repo/database';
import { createMockQuery } from '../../../../utils/create-mock-query';
import { createMockDoc } from '../../../../utils/test-helpers';

vi.mock('../../../../../src/modules/services/util/applications', () => ({
  insertApplication: vi.fn(),
  resolveApplications: vi.fn(),
}));

vi.mock('../../../../../src/modules/services/util/version-copy', () => ({
  reactivateServiceTx: vi.fn(),
}));

vi.mock('drizzle-orm', async (importOriginal) => {
  const original = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...original,
    or: (...args: any[]) => {
      if ((globalThis as any).mockOrUndefined) {
        return undefined as any;
      }
      return original.or(...args);
    },
  };
});

describe('ServicesService', () => {
  let service: ServicesService;
  let dbMock: any;
  let txMock: any;
  let serviceTypeResolverMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    txMock = Object.assign(Promise.resolve([]), {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      select: vi.fn().mockImplementation(() => createMockQuery([])),
    });

    dbMock = Object.assign(Promise.resolve([]), {
      transaction: vi.fn().mockImplementation((cb) => cb(txMock)),
      select: vi.fn().mockImplementation(() => createMockQuery([])),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      where: vi.fn().mockReturnThis(),
    });

    serviceTypeResolverMock = {
      resolve: vi.fn(),
      definitionForVersion: vi.fn(),
      // Feature 174: the READ path resolves templates per version, never via resolve().
      definitionsForVersions: vi.fn().mockResolvedValue({}),
    };

    service = new ServicesService(dbMock, serviceTypeResolverMock);
  });

  describe('create', () => {
    const input = {
      workspaceId: 'ws-1',
      title: 'New Service',
      data: { text: 'test' },
      applications: [],
    };

    it('successfully creates service document and draft version in a transaction', async () => {
      // 1. requireMembership select
      dbMock.select.mockReturnValueOnce(createMockQuery([{ role: 'member' }]));

      // 2. serviceType.resolve
      serviceTypeResolverMock.resolve.mockResolvedValue({
        typeId: 'type-1',
        typeVersionId: 'type-version-1',
      });

      // 3. resolveApplications mock
      vi.mocked(resolveApplications).mockResolvedValueOnce([]);

      const mockDoc = createMockDoc({
        id: 'service-doc-1',
        workspaceId: 'ws-1',
        title: 'New Service',
        kind: 'service',
        description: 'Service Desc',
        updatedAt: new Date('2026-07-12T00:00:00.000Z'),
      });
      const mockVersion = {
        id: 'service-version-1',
        documentId: 'service-doc-1',
        version: 1,
        status: 'draft',
        data: {},
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
        updatedAt: new Date('2026-07-12T00:00:00.000Z'),
        publishedAt: null,
        archivedAt: null,
      };

      txMock.returning
        .mockResolvedValueOnce([mockDoc]) // inserted doc
        .mockResolvedValueOnce([mockVersion]); // inserted version

      const result = await service.create('user-1', input);

      expect(dbMock.transaction).toHaveBeenCalledTimes(1);
      expect(txMock.insert).toHaveBeenNthCalledWith(1, documents);
      expect(txMock.insert).toHaveBeenNthCalledWith(2, documentVersions);

      expect(result).toEqual({
        service: expect.objectContaining({ id: 'service-doc-1' }),
        versions: [expect.objectContaining({ id: 'service-version-1' })],
      });
    });

    it('throws NotFoundException if user has no workspace membership', async () => {
      dbMock.select.mockReturnValueOnce(createMockQuery([]));

      await expect(service.create('user-1', input)).rejects.toThrow(NotFoundException);
    });

    it('throws Error if documents insert returned no row', async () => {
      dbMock.select.mockReturnValueOnce(createMockQuery([{ role: 'member' }]));
      serviceTypeResolverMock.resolve.mockResolvedValue({
        typeId: 'type-1',
        typeVersionId: 'type-version-1',
      });
      vi.mocked(resolveApplications).mockResolvedValueOnce([]);
      txMock.returning.mockResolvedValueOnce([]); // empty doc insert

      await expect(service.create('user-1', input)).rejects.toThrow(
        new Error('document insert returned no row'),
      );
    });

    it('throws Error if documentVersions insert returned no row', async () => {
      dbMock.select.mockReturnValueOnce(createMockQuery([{ role: 'member' }]));
      serviceTypeResolverMock.resolve.mockResolvedValue({
        typeId: 'type-1',
        typeVersionId: 'type-version-1',
      });
      vi.mocked(resolveApplications).mockResolvedValueOnce([]);
      txMock.returning.mockResolvedValueOnce([{ id: 'service-doc-1' }]).mockResolvedValueOnce([]); // empty version insert

      await expect(service.create('user-1', input)).rejects.toThrow(
        new Error('document version insert returned no row'),
      );
    });

    it('successfully resolves and inserts inline applications', async () => {
      dbMock.select.mockReturnValueOnce(createMockQuery([{ role: 'member' }]));
      serviceTypeResolverMock.resolve.mockResolvedValue({
        typeId: 'type-1',
        typeVersionId: 'type-version-1',
      });

      const appInput = {
        label: 'Form App',
        position: 0,
        form: { mode: 'new' as const, typeId: 'f-1', title: 'Form' },
      };
      const resolvedApp = { typeId: 'f-1', kind: 'basic-form' } as any;
      vi.mocked(resolveApplications).mockResolvedValueOnce([resolvedApp]);

      txMock.returning
        .mockResolvedValueOnce([
          { id: 'service-doc-1', createdAt: new Date(), updatedAt: new Date() },
        ])
        .mockResolvedValueOnce([
          { id: 'service-version-1', version: 1, createdAt: new Date(), updatedAt: new Date() },
        ]);

      await service.create('user-1', {
        ...input,
        applications: [appInput],
      });

      expect(vi.mocked(resolveApplications)).toHaveBeenCalledWith(dbMock, '', 'ws-1', [appInput]);
      expect(vi.mocked(insertApplication)).toHaveBeenCalledWith(
        txMock,
        {
          ownerVersionId: 'service-version-1',
          ownerDocumentId: 'service-doc-1',
          workspaceId: 'ws-1',
        },
        resolvedApp,
      );
    });
  });

  describe('getServiceDefinition', () => {
    it('returns the schema definition of the resolved service type', async () => {
      serviceTypeResolverMock.resolve.mockResolvedValue({
        schema: { type: 'object' },
        uischema: { type: 'VerticalLayout' },
      });

      const result = await service.getServiceDefinition();

      expect(serviceTypeResolverMock.resolve).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        schema: { type: 'object' },
        uischema: { type: 'VerticalLayout' },
      });
    });
  });

  describe('listForms', () => {
    it('returns workspace form documents catalog', async () => {
      // 1. requireMembership select
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ role: 'member' }]))
        // 2. list documents select
        .mockReturnValueOnce(
          createMockQuery([{ id: 'form-doc-1', title: 'Form 1', kind: 'basic-form' }]),
        )
        // 3. versions for form select
        .mockReturnValueOnce(createMockQuery([{ id: 'form-version-1', status: 'published' }]));

      const result = await service.listForms('user-1', 'ws-1');

      expect(result).toEqual([
        {
          documentId: 'form-doc-1',
          versionId: 'form-version-1',
          title: 'Form 1',
          kind: 'basic-form',
        },
      ]);
    });

    it('returns latest draft version if no published version exists', async () => {
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ role: 'member' }]))
        // 2. list documents select
        .mockReturnValueOnce(
          createMockQuery([{ id: 'form-doc-1', title: 'Form 1', kind: 'basic-form' }]),
        )
        // 3. versions for form select (no published)
        .mockReturnValueOnce(createMockQuery([{ id: 'form-version-draft', status: 'draft' }]));

      const result = await service.listForms('user-1', 'ws-1');

      expect(result[0]!.versionId).toBe('form-version-draft');
    });

    it('ignores form document in catalog if it has no versions', async () => {
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ role: 'member' }]))
        // 2. list documents select
        .mockReturnValueOnce(
          createMockQuery([{ id: 'form-doc-1', title: 'Form 1', kind: 'basic-form' }]),
        )
        // 3. versions for form select (empty)
        .mockReturnValueOnce(createMockQuery([]));

      const result = await service.listForms('user-1', 'ws-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('list', () => {
    it('throws NotFoundException if user has no workspace membership', async () => {
      dbMock.select.mockReturnValueOnce(createMockQuery([]));

      await expect(
        service.list('user-1', {
          workspaceId: 'ws-1',
          sort: 'updated',
          order: 'desc',
          limit: 10,
          offset: 0,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns empty list and skips subqueries when no documents exist in workspace', async () => {
      // 1. requireMembership select
      dbMock.select.mockReturnValueOnce(createMockQuery([{ role: 'member' }]));
      // 2. serviceType.resolve
      serviceTypeResolverMock.resolve.mockResolvedValueOnce({
        typeId: 'type-1',
        typeVersionId: 'type-version-1',
      });
      // 3. docs select (empty)
      dbMock.select.mockReturnValueOnce(createMockQuery([]));
      // 4. totals select
      dbMock.select.mockReturnValueOnce(createMockQuery([{ count: 0 }]));

      const result = await service.list('user-1', {
        workspaceId: 'ws-1',
        sort: 'updated',
        order: 'desc',
        limit: 10,
        offset: 0,
      });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    it('returns paginated services with derived versions, multiple versions per doc, status, and submission flags', async () => {
      // 1. requireMembership select
      dbMock.select.mockReturnValueOnce(createMockQuery([{ role: 'member' }]));
      // 2. serviceType.resolve
      serviceTypeResolverMock.resolve.mockResolvedValueOnce({
        typeId: 'type-1',
        typeVersionId: 'type-version-1',
      });

      const mockDoc1 = {
        id: 'doc-1',
        workspaceId: 'ws-1',
        typeId: 'type-1',
        title: 'Service 1',
        description: 'Desc 1',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
        updatedAt: new Date('2026-07-12T00:00:00.000Z'),
      };
      const mockDoc2 = {
        id: 'doc-2',
        workspaceId: 'ws-1',
        typeId: 'type-1',
        title: 'Service 2',
        description: 'Desc 2',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
        updatedAt: new Date('2026-07-12T00:00:00.000Z'),
      };

      // 3. docs select
      dbMock.select.mockReturnValueOnce(createMockQuery([mockDoc1, mockDoc2]));
      // 4. totals count select
      dbMock.select.mockReturnValueOnce(createMockQuery([{ count: 2 }]));
      // 5. versionRows select (doc-1 has 2 versions -> exercises list.push(row), doc-2 has none)
      dbMock.select.mockReturnValueOnce(
        createMockQuery([
          {
            documentId: 'doc-1',
            id: 'version-1',
            version: 1,
            status: 'draft',
            publishedAt: null,
          },
          {
            documentId: 'doc-1',
            id: 'version-2',
            version: 2,
            status: 'published',
            publishedAt: new Date('2026-07-13T00:00:00.000Z'),
          },
        ]),
      );
      // 6. submissionRows select (doc-1 has submissions)
      dbMock.select.mockReturnValueOnce(createMockQuery([{ ownerDocumentId: 'doc-1', n: 5 }]));

      const result = await service.list('user-1', {
        workspaceId: 'ws-1',
        q: 'Service',
        sort: 'title',
        order: 'asc',
        limit: 10,
        offset: 0,
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          id: 'doc-1',
          status: 'published',
          versionCount: 2,
          hasSubmissions: true,
          latestPublished: true,
        }),
      );
      expect(result.items[1]).toEqual(
        expect.objectContaining({
          id: 'doc-2',
          status: 'none',
          versionCount: 0,
          hasSubmissions: false,
          latestPublished: false,
        }),
      );
    });

    it('handles status sort, order desc, whitespace q, and empty totals query', async () => {
      // 1. requireMembership select
      dbMock.select.mockReturnValueOnce(createMockQuery([{ role: 'member' }]));
      // 2. serviceType.resolve
      serviceTypeResolverMock.resolve.mockResolvedValueOnce({
        typeId: 'type-1',
        typeVersionId: 'type-version-1',
      });
      // 3. docs select
      dbMock.select.mockReturnValueOnce(createMockQuery([]));
      // 4. totals select (empty)
      dbMock.select.mockReturnValueOnce(createMockQuery([]));

      const result = await service.list('user-1', {
        workspaceId: 'ws-1',
        q: '   ',
        sort: 'status',
        order: 'desc',
        limit: 10,
        offset: 0,
      });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('handles falsy search expression when search expression is undefined', async () => {
      // 1. requireMembership select
      dbMock.select.mockReturnValueOnce(createMockQuery([{ role: 'member' }]));
      // 2. serviceType.resolve
      serviceTypeResolverMock.resolve.mockResolvedValueOnce({
        typeId: 'type-1',
        typeVersionId: 'type-version-1',
      });
      // 3. docs select
      dbMock.select.mockReturnValueOnce(createMockQuery([]));
      // 4. totals select
      dbMock.select.mockReturnValueOnce(createMockQuery([{ count: 0 }]));

      (globalThis as any).mockOrUndefined = true;
      try {
        const result = await service.list('user-1', {
          workspaceId: 'ws-1',
          q: 'service',
          sort: 'updated',
          order: 'desc',
          limit: 10,
          offset: 0,
        });
        expect(result.items).toHaveLength(0);
      } finally {
        (globalThis as any).mockOrUndefined = false;
      }
    });

    it('returns status draft when service only has draft versions', async () => {
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ role: 'member' }]))
        .mockReturnValueOnce(
          createMockQuery([
            {
              id: 'service-1',
              workspaceId: 'ws-1',
              title: 'Service 1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        )
        .mockReturnValueOnce(createMockQuery([{ count: 1 }]))
        .mockReturnValueOnce(
          createMockQuery([
            {
              documentId: 'service-1',
              id: 'version-1',
              status: 'draft',
              publishedAt: null,
              version: 1,
            },
          ]),
        )
        .mockReturnValueOnce(createMockQuery([]));

      serviceTypeResolverMock.resolve.mockResolvedValue({ typeId: 'type-1' });

      const result = await service.list('user-1', { workspaceId: 'ws-1' } as any);
      expect(result.items[0]!.status).toBe('draft');
    });

    it('returns status archived when service only has archived versions', async () => {
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ role: 'member' }]))
        .mockReturnValueOnce(
          createMockQuery([
            {
              id: 'service-1',
              workspaceId: 'ws-1',
              title: 'Service 1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        )
        .mockReturnValueOnce(createMockQuery([{ count: 1 }]))
        .mockReturnValueOnce(
          createMockQuery([
            {
              documentId: 'service-1',
              id: 'version-1',
              status: 'archived',
              publishedAt: null,
              version: 1,
            },
          ]),
        )
        .mockReturnValueOnce(createMockQuery([]));

      serviceTypeResolverMock.resolve.mockResolvedValue({ typeId: 'type-1' });

      const result = await service.list('user-1', { workspaceId: 'ws-1' } as any);
      expect(result.items[0]!.status).toBe('archived');
    });

    it('returns status none when service has no versions', async () => {
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ role: 'member' }]))
        .mockReturnValueOnce(
          createMockQuery([
            {
              id: 'service-1',
              workspaceId: 'ws-1',
              title: 'Service 1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        )
        .mockReturnValueOnce(createMockQuery([{ count: 1 }]))
        .mockReturnValueOnce(createMockQuery([])) // empty versions
        .mockReturnValueOnce(createMockQuery([]));

      serviceTypeResolverMock.resolve.mockResolvedValue({ typeId: 'type-1' });

      const result = await service.list('user-1', { workspaceId: 'ws-1' } as any);
      expect(result.items[0]!.status).toBe('none');
    });

    it('falls back to false for hasSubmissions if count query returns empty', async () => {
      dbMock.select = vi
        .fn()
        // 1. requireMembership select
        .mockReturnValueOnce(createMockQuery([{ role: 'member' }]))
        // 2. docs select
        .mockReturnValueOnce(
          createMockQuery([
            {
              id: 'service-1',
              workspaceId: 'ws-1',
              title: 'Service 1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        )
        // 3. totals count select
        .mockReturnValueOnce(createMockQuery([{ count: 1 }]))
        // 4. versionRows select
        .mockReturnValueOnce(
          createMockQuery([
            {
              documentId: 'service-1',
              id: 'version-1',
              status: 'published',
              publishedAt: new Date(),
              version: 1,
            },
          ]),
        )
        // 5. submissionRows select (empty result)
        .mockReturnValueOnce(createMockQuery([]));

      serviceTypeResolverMock.resolve.mockResolvedValue({ typeId: 'type-1' });

      const result = await service.list('user-1', { workspaceId: 'ws-1' } as any);

      expect(result.items[0]!.hasSubmissions).toBe(false);
    });
  });

  describe('get', () => {
    it('successfully retrieves detailed service information', async () => {
      const mockDoc = createMockDoc({
        id: 'service-1',
        workspaceId: 'ws-1',
        title: 'Service Title',
        description: 'Service Desc',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
        updatedAt: new Date('2026-07-12T00:00:00.000Z'),
      });
      dbMock.select = vi
        .fn()
        // 1. requireDocument select
        .mockReturnValueOnce(createMockQuery([{ doc: mockDoc }]))
        // 2. versionsOf select
        .mockReturnValueOnce(
          createMockQuery([
            {
              id: 'version-1',
              documentId: 'service-1',
              typeVersionId: 'type-version-1',
              version: 1,
              status: 'draft',
              data: { test: true },
              createdAt: new Date('2026-07-12T00:00:00.000Z'),
              updatedAt: new Date('2026-07-12T00:00:00.000Z'),
              publishedAt: null,
              archivedAt: null,
            },
          ]),
        )
        // 3. hasSubmissions select
        .mockReturnValueOnce(createMockQuery([]));

      serviceTypeResolverMock.definitionsForVersions.mockResolvedValue({
        'type-version-1': { schema: { type: 'object' }, uischema: {} },
      });

      const result = await service.get('user-1', 'service-1');

      expect(result.service.id).toBe('service-1');
      expect(result.versions).toHaveLength(1);
      expect(result.definition.schema).toEqual({ type: 'object' });
      expect(result.hasSubmissions).toBe(false);
    });

    it('throws NotFoundException if the service document is not found', async () => {
      dbMock.select = vi.fn().mockReturnValueOnce(createMockQuery([])); // empty requireDocument

      await expect(service.get('user-1', 'service-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('successfully removes a service and its orphaned forms when no submissions exist', async () => {
      const mockDoc = createMockDoc({ id: 'service-1' });
      dbMock.select = vi
        .fn()
        // 1. requireDocument select
        .mockReturnValueOnce(createMockQuery([{ doc: mockDoc }]))
        // 2. hasSubmissions count select
        .mockReturnValueOnce(createMockQuery([{ n: 0 }]))
        // 3. applicationFormIds select
        .mockReturnValueOnce(createMockQuery([{ formId: 'form-doc-1' }]));

      // inside transaction: remaining count select
      txMock.select.mockReturnValueOnce(createMockQuery([{ n: 0 }]));

      await service.remove('user-1', 'service-1');

      expect(txMock.delete).toHaveBeenNthCalledWith(1, documents);
      expect(txMock.delete).toHaveBeenNthCalledWith(2, documents); // orphaned form deleted
    });

    it('throws ConflictException if the service forms have submissions', async () => {
      const mockDoc = createMockDoc({ id: 'service-1' });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ doc: mockDoc }])) // requireDocument
        .mockReturnValueOnce(createMockQuery([{ n: 5 }])); // hasSubmissions returns > 0

      await expect(service.remove('user-1', 'service-1')).rejects.toThrow(ConflictException);
    });

    it('does not delete form document if another service still references it', async () => {
      const mockDoc = createMockDoc({ id: 'service-1' });
      dbMock.select = vi
        .fn()
        // 1. requireDocument select
        .mockReturnValueOnce(createMockQuery([{ doc: mockDoc }]))
        // 2. hasSubmissions count select
        .mockReturnValueOnce(createMockQuery([{ n: 0 }]))
        // 3. applicationFormIds select
        .mockReturnValueOnce(createMockQuery([{ formId: 'form-doc-1' }]));

      // inside transaction: remaining count select (1 remaining reference)
      txMock.select.mockReturnValueOnce(createMockQuery([{ n: 1 }]));

      await service.remove('user-1', 'service-1');

      expect(txMock.delete).toHaveBeenCalledTimes(1);
      expect(txMock.delete).toHaveBeenCalledWith(documents); // only deleted service doc
    });

    it('deletes form document if remaining count query returns empty when removing a service', async () => {
      const mockDoc = createMockDoc({ id: 'service-1' });
      dbMock.select = vi
        .fn()
        // 1. requireDocument select
        .mockReturnValueOnce(createMockQuery([{ doc: mockDoc }]))
        // 2. hasSubmissions count select
        .mockReturnValueOnce(createMockQuery([{ n: 0 }]))
        // 3. applicationFormIds select
        .mockReturnValueOnce(createMockQuery([{ formId: 'form-doc-1' }]));

      // inside transaction: remaining count select (empty result)
      txMock.select.mockReturnValueOnce(createMockQuery([]));

      await service.remove('user-1', 'service-1');

      expect(txMock.delete).toHaveBeenNthCalledWith(1, documents);
      expect(txMock.delete).toHaveBeenNthCalledWith(2, documents); // orphaned form deleted
    });
  });

  describe('archive', () => {
    it('archives all service versions and referenced form versions', async () => {
      const mockDoc = createMockDoc({ id: 'service-1' });
      dbMock.select = vi
        .fn()
        // 1. requireDocument
        .mockReturnValueOnce(createMockQuery([{ doc: mockDoc }]))
        // 2. applicationFormIds
        .mockReturnValueOnce(createMockQuery([{ formId: 'form-doc-1' }]));

      await service.archive('user-1', 'service-1');

      expect(dbMock.update).toHaveBeenCalledWith(documentVersions);
    });
  });

  describe('reactivate', () => {
    it('reactivates a service via reactivateServiceTx', async () => {
      const mockDoc = createMockDoc({ id: 'service-1' });
      dbMock.select.mockReturnValueOnce(createMockQuery([{ doc: mockDoc }])); // requireDocument

      await service.reactivate('user-1', 'service-1');

      expect(vi.mocked(reactivateServiceTx)).toHaveBeenCalledWith(txMock, 'service-1');
    });
  });
});

/**
 * Feature 174. getServiceDetail() must resolve `definition` per the version being read
 * (definitionsForVersions, keyed by document_versions.type_version_id), not via resolve()
 * (currently-published). Without this, publishing a reshaped Service type version renders every
 * existing service's details page as empty em-dashes.
 */
const versionRow = (over: Record<string, unknown>) => ({
  id: 'version-1',
  documentId: 'service-1',
  typeVersionId: 'type-version-1',
  version: 1,
  status: 'draft',
  data: {},
  createdAt: new Date('2026-07-12T00:00:00.000Z'),
  updatedAt: new Date('2026-07-12T00:00:00.000Z'),
  publishedAt: null,
  archivedAt: null,
  ...over,
});

describe('ServicesService.get — per-version definition (feature 174)', () => {
  let service: ServicesService;
  let dbMock: any;
  let serviceTypeResolverMock: any;

  const doc = {
    id: 'service-1',
    workspaceId: 'ws-1',
    title: 'Service Title',
    description: 'Service Desc',
    createdAt: new Date('2026-07-12T00:00:00.000Z'),
    updatedAt: new Date('2026-07-12T00:00:00.000Z'),
  };

  const arrange = (versions: unknown[]) => {
    dbMock.select = vi
      .fn()
      .mockReturnValueOnce(createMockQuery([{ doc }])) // requireDocument
      .mockReturnValueOnce(createMockQuery(versions)) // versionsOf (ascending)
      .mockReturnValueOnce(createMockQuery([{ n: 0 }])); // hasSubmissions
  };

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = Object.assign(Promise.resolve([]), {
      select: vi.fn().mockImplementation(() => createMockQuery([])),
    });
    serviceTypeResolverMock = {
      resolve: vi.fn(),
      definitionForVersion: vi.fn(),
      definitionsForVersions: vi.fn().mockResolvedValue({}),
    };
    service = new ServicesService(dbMock, serviceTypeResolverMock);
  });

  it('should resolve the definition from the selected version type_version_id', async () => {
    arrange([versionRow({ typeVersionId: 'tv-new', publishedAt: new Date() })]);
    serviceTypeResolverMock.definitionsForVersions.mockResolvedValue({
      'tv-new': { schema: { marker: 'new' }, uischema: {} },
    });

    const result = await service.get('user-1', 'service-1');

    expect(serviceTypeResolverMock.definitionsForVersions).toHaveBeenCalledWith(['tv-new']);
    expect(result.definition.schema).toEqual({ marker: 'new' });
    expect(result.definitions['tv-new']).toEqual({ schema: { marker: 'new' }, uischema: {} });
  });

  it('should return the OLD template for a version pinned to an older type version', async () => {
    // v1 (published) is pinned to the OLD type version; v2 (draft) to the new one. The service is
    // rendered from its published version, so it must get the OLD template — this is exactly the
    // case that rendered as all em-dashes before the fix.
    arrange([
      versionRow({ id: 'v1', version: 1, typeVersionId: 'tv-old', publishedAt: new Date() }),
      versionRow({ id: 'v2', version: 2, typeVersionId: 'tv-new' }),
    ]);
    serviceTypeResolverMock.definitionsForVersions.mockResolvedValue({
      'tv-old': { schema: { marker: 'old' }, uischema: {} },
      'tv-new': { schema: { marker: 'new' }, uischema: {} },
    });

    const result = await service.get('user-1', 'service-1');

    expect(serviceTypeResolverMock.definitionsForVersions).toHaveBeenCalledWith([
      'tv-old',
      'tv-new',
    ]);
    expect(result.definition.schema).toEqual({ marker: 'old' });
    // Both templates are available so the version picker can render either faithfully.
    expect(result.definitions['tv-old']?.schema).toEqual({ marker: 'old' });
    expect(result.definitions['tv-new']?.schema).toEqual({ marker: 'new' });
  });

  it('should not call resolve() (currently-published) on the read path', async () => {
    arrange([versionRow({})]);
    serviceTypeResolverMock.definitionsForVersions.mockResolvedValue({
      'type-version-1': { schema: {}, uischema: {} },
    });

    await service.get('user-1', 'service-1');

    expect(serviceTypeResolverMock.resolve).not.toHaveBeenCalled();
  });

  it('should fall back to the newest version when none is published', async () => {
    arrange([
      versionRow({ id: 'v1', version: 1, typeVersionId: 'tv-old' }),
      versionRow({ id: 'v2', version: 2, typeVersionId: 'tv-new' }),
    ]);
    serviceTypeResolverMock.definitionsForVersions.mockResolvedValue({
      'tv-old': { schema: { marker: 'old' }, uischema: {} },
      'tv-new': { schema: { marker: 'new' }, uischema: {} },
    });

    const result = await service.get('user-1', 'service-1');

    expect(result.definition.schema).toEqual({ marker: 'new' });
  });

  it('should return an empty definition for a service with no versions', async () => {
    arrange([]);

    const result = await service.get('user-1', 'service-1');

    expect(result.definition).toEqual({ schema: {}, uischema: {} });
    expect(result.definitions).toEqual({});
  });

  it('should return an empty definition when the pinned type version is missing', async () => {
    arrange([versionRow({ typeVersionId: 'tv-gone', publishedAt: new Date() })]);
    serviceTypeResolverMock.definitionsForVersions.mockResolvedValue({});

    const result = await service.get('user-1', 'service-1');

    expect(result.definition).toEqual({ schema: {}, uischema: {} });
  });

  it('should still use resolve() on the create path (a new service binds to the published type)', async () => {
    // Guard against an over-eager fix: CREATE must keep binding to the currently-published type
    // version, or new services would be authored against a stale template.
    const source = readFileSync(
      new URL('../../../../../src/modules/services/services/services.service.ts', import.meta.url),
      'utf8',
    );
    const createBody = source.slice(source.indexOf('async create('), source.indexOf('async get('));
    expect(createBody).toContain('this.serviceType.resolve()');
  });
});
