import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  type Database,
  documentReferences,
  documentVersions,
  documents,
  serviceAgreementConsents,
  workspaceDefaultAgreements,
} from '@repo/database';
import { ConsentService } from '../../../../../src/modules/applications/services/consent.service';

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
      onConflictDoNothing: vi.fn().mockReturnThis(),
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

describe('ConsentService Unit Tests', () => {
  let service: ConsentService;
  let dbMock: any;
  let mockResponse: any;

  beforeEach(() => {
    const mocks = createDbMock();
    dbMock = mocks.dbMock;
    mockResponse = mocks.mockResponse;
    service = new ConsentService(dbMock as unknown as Database);
  });

  describe('agreementsForService', () => {
    it('should throw NotFoundException if service is not found', async () => {
      mockResponse([], documents, 'select'); // no service found

      await expect(service.agreementsForService('user-1', 'svc-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return service agreements (attached and defaults, deduped, with latest user decision)', async () => {
      // 1. service check (documents query)
      mockResponse([{ versionId: 'svc-ver-1' }], documents, 'select');

      // 2. resolveForServiceVersion -> attached agreements select
      mockResponse(
        [
          {
            agreementDocumentId: 'agreement-doc-1',
            agreementVersionId: 'agreement-ver-1',
            data: { title: 'Attached Agreement', isOptional: false },
          },
        ],
        documentReferences,
        'select',
      );

      // 3. resolveForServiceVersion -> workspaceId select
      mockResponse([{ workspaceId: 'ws-1' }], documentVersions, 'select');

      // 4. resolveForServiceVersion -> default agreements select
      mockResponse(
        [
          {
            agreementDocumentId: 'agreement-doc-2',
            agreementVersionId: 'agreement-ver-2',
            data: { title: 'Default Agreement', isOptional: true },
          },
        ],
        workspaceDefaultAgreements,
        'select',
      );

      // 5. resolveForServiceVersion -> consent check for Default Agreement (since defaults are processed first)
      mockResponse([{ decision: 'approve' }], serviceAgreementConsents, 'select');

      // 6. resolveForServiceVersion -> consent check for Attached Agreement
      mockResponse([], serviceAgreementConsents, 'select');

      const result = await service.agreementsForService('user-1', 'svc-id');

      expect(result).toEqual([
        {
          agreementVersionId: 'agreement-ver-2',
          agreementDocumentId: 'agreement-doc-2',
          data: { title: 'Default Agreement', isOptional: true },
          decision: 'approve',
        },
        {
          agreementVersionId: 'agreement-ver-1',
          agreementDocumentId: 'agreement-doc-1',
          data: { title: 'Attached Agreement', isOptional: false },
          decision: null,
        },
      ]);
    });

    it('should deduplicate agreements by agreementDocumentId (defaults first)', async () => {
      // 1. service check (documents query)
      mockResponse([{ versionId: 'svc-ver-1' }], documents, 'select');

      // 2. resolveForServiceVersion -> attached agreements (contains agreement-doc-1)
      mockResponse(
        [
          {
            agreementDocumentId: 'agreement-doc-1',
            agreementVersionId: 'agreement-ver-1-attached',
            data: { title: 'Attached Agreement', isOptional: false },
          },
        ],
        documentReferences,
        'select',
      );

      // 3. resolveForServiceVersion -> workspaceId select
      mockResponse([{ workspaceId: 'ws-1' }], documentVersions, 'select');

      // 4. resolveForServiceVersion -> default agreements (also contains agreement-doc-1)
      mockResponse(
        [
          {
            agreementDocumentId: 'agreement-doc-1',
            agreementVersionId: 'agreement-ver-1-default',
            data: { title: 'Default Agreement', isOptional: true },
          },
        ],
        workspaceDefaultAgreements,
        'select',
      );

      // 5. resolveForServiceVersion -> consent check for Default Agreement (only agreement-ver-1-default is queried since the attached one is deduped)
      mockResponse([{ decision: 'approve' }], serviceAgreementConsents, 'select');

      const result = await service.agreementsForService('user-1', 'svc-id');

      // Verify that it only contains one item, which is the default version (defaults are processed first)
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        agreementVersionId: 'agreement-ver-1-default',
        agreementDocumentId: 'agreement-doc-1',
        data: { title: 'Default Agreement', isOptional: true },
        decision: 'approve',
      });
    });
  });

  describe('record', () => {
    it('should throw UnprocessableEntityException if not a published service agreement version', async () => {
      mockResponse([], documentVersions, 'select');

      await expect(service.record('user-1', 'agreement-ver-1', 'approve')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should skip write if latest decision is already the same', async () => {
      // 1. agreement check
      mockResponse([{ agreementDocumentId: 'agreement-doc-1' }], documentVersions, 'select');
      // 2. latest consent check
      mockResponse([{ decision: 'approve' }], serviceAgreementConsents, 'select');

      const result = await service.record('user-1', 'agreement-ver-1', 'approve');

      expect(result).toEqual({
        agreementVersionId: 'agreement-ver-1',
        decision: 'approve',
      });
      // We expect no further mock responses since it should return early and not insert
    });

    it('should insert new consent decision if different or does not exist', async () => {
      // 1. agreement check
      mockResponse([{ agreementDocumentId: 'agreement-doc-1' }], documentVersions, 'select');
      // 2. latest consent check (empty -> does not exist)
      mockResponse([], serviceAgreementConsents, 'select');
      // 3. insert call response
      mockResponse([], serviceAgreementConsents, 'insert');

      const result = await service.record('user-1', 'agreement-ver-1', 'approve');

      expect(result).toEqual({
        agreementVersionId: 'agreement-ver-1',
        decision: 'approve',
      });
    });
  });

  describe('assertSubmittableForForm', () => {
    it('should return undefined (no gate) if form version is not linked to a service', async () => {
      mockResponse([], documentReferences, 'select'); // no service version reference found

      await expect(
        service.assertSubmittableForForm('user-1', 'form-ver-1'),
      ).resolves.toBeUndefined();
    });

    it('should throw UnprocessableEntityException if a required service agreement is not approved', async () => {
      // 1. get serviceVersionId
      mockResponse([{ serviceVersionId: 'svc-ver-1' }], documentReferences, 'select');
      // 2. resolveForServiceVersion -> attached agreements
      mockResponse(
        [
          {
            agreementDocumentId: 'agreement-doc-1',
            agreementVersionId: 'agreement-ver-1',
            data: { title: 'Required Agreement', isOptional: false },
          },
        ],
        documentReferences,
        'select',
      );
      // 3. resolveForServiceVersion -> workspaceId
      mockResponse([{ workspaceId: 'ws-1' }], documentVersions, 'select');
      // 4. resolveForServiceVersion -> default agreements
      mockResponse([], workspaceDefaultAgreements, 'select');
      // 5. resolveForServiceVersion -> consent check (rejected instead of approved)
      mockResponse([{ decision: 'reject' }], serviceAgreementConsents, 'select');

      await expect(service.assertSubmittableForForm('user-1', 'form-ver-1')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should throw UnprocessableEntityException if any agreement is not decided (decision is null)', async () => {
      // 1. get serviceVersionId
      mockResponse([{ serviceVersionId: 'svc-ver-1' }], documentReferences, 'select');
      // 2. resolveForServiceVersion -> attached agreements
      mockResponse(
        [
          {
            agreementDocumentId: 'agreement-doc-1',
            agreementVersionId: 'agreement-ver-1',
            data: { title: 'Optional Agreement', isOptional: true },
          },
        ],
        documentReferences,
        'select',
      );
      // 3. resolveForServiceVersion -> workspaceId
      mockResponse([{ workspaceId: 'ws-1' }], documentVersions, 'select');
      // 4. resolveForServiceVersion -> default agreements
      mockResponse([], workspaceDefaultAgreements, 'select');
      // 5. resolveForServiceVersion -> consent check (no decision)
      mockResponse([], serviceAgreementConsents, 'select');

      await expect(service.assertSubmittableForForm('user-1', 'form-ver-1')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should succeed if all required agreements are approved and all optional agreements are decided', async () => {
      // 1. get serviceVersionId
      mockResponse([{ serviceVersionId: 'svc-ver-1' }], documentReferences, 'select');
      // 2. resolveForServiceVersion -> attached agreements
      mockResponse(
        [
          {
            agreementDocumentId: 'agreement-doc-1',
            agreementVersionId: 'agreement-ver-1',
            data: { title: 'Required Agreement', isOptional: false },
          },
          {
            agreementDocumentId: 'agreement-doc-2',
            agreementVersionId: 'agreement-ver-2',
            data: { title: 'Optional Agreement', isOptional: true },
          },
        ],
        documentReferences,
        'select',
      );
      // 3. resolveForServiceVersion -> workspaceId
      mockResponse([{ workspaceId: 'ws-1' }], documentVersions, 'select');
      // 4. resolveForServiceVersion -> default agreements
      mockResponse([], workspaceDefaultAgreements, 'select');
      // 5. resolveForServiceVersion -> consent check for Required Agreement
      mockResponse([{ decision: 'approve' }], serviceAgreementConsents, 'select');
      // 6. resolveForServiceVersion -> consent check for Optional Agreement
      mockResponse([{ decision: 'reject' }], serviceAgreementConsents, 'select');

      await expect(
        service.assertSubmittableForForm('user-1', 'form-ver-1'),
      ).resolves.toBeUndefined();
    });

    it('should fall back to "Service agreement" if title is not a string', async () => {
      // 1. get serviceVersionId
      mockResponse([{ serviceVersionId: 'svc-ver-1' }], documentReferences, 'select');
      // 2. resolveForServiceVersion -> attached agreements
      mockResponse(
        [
          {
            agreementDocumentId: 'agreement-doc-1',
            agreementVersionId: 'agreement-ver-1',
            data: { isOptional: false },
          },
        ],
        documentReferences,
        'select',
      );
      // 3. resolveForServiceVersion -> workspaceId
      mockResponse([{ workspaceId: 'ws-1' }], documentVersions, 'select');
      // 4. resolveForServiceVersion -> default agreements
      mockResponse([], workspaceDefaultAgreements, 'select');
      // 5. resolveForServiceVersion -> consent check (rejected)
      mockResponse([{ decision: 'reject' }], serviceAgreementConsents, 'select');

      try {
        await service.assertSubmittableForForm('user-1', 'form-ver-1');
        expect.fail('should have thrown UnprocessableEntityException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(UnprocessableEntityException);
        expect(err.getResponse().errors).toContain('Service agreement');
      }
    });

    it('should skip querying default agreements if workspaceId is null', async () => {
      // 1. get serviceVersionId
      mockResponse([{ serviceVersionId: 'svc-ver-1' }], documentReferences, 'select');
      // 2. resolveForServiceVersion -> attached agreements
      mockResponse(
        [
          {
            agreementDocumentId: 'agreement-doc-1',
            agreementVersionId: 'agreement-ver-1',
            data: { title: 'Attached Agreement', isOptional: false },
          },
        ],
        documentReferences,
        'select',
      );
      // 3. resolveForServiceVersion -> workspaceId query returns empty (workspaceId is null)
      mockResponse([], documentVersions, 'select');
      // 4. resolveForServiceVersion -> consent check for Attached Agreement (workspaceDefaultAgreements query is skipped)
      mockResponse([{ decision: 'approve' }], serviceAgreementConsents, 'select');

      await expect(
        service.assertSubmittableForForm('user-1', 'form-ver-1'),
      ).resolves.toBeUndefined();
    });
  });
});
