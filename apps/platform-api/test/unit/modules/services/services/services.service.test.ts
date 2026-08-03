import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ServicesService } from '../../../../../src/modules/services/services/services.service';
import {
  resolveApplications,
  insertApplication,
} from '../../../../../src/modules/services/util/applications';
import { reactivateServiceTx } from '../../../../../src/modules/services/util/version-copy';
import { documents, documentVersions } from '@repo/database';

vi.mock('../../../../../src/modules/services/util/applications', () => ({
  insertApplication: vi.fn(),
  resolveApplications: vi.fn(),
}));

vi.mock('../../../../../src/modules/services/util/version-copy', () => ({
  reactivateServiceTx: vi.fn(),
}));

const mockQuery = (resolvedValue: any) => {
  const qb = Promise.resolve(resolvedValue);
  return Object.assign(qb, {
    from: vi.fn().mockReturnValue(qb),
    innerJoin: vi.fn().mockReturnValue(qb),
    leftJoin: vi.fn().mockReturnValue(qb),
    limit: vi.fn().mockReturnValue(qb),
    orderBy: vi.fn().mockReturnValue(qb),
    where: vi.fn().mockReturnValue(qb),
    offset: vi.fn().mockReturnValue(qb),
    groupBy: vi.fn().mockReturnValue(qb),
  });
};

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
      select: vi.fn().mockImplementation(() => mockQuery([])),
    });

    dbMock = Object.assign(Promise.resolve([]), {
      transaction: vi.fn().mockImplementation((cb) => cb(txMock)),
      select: vi.fn().mockImplementation(() => mockQuery([])),
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
      dbMock.select.mockReturnValueOnce(mockQuery([{ role: 'member' }]));

      // 2. serviceType.resolve
      serviceTypeResolverMock.resolve.mockResolvedValue({
        typeId: 'type-1',
        typeVersionId: 'type-version-1',
      });

      // 3. resolveApplications mock
      vi.mocked(resolveApplications).mockResolvedValueOnce([]);

      const mockDoc = {
        id: 'service-doc-1',
        workspaceId: 'ws-1',
        title: 'New Service',
        kind: 'service',
        description: 'Service Desc',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
        updatedAt: new Date('2026-07-12T00:00:00.000Z'),
      };
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
      dbMock.select.mockReturnValueOnce(mockQuery([]));

      await expect(service.create('user-1', input)).rejects.toThrow(NotFoundException);
    });

    it('throws Error if documents insert returned no row', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([{ role: 'member' }]));
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
      dbMock.select.mockReturnValueOnce(mockQuery([{ role: 'member' }]));
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
      dbMock.select.mockReturnValueOnce(mockQuery([{ role: 'member' }]));
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
        .mockReturnValueOnce(mockQuery([{ role: 'member' }]))
        // 2. list documents select
        .mockReturnValueOnce(mockQuery([{ id: 'form-doc-1', title: 'Form 1', kind: 'basic-form' }]))
        // 3. versions for form select
        .mockReturnValueOnce(mockQuery([{ id: 'form-version-1', status: 'published' }]));

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
        .mockReturnValueOnce(mockQuery([{ role: 'member' }]))
        // 2. list documents select
        .mockReturnValueOnce(mockQuery([{ id: 'form-doc-1', title: 'Form 1', kind: 'basic-form' }]))
        // 3. versions for form select (no published)
        .mockReturnValueOnce(mockQuery([{ id: 'form-version-draft', status: 'draft' }]));

      const result = await service.listForms('user-1', 'ws-1');

      expect(result[0]!.versionId).toBe('form-version-draft');
    });

    it('ignores form document in catalog if it has no versions', async () => {
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ role: 'member' }]))
        // 2. list documents select
        .mockReturnValueOnce(mockQuery([{ id: 'form-doc-1', title: 'Form 1', kind: 'basic-form' }]))
        // 3. versions for form select (empty)
        .mockReturnValueOnce(mockQuery([]));

      const result = await service.listForms('user-1', 'ws-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('list', () => {
    it('returns summary of services in a workspace', async () => {
      dbMock.select = vi
        .fn()
        // 1. requireMembership select
        .mockReturnValueOnce(mockQuery([{ role: 'member' }]))
        // 2. docs select
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'service-1',
              workspaceId: 'ws-1',
              title: 'Service 1',
              description: 'desc',
              createdAt: new Date('2026-07-12T00:00:00.000Z'),
              updatedAt: new Date('2026-07-12T00:00:00.000Z'),
            },
          ]),
        )
        // 3. totals count select
        .mockReturnValueOnce(mockQuery([{ count: 1 }]))
        // 4. versionRows select
        .mockReturnValueOnce(
          mockQuery([
            {
              documentId: 'service-1',
              id: 'version-1',
              status: 'published',
              publishedAt: new Date(),
              version: 1,
            },
          ]),
        )
        // 5. submissionRows select
        .mockReturnValueOnce(mockQuery([]));

      serviceTypeResolverMock.resolve.mockResolvedValue({ typeId: 'type-1' });

      const result = await service.list('user-1', { workspaceId: 'ws-1' } as any);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.status).toBe('published');
      expect(result.items[0]!.versionCount).toBe(1);
      expect(result.items[0]!.hasSubmissions).toBe(false);
    });

    it('returns status draft when service only has draft versions', async () => {
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ role: 'member' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'service-1',
              workspaceId: 'ws-1',
              title: 'Service 1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        )
        .mockReturnValueOnce(mockQuery([{ count: 1 }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              documentId: 'service-1',
              id: 'version-1',
              status: 'draft',
              publishedAt: null,
              version: 1,
            },
          ]),
        )
        .mockReturnValueOnce(mockQuery([]));

      serviceTypeResolverMock.resolve.mockResolvedValue({ typeId: 'type-1' });

      const result = await service.list('user-1', { workspaceId: 'ws-1' } as any);
      expect(result.items[0]!.status).toBe('draft');
    });

    it('returns status archived when service only has archived versions', async () => {
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ role: 'member' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'service-1',
              workspaceId: 'ws-1',
              title: 'Service 1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        )
        .mockReturnValueOnce(mockQuery([{ count: 1 }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              documentId: 'service-1',
              id: 'version-1',
              status: 'archived',
              publishedAt: null,
              version: 1,
            },
          ]),
        )
        .mockReturnValueOnce(mockQuery([]));

      serviceTypeResolverMock.resolve.mockResolvedValue({ typeId: 'type-1' });

      const result = await service.list('user-1', { workspaceId: 'ws-1' } as any);
      expect(result.items[0]!.status).toBe('archived');
    });

    it('returns status none when service has no versions', async () => {
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ role: 'member' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'service-1',
              workspaceId: 'ws-1',
              title: 'Service 1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        )
        .mockReturnValueOnce(mockQuery([{ count: 1 }]))
        .mockReturnValueOnce(mockQuery([])) // empty versions
        .mockReturnValueOnce(mockQuery([]));

      serviceTypeResolverMock.resolve.mockResolvedValue({ typeId: 'type-1' });

      const result = await service.list('user-1', { workspaceId: 'ws-1' } as any);
      expect(result.items[0]!.status).toBe('none');
    });

    it('falls back to false for hasSubmissions if count query returns empty', async () => {
      dbMock.select = vi
        .fn()
        // 1. requireMembership select
        .mockReturnValueOnce(mockQuery([{ role: 'member' }]))
        // 2. docs select
        .mockReturnValueOnce(
          mockQuery([
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
        .mockReturnValueOnce(mockQuery([{ count: 1 }]))
        // 4. versionRows select
        .mockReturnValueOnce(
          mockQuery([
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
        .mockReturnValueOnce(mockQuery([]));

      serviceTypeResolverMock.resolve.mockResolvedValue({ typeId: 'type-1' });

      const result = await service.list('user-1', { workspaceId: 'ws-1' } as any);

      expect(result.items[0]!.hasSubmissions).toBe(false);
    });
  });

  describe('get', () => {
    it('successfully retrieves detailed service information', async () => {
      const mockDoc = {
        id: 'service-1',
        workspaceId: 'ws-1',
        title: 'Service Title',
        description: 'Service Desc',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
        updatedAt: new Date('2026-07-12T00:00:00.000Z'),
      };
      dbMock.select = vi
        .fn()
        // 1. requireDocument select
        .mockReturnValueOnce(mockQuery([{ doc: mockDoc }]))
        // 2. versionsOf select
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'version-1',
              documentId: 'service-1',
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
        .mockReturnValueOnce(mockQuery([{ n: 0 }]));

      serviceTypeResolverMock.resolve.mockResolvedValue({
        schema: { type: 'object' },
        uischema: {},
      });

      const result = await service.get('user-1', 'service-1');

      expect(result.service.id).toBe('service-1');
      expect(result.versions).toHaveLength(1);
      expect(result.definition.schema).toEqual({ type: 'object' });
    });

    it('throws NotFoundException if the service document is not found', async () => {
      dbMock.select = vi.fn().mockReturnValueOnce(mockQuery([])); // empty requireDocument

      await expect(service.get('user-1', 'service-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('successfully removes a service and its orphaned forms when no submissions exist', async () => {
      const mockDoc = { id: 'service-1' };
      dbMock.select = vi
        .fn()
        // 1. requireDocument select
        .mockReturnValueOnce(mockQuery([{ doc: mockDoc }]))
        // 2. hasSubmissions count select
        .mockReturnValueOnce(mockQuery([{ n: 0 }]))
        // 3. applicationFormIds select
        .mockReturnValueOnce(mockQuery([{ formId: 'form-doc-1' }]));

      // inside transaction: remaining count select
      txMock.select.mockReturnValueOnce(mockQuery([{ n: 0 }]));

      await service.remove('user-1', 'service-1');

      expect(txMock.delete).toHaveBeenNthCalledWith(1, documents);
      expect(txMock.delete).toHaveBeenNthCalledWith(2, documents); // orphaned form deleted
    });

    it('throws ConflictException if the service forms have submissions', async () => {
      const mockDoc = { id: 'service-1' };
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ doc: mockDoc }])) // requireDocument
        .mockReturnValueOnce(mockQuery([{ n: 5 }])); // hasSubmissions returns > 0

      await expect(service.remove('user-1', 'service-1')).rejects.toThrow(ConflictException);
    });

    it('does not delete form document if another service still references it', async () => {
      const mockDoc = { id: 'service-1' };
      dbMock.select = vi
        .fn()
        // 1. requireDocument select
        .mockReturnValueOnce(mockQuery([{ doc: mockDoc }]))
        // 2. hasSubmissions count select
        .mockReturnValueOnce(mockQuery([{ n: 0 }]))
        // 3. applicationFormIds select
        .mockReturnValueOnce(mockQuery([{ formId: 'form-doc-1' }]));

      // inside transaction: remaining count select (1 remaining reference)
      txMock.select.mockReturnValueOnce(mockQuery([{ n: 1 }]));

      await service.remove('user-1', 'service-1');

      expect(txMock.delete).toHaveBeenCalledTimes(1);
      expect(txMock.delete).toHaveBeenCalledWith(documents); // only deleted service doc
    });

    it('deletes form document if remaining count query returns empty', async () => {
      const mockDoc = { id: 'service-1' };
      dbMock.select = vi
        .fn()
        // 1. requireDocument select
        .mockReturnValueOnce(mockQuery([{ doc: mockDoc }]))
        // 2. hasSubmissions count select
        .mockReturnValueOnce(mockQuery([{ n: 0 }]))
        // 3. applicationFormIds select
        .mockReturnValueOnce(mockQuery([{ formId: 'form-doc-1' }]));

      // inside transaction: remaining count select (empty result)
      txMock.select.mockReturnValueOnce(mockQuery([]));

      await service.remove('user-1', 'service-1');

      expect(txMock.delete).toHaveBeenNthCalledWith(1, documents);
      expect(txMock.delete).toHaveBeenNthCalledWith(2, documents); // orphaned form deleted
    });
  });

  describe('archive', () => {
    it('archives all service versions and referenced form versions', async () => {
      const mockDoc = { id: 'service-1' };
      dbMock.select = vi
        .fn()
        // 1. requireDocument
        .mockReturnValueOnce(mockQuery([{ doc: mockDoc }]))
        // 2. applicationFormIds
        .mockReturnValueOnce(mockQuery([{ formId: 'form-doc-1' }]));

      await service.archive('user-1', 'service-1');

      expect(dbMock.update).toHaveBeenCalledWith(documentVersions);
    });
  });

  describe('reactivate', () => {
    it('reactivates a service via reactivateServiceTx', async () => {
      const mockDoc = { id: 'service-1' };
      dbMock.select.mockReturnValueOnce(mockQuery([{ doc: mockDoc }])); // requireDocument

      await service.reactivate('user-1', 'service-1');

      expect(vi.mocked(reactivateServiceTx)).toHaveBeenCalledWith(txMock, 'service-1');
    });
  });
});
