import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ReferencesService } from '../../../../../src/modules/services/services/references.service';
import {
  documents,
  documentVersions,
  documentReferences,
  documentTypes,
  submissions,
} from '@repo/database';

describe('ReferencesService', () => {
  let service: ReferencesService;
  let dbMock: any;
  let txMock: any;
  let servicesServiceMock: any;
  let tableResponses: Map<any, any[]>;

  const addMockResponse = (table: any, value: any) => {
    if (!tableResponses.has(table)) {
      tableResponses.set(table, []);
    }
    tableResponses.get(table)!.push(value);
  };

  const createSelectBuilder = () => {
    let resolvedValue: any = [];
    /* eslint-disable unicorn/no-thenable */
    const qb: any = {
      then: (onfulfilled: any) => Promise.resolve(resolvedValue).then(onfulfilled),
    };
    /* eslint-enable unicorn/no-thenable */
    qb.from = vi.fn().mockImplementation((table) => {
      const list = tableResponses.get(table) || [];
      resolvedValue = list.shift() ?? [];
      return qb;
    });
    qb.innerJoin = vi.fn().mockReturnValue(qb);
    qb.leftJoin = vi.fn().mockReturnValue(qb);
    qb.where = vi.fn().mockReturnValue(qb);
    qb.orderBy = vi.fn().mockReturnValue(qb);
    qb.limit = vi.fn().mockReturnValue(qb);
    return qb;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tableResponses = new Map();

    txMock = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      delete: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      select: vi.fn().mockImplementation(() => createSelectBuilder()),
    };

    dbMock = {
      transaction: vi.fn().mockImplementation(async (cb) => cb(txMock)),
      select: vi.fn().mockImplementation(() => createSelectBuilder()),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      where: vi.fn().mockReturnThis(),
    };

    servicesServiceMock = {
      requireDocument: vi.fn(),
    };

    service = new ReferencesService(dbMock, servicesServiceMock);
  });

  describe('list', () => {
    it('returns ReferenceResponse items for a service version', async () => {
      // 1. servicesService.requireDocument
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });

      const mockCreatedAt = new Date('2026-07-12T00:00:00.000Z');
      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentReferences, [
        {
          ref: {
            id: 'ref-1',
            relation: 'application_form',
            position: 0,
            label: 'Form 1',
            targetDocumentId: 'form-1',
            targetVersionId: 'version-1',
            targetKind: 'basic-form',
            createdAt: mockCreatedAt,
          },
          targetTitle: 'Form 1 Title',
          targetVersion: 1,
          targetStatus: 'draft',
          hasSubmissions: false,
        },
      ]);

      const result = await service.list('user-1', 'service-1', 'owner-version-1');

      expect(servicesServiceMock.requireDocument).toHaveBeenCalledWith('user-1', 'service-1');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'ref-1',
        relation: 'application_form',
        position: 0,
        label: 'Form 1',
        targetDocumentId: 'form-1',
        targetVersionId: 'version-1',
        targetKind: 'basic-form',
        targetTitle: 'Form 1 Title',
        targetVersion: 1,
        targetStatus: 'draft',
        hasSubmissions: false,
        hasStructure: false,
        url: null,
        createdAt: '2026-07-12T00:00:00.000Z',
      });
    });

    it('throws NotFoundException if the owner service version is not found', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      addMockResponse(documentVersions, []); // no version found

      await expect(service.list('user-1', 'service-1', 'owner-version-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('sets url to null in list if external application targetData is null or invalid', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      const mockCreatedAt = new Date('2026-07-12T00:00:00.000Z');

      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentReferences, [
        {
          ref: {
            id: 'ref-1',
            relation: 'external_application',
            position: 0,
            label: 'External Method',
            targetDocumentId: 'ext-1',
            targetVersionId: 'version-1',
            targetKind: 'external-application',
            createdAt: mockCreatedAt,
          },
          targetTitle: 'External Method Title',
          targetVersion: 1,
          targetStatus: 'draft',
          targetData: null, // targetData is null
          hasSubmissions: false,
        },
      ]);

      const result = await service.list('user-1', 'service-1', 'owner-version-1');
      expect(result[0]!.url).toBeNull();
    });

    it('sets url to null in list if external application targetData url is not a string', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      const mockCreatedAt = new Date('2026-07-12T00:00:00.000Z');

      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentReferences, [
        {
          ref: {
            id: 'ref-1',
            relation: 'external_application',
            position: 0,
            label: 'External Method',
            targetDocumentId: 'ext-1',
            targetVersionId: 'version-1',
            targetKind: 'external-application',
            createdAt: mockCreatedAt,
          },
          targetTitle: 'External Method Title',
          targetVersion: 1,
          targetStatus: 'draft',
          targetData: { url: 123 }, // url is a number
          hasSubmissions: false,
        },
      ]);

      const result = await service.list('user-1', 'service-1', 'owner-version-1');
      expect(result[0]!.url).toBeNull();
    });

    it('returns ReferenceResponse for external_application reference with its URL resolved', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      const mockCreatedAt = new Date('2026-07-12T00:00:00.000Z');

      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentReferences, [
        {
          ref: {
            id: 'ref-1',
            relation: 'external_application',
            position: 0,
            label: 'External Method',
            targetDocumentId: 'ext-1',
            targetVersionId: 'version-1',
            targetKind: 'external-application',
            createdAt: mockCreatedAt,
          },
          targetTitle: 'External Method Title',
          targetVersion: 1,
          targetStatus: 'draft',
          targetData: { url: 'https://example.com/apply' }, // url is a string
          hasSubmissions: false,
        },
      ]);

      const result = await service.list('user-1', 'service-1', 'owner-version-1');
      expect(result[0]!.url).toBe('https://example.com/apply');
    });
  });

  describe('add', () => {
    const input = {
      targetVersionId: 'target-version-1',
      relation: 'application_form' as const,
      label: 'My Reference',
    };

    it('successfully adds a reference to a draft service version', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });

      const mockCreatedAt = new Date('2026-07-12T00:00:00.000Z');
      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentVersions, [
        {
          documentId: 'target-doc-1',
          kind: 'basic-form',
          workspaceId: 'ws-1',
          title: 'Target Title',
          version: 2,
        },
      ]);
      addMockResponse(documentReferences, [{ max: 0 }]); // nextPosition select max

      dbMock.returning.mockResolvedValueOnce([
        {
          id: 'ref-1',
          relation: 'application_form',
          position: 1,
          label: 'My Reference',
          targetDocumentId: 'target-doc-1',
          targetVersionId: 'target-version-1',
          targetKind: 'basic-form',
          createdAt: mockCreatedAt,
        },
      ]);

      const result = await service.add('user-1', 'service-1', 'owner-version-1', input);

      expect(result.id).toBe('ref-1');
      expect(result.targetTitle).toBe('Target Title');
      expect(result.targetVersion).toBe(2);
    });

    it('throws BadRequestException if target is in a different workspace', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });

      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentVersions, [
        {
          documentId: 'target-doc-1',
          kind: 'basic-form',
          workspaceId: 'ws-2',
          title: 'Target Title',
          version: 2,
        },
      ]);

      await expect(service.add('user-1', 'service-1', 'owner-version-1', input)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if the service references itself', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });

      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentVersions, [
        {
          documentId: 'service-1',
          kind: 'service',
          workspaceId: 'ws-1',
          title: 'Service Title',
          version: 1,
        },
      ]);

      await expect(service.add('user-1', 'service-1', 'owner-version-1', input)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if target kind does not match reference relation', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });

      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentVersions, [
        {
          documentId: 'target-service-1',
          kind: 'service',
          workspaceId: 'ws-1',
          title: 'Service Target Title',
          version: 1,
        },
      ]);

      await expect(service.add('user-1', 'service-1', 'owner-version-1', input)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws ConflictException if inserting duplicate reference causes primary key violation', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });

      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentVersions, [
        {
          documentId: 'target-doc-1',
          kind: 'basic-form',
          workspaceId: 'ws-1',
          title: 'Target Title',
          version: 1,
        },
      ]);
      addMockResponse(documentReferences, [{ max: 0 }]);

      const dbError = new Error('duplicate key');
      (dbError as any).code = '23505';
      dbMock.returning.mockRejectedValueOnce(dbError);

      await expect(service.add('user-1', 'service-1', 'owner-version-1', input)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws Error if reference insert returned no row', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });

      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentVersions, [
        {
          documentId: 'target-doc-1',
          kind: 'basic-form',
          workspaceId: 'ws-1',
          title: 'Target Title',
          version: 2,
        },
      ]);
      addMockResponse(documentReferences, [{ max: 0 }]);

      dbMock.returning.mockResolvedValueOnce([]); // empty reference insert

      await expect(service.add('user-1', 'service-1', 'owner-version-1', input)).rejects.toThrow(
        new Error('reference insert returned no row'),
      );
    });

    it('throws ConflictException if references are updated on non-draft service version', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });

      addMockResponse(documentVersions, [{ status: 'published' }]); // non-draft

      await expect(service.add('user-1', 'service-1', 'owner-version-1', input)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFoundException if target document version is not found', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });

      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentVersions, []); // target not found

      await expect(service.add('user-1', 'service-1', 'owner-version-1', input)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('successfully adds related_service reference targeting a service', async () => {
      const relatedInput = {
        targetVersionId: 'target-version-1',
        relation: 'related_service' as const,
        label: 'Related Service Ref',
      };
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });

      const mockCreatedAt = new Date('2026-07-12T00:00:00.000Z');
      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentVersions, [
        {
          documentId: 'target-doc-1',
          kind: 'service',
          workspaceId: 'ws-1',
          title: 'Target Title',
          version: 2,
        },
      ]);
      addMockResponse(documentReferences, [{ max: 0 }]);

      dbMock.returning.mockResolvedValueOnce([
        {
          id: 'ref-1',
          relation: 'related_service',
          position: 1,
          label: 'Related Service Ref',
          targetDocumentId: 'target-doc-1',
          targetVersionId: 'target-version-1',
          targetKind: 'service',
          createdAt: mockCreatedAt,
        },
      ]);

      const result = await service.add('user-1', 'service-1', 'owner-version-1', relatedInput);

      expect(result.id).toBe('ref-1');
      expect(result.targetKind).toBe('service');
    });

    it('throws BadRequestException if related_service reference targets a non-service document', async () => {
      const relatedInput = {
        targetVersionId: 'target-version-1',
        relation: 'related_service' as const,
      };
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });

      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentVersions, [
        {
          documentId: 'target-doc-1',
          kind: 'basic-form', // invalid for related_service
          workspaceId: 'ws-1',
          title: 'Target Title',
          version: 2,
        },
      ]);

      await expect(
        service.add('user-1', 'service-1', 'owner-version-1', relatedInput),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if inserting duplicate reference causes unique violation wrapped in cause', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });

      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentVersions, [
        {
          documentId: 'target-doc-1',
          kind: 'basic-form',
          workspaceId: 'ws-1',
          title: 'Target Title',
          version: 1,
        },
      ]);
      addMockResponse(documentReferences, [{ max: 0 }]);

      const dbError = new Error('duplicate key');
      (dbError as any).cause = { code: '23505' };
      dbMock.returning.mockRejectedValueOnce(dbError);

      await expect(service.add('user-1', 'service-1', 'owner-version-1', input)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rethrows string/non-object error if insert throws a non-object', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });

      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentVersions, [
        {
          documentId: 'target-doc-1',
          kind: 'basic-form',
          workspaceId: 'ws-1',
          title: 'Target Title',
          version: 1,
        },
      ]);
      addMockResponse(documentReferences, [{ max: 0 }]);

      dbMock.returning.mockRejectedValueOnce('raw string error');

      await expect(service.add('user-1', 'service-1', 'owner-version-1', input)).rejects.toThrow(
        'raw string error',
      );
    });

    it('successfully adds reference with null label when label is omitted', async () => {
      const inputNoLabel = {
        targetVersionId: 'target-version-1',
        relation: 'application_form' as const,
      };
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });

      const mockCreatedAt = new Date('2026-07-12T00:00:00.000Z');
      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentVersions, [
        {
          documentId: 'target-doc-1',
          kind: 'basic-form',
          workspaceId: 'ws-1',
          title: 'Target Title',
          version: 2,
        },
      ]);
      addMockResponse(documentReferences, [{ max: 0 }]);

      dbMock.returning.mockResolvedValueOnce([
        {
          id: 'ref-1',
          relation: 'application_form',
          position: 1,
          label: null,
          targetDocumentId: 'target-doc-1',
          targetVersionId: 'target-version-1',
          targetKind: 'basic-form',
          createdAt: mockCreatedAt,
        },
      ]);

      const result = await service.add('user-1', 'service-1', 'owner-version-1', inputNoLabel);

      expect(result.label).toBeNull();
    });
  });

  describe('remove', () => {
    it('successfully unlinks related service reference', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      const mockRef = {
        id: 'ref-1',
        relation: 'related_service',
        targetDocumentId: 'target-doc-1',
      };

      addMockResponse(documentVersions, [{ status: 'draft' }]); // requireOwnerVersion
      addMockResponse(documentReferences, [mockRef]); // requireReference

      await service.remove('user-1', 'service-1', 'owner-version-1', 'ref-1');

      expect(dbMock.delete).toHaveBeenCalledWith(documentReferences);
    });

    it('successfully unlinks application form if there are other references to it', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      const mockRef = {
        id: 'ref-1',
        relation: 'application_form',
        targetDocumentId: 'target-form-1',
      };

      addMockResponse(documentVersions, [{ status: 'draft' }]); // requireOwnerVersion
      addMockResponse(documentReferences, [mockRef]); // requireReference
      addMockResponse(documentReferences, [{ n: 2 }]); // count of references

      await service.remove('user-1', 'service-1', 'owner-version-1', 'ref-1');

      expect(dbMock.delete).toHaveBeenCalledWith(documentReferences);
    });

    it('deletes application form completely (along with reference) inside transaction if this is the last reference and form has no submissions', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      const mockRef = {
        id: 'ref-1',
        relation: 'application_form',
        targetDocumentId: 'target-form-1',
      };

      addMockResponse(documentVersions, [{ status: 'draft' }]); // requireOwnerVersion
      addMockResponse(documentReferences, [mockRef]); // requireReference
      addMockResponse(documentReferences, [{ n: 1 }]); // count of references
      addMockResponse(submissions, [{ n: 0 }]); // submission count

      await service.remove('user-1', 'service-1', 'owner-version-1', 'ref-1');

      expect(dbMock.transaction).toHaveBeenCalledTimes(1);
      expect(txMock.delete).toHaveBeenNthCalledWith(1, documentReferences);
      expect(txMock.delete).toHaveBeenNthCalledWith(2, documents);
    });

    it('throws ConflictException on last reference removal if the form has submissions', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      const mockRef = {
        id: 'ref-1',
        relation: 'application_form',
        targetDocumentId: 'target-form-1',
      };

      addMockResponse(documentVersions, [{ status: 'draft' }]); // requireOwnerVersion
      addMockResponse(documentReferences, [mockRef]); // requireReference
      addMockResponse(documentReferences, [{ n: 1 }]); // count of references
      addMockResponse(submissions, [{ n: 5 }]); // submission count

      await expect(
        service.remove('user-1', 'service-1', 'owner-version-1', 'ref-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException if reference is not found', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });

      addMockResponse(documentVersions, [{ status: 'draft' }]); // requireOwnerVersion
      addMockResponse(documentReferences, []); // requireReference returns empty

      await expect(
        service.remove('user-1', 'service-1', 'owner-version-1', 'ref-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('deletes application form completely when references and submissions count queries return empty', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      const mockRef = {
        id: 'ref-1',
        relation: 'application_form',
        targetDocumentId: 'target-form-1',
      };

      addMockResponse(documentVersions, [{ status: 'draft' }]); // requireOwnerVersion
      addMockResponse(documentReferences, [mockRef]); // requireReference
      addMockResponse(documentReferences, []); // empty reference count query (falls back to 0)
      addMockResponse(submissions, []); // empty submission count query (falls back to 0)

      await service.remove('user-1', 'service-1', 'owner-version-1', 'ref-1');

      expect(dbMock.transaction).toHaveBeenCalledTimes(1);
      expect(txMock.delete).toHaveBeenNthCalledWith(1, documentReferences);
      expect(txMock.delete).toHaveBeenNthCalledWith(2, documents);
    });

    it('deletes external_application completely when removing its last reference', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      const mockRef = {
        id: 'ref-1',
        relation: 'external_application',
        targetDocumentId: 'ext-doc-1',
      };

      addMockResponse(documentVersions, [{ status: 'draft' }]); // requireOwnerVersion
      addMockResponse(documentReferences, [mockRef]); // requireReference
      addMockResponse(documentReferences, [{ n: 1 }]); // count of references (last one)

      await service.remove('user-1', 'service-1', 'owner-version-1', 'ref-1');

      expect(dbMock.transaction).toHaveBeenCalledTimes(1);
      expect(txMock.delete).toHaveBeenNthCalledWith(1, documentReferences);
      expect(txMock.delete).toHaveBeenNthCalledWith(2, documents);
    });
  });

  describe('archive', () => {
    it('sets archived_at on application form version', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      const mockRef = {
        id: 'ref-1',
        relation: 'application_form',
        targetVersionId: 'target-version-1',
      };

      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentReferences, [mockRef]);

      await service.archive('user-1', 'service-1', 'owner-version-1', 'ref-1');

      expect(dbMock.update).toHaveBeenCalledWith(documentVersions);
    });

    it('throws BadRequestException if relation is not application_form', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      const mockRef = {
        id: 'ref-1',
        relation: 'related_service',
        targetVersionId: 'target-version-1',
      };

      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentReferences, [mockRef]);

      await expect(
        service.archive('user-1', 'service-1', 'owner-version-1', 'ref-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws Error if pinnedVersion targetVersionId is null during archive', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      const mockRef = {
        id: 'ref-1',
        relation: 'application_form',
        targetVersionId: null,
      };

      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentReferences, [mockRef]);

      await expect(
        service.archive('user-1', 'service-1', 'owner-version-1', 'ref-1'),
      ).rejects.toThrow('form target_version_id is unexpectedly null');
    });
  });

  describe('createForm', () => {
    const input = {
      typeId: 'type-1',
      title: 'Referenced Form Title',
      label: 'Start application',
    };

    it('successfully creates form document, draft version, and reference in a transaction', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });

      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentTypes, [
        {
          kind: 'basic-form',
          typeVersionId: 'type-version-1',
          definition: { schema: {}, uischema: {} },
        },
      ]);
      addMockResponse(documentReferences, [{ max: null }]); // nextPosition max position

      const mockDoc = { id: 'form-doc-1' };
      const mockVersion = { id: 'form-version-1', version: 1 };
      const mockRef = {
        id: 'ref-1',
        relation: 'application_form',
        position: 0,
        label: 'Start application',
        targetDocumentId: 'form-doc-1',
        targetVersionId: 'form-version-1',
        targetKind: 'basic-form',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };

      txMock.returning
        .mockResolvedValueOnce([mockDoc]) // inserted doc
        .mockResolvedValueOnce([mockVersion]) // inserted version
        .mockResolvedValueOnce([mockRef]); // inserted reference

      const result = await service.createForm('user-1', 'service-1', 'owner-version-1', input);

      expect(dbMock.transaction).toHaveBeenCalledTimes(1);
      expect(txMock.insert).toHaveBeenNthCalledWith(1, documents);
      expect(txMock.insert).toHaveBeenNthCalledWith(2, documentVersions);
      expect(txMock.insert).toHaveBeenNthCalledWith(3, documentReferences);

      expect(result.id).toBe('ref-1');
      expect(result.targetTitle).toBe('Referenced Form Title');
    });

    it('throws UnprocessableEntityException if the typeId is not found', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });

      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentTypes, []); // loadFormType returns nothing

      await expect(
        service.createForm('user-1', 'service-1', 'owner-version-1', input),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws Error if form document insert returned no row', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });

      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentTypes, [
        {
          kind: 'basic-form',
          typeVersionId: 'type-version-1',
          definition: { schema: {}, uischema: {} },
        },
      ]);
      addMockResponse(documentReferences, [{ max: null }]);

      txMock.returning.mockResolvedValueOnce([]); // empty doc insert

      await expect(
        service.createForm('user-1', 'service-1', 'owner-version-1', input),
      ).rejects.toThrow(new Error('form document insert returned no row'));
    });

    it('throws Error if form version insert returned no row', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });

      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentTypes, [
        {
          kind: 'basic-form',
          typeVersionId: 'type-version-1',
          definition: { schema: {}, uischema: {} },
        },
      ]);
      addMockResponse(documentReferences, [{ max: null }]);

      txMock.returning.mockResolvedValueOnce([{ id: 'form-doc-1' }]).mockResolvedValueOnce([]); // empty version insert

      await expect(
        service.createForm('user-1', 'service-1', 'owner-version-1', input),
      ).rejects.toThrow(new Error('form version insert returned no row'));
    });

    it('throws Error if reference insert returned no row', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });

      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentTypes, [
        {
          kind: 'basic-form',
          typeVersionId: 'type-version-1',
          definition: { schema: {}, uischema: {} },
        },
      ]);
      addMockResponse(documentReferences, [{ max: null }]);

      txMock.returning
        .mockResolvedValueOnce([{ id: 'form-doc-1' }])
        .mockResolvedValueOnce([{ id: 'form-version-1', version: 1 }])
        .mockResolvedValueOnce([]); // empty reference insert

      await expect(
        service.createForm('user-1', 'service-1', 'owner-version-1', input),
      ).rejects.toThrow(new Error('reference insert returned no row'));
    });

    it('throws BadRequestException if the form type kind is not basic-form or multi-stage-form', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });

      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentTypes, [
        {
          kind: 'service', // invalid form type kind
          typeVersionId: 'type-version-1',
          definition: { schema: {}, uischema: {} },
        },
      ]);

      await expect(
        service.createForm('user-1', 'service-1', 'owner-version-1', input),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully creates form and reference with null label when label is omitted', async () => {
      const inputNoLabel = {
        typeId: 'type-1',
        title: 'Referenced Form Title',
      };
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });

      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentTypes, [
        {
          kind: 'basic-form',
          typeVersionId: 'type-version-1',
          definition: { schema: {}, uischema: {} },
        },
      ]);
      addMockResponse(documentReferences, [{ max: null }]);

      const mockDoc = { id: 'form-doc-1' };
      const mockVersion = { id: 'form-version-1', version: 1 };
      const mockRef = {
        id: 'ref-1',
        relation: 'application_form',
        position: 0,
        label: null,
        targetDocumentId: 'form-doc-1',
        targetVersionId: 'form-version-1',
        targetKind: 'basic-form',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };

      txMock.returning
        .mockResolvedValueOnce([mockDoc])
        .mockResolvedValueOnce([mockVersion])
        .mockResolvedValueOnce([mockRef]);

      const result = await service.createForm(
        'user-1',
        'service-1',
        'owner-version-1',
        inputNoLabel,
      );

      expect(result.label).toBeNull();
    });
  });

  describe('createExternal', () => {
    it('throws UnprocessableEntityException if external document type is not seeded', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentTypes, []); // loadExternalType returns empty

      await expect(
        service.createExternal('user-1', 'service-1', 'owner-version-1', {
          label: 'External Application',
          url: 'https://example.com/apply',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws Error if external document insert returned no row', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentTypes, [
        { typeId: 'ext-type-1', typeVersionId: 'ext-type-version-1' },
      ]);
      addMockResponse(documentReferences, [{ max: 1 }]);

      txMock.returning.mockResolvedValueOnce([]); // empty document insert

      await expect(
        service.createExternal('user-1', 'service-1', 'owner-version-1', {
          label: 'External Application',
          url: 'https://example.com/apply',
        }),
      ).rejects.toThrow('external application document insert returned no row');
    });

    it('throws Error if external application version insert returned no row', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentTypes, [
        { typeId: 'ext-type-1', typeVersionId: 'ext-type-version-1' },
      ]);
      addMockResponse(documentReferences, [{ max: 1 }]);

      txMock.returning
        .mockResolvedValueOnce([{ id: 'ext-doc-1' }]) // doc insert success
        .mockResolvedValueOnce([]); // version insert empty

      await expect(
        service.createExternal('user-1', 'service-1', 'owner-version-1', {
          label: 'External Application',
          url: 'https://example.com/apply',
        }),
      ).rejects.toThrow('external application version insert returned no row');
    });

    it('throws Error if reference insert returned no row', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentTypes, [
        { typeId: 'ext-type-1', typeVersionId: 'ext-type-version-1' },
      ]);
      addMockResponse(documentReferences, [{ max: 1 }]);

      txMock.returning
        .mockResolvedValueOnce([{ id: 'ext-doc-1' }])
        .mockResolvedValueOnce([{ id: 'ext-version-1', version: 1 }])
        .mockResolvedValueOnce([]); // reference insert empty

      await expect(
        service.createExternal('user-1', 'service-1', 'owner-version-1', {
          label: 'External Application',
          url: 'https://example.com/apply',
        }),
      ).rejects.toThrow('reference insert returned no row');
    });

    it('creates external document, version, and reference successfully', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentTypes, [
        { typeId: 'ext-type-1', typeVersionId: 'ext-type-version-1' },
      ]);
      addMockResponse(documentReferences, [{ max: 1 }]);

      const mockDoc = { id: 'ext-doc-1' };
      const mockVersion = { id: 'ext-version-1', version: 1 };
      const mockRef = {
        id: 'ref-1',
        relation: 'external_application',
        position: 2,
        label: 'External Application',
        targetDocumentId: 'ext-doc-1',
        targetVersionId: 'ext-version-1',
        targetKind: 'external-application',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };

      txMock.returning
        .mockResolvedValueOnce([mockDoc])
        .mockResolvedValueOnce([mockVersion])
        .mockResolvedValueOnce([mockRef]);

      const result = await service.createExternal('user-1', 'service-1', 'owner-version-1', {
        label: 'External Application',
        url: 'https://example.com/apply',
      });

      expect(result).toEqual({
        id: 'ref-1',
        relation: 'external_application',
        position: 2,
        label: 'External Application',
        url: 'https://example.com/apply',
        targetDocumentId: 'ext-doc-1',
        targetVersionId: 'ext-version-1',
        targetKind: 'external-application',
        targetTitle: 'External Application',
        targetVersion: 1,
        targetStatus: 'draft',
        hasSubmissions: false,
        hasStructure: true,
        createdAt: new Date('2026-07-12T00:00:00.000Z').toISOString(),
      });
    });
  });

  describe('updateExternal', () => {
    it('throws BadRequestException if the target reference is not an external application method', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentReferences, [
        {
          id: 'ref-1',
          relation: 'application_form', // not external_application
          targetDocumentId: 'doc-1',
          targetVersionId: 'ver-1',
        },
      ]);

      await expect(
        service.updateExternal('user-1', 'service-1', 'owner-version-1', 'ref-1', {
          label: 'Updated Label',
          url: 'https://example.com/new-apply',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws Error if external application update returned no row', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentReferences, [
        {
          id: 'ref-1',
          relation: 'external_application',
          targetDocumentId: 'doc-1',
          targetVersionId: 'ver-1',
        },
      ]);

      txMock.returning
        .mockResolvedValueOnce([]) // empty version update returning
        .mockResolvedValueOnce([]); // empty reference update returning

      await expect(
        service.updateExternal('user-1', 'service-1', 'owner-version-1', 'ref-1', {
          label: 'Updated Label',
          url: 'https://example.com/new-apply',
        }),
      ).rejects.toThrow('external application update returned no row');
    });

    it('updates external target document title, version data, and reference label successfully', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      addMockResponse(documentVersions, [{ status: 'draft' }]);
      addMockResponse(documentReferences, [
        {
          id: 'ref-1',
          relation: 'external_application',
          targetDocumentId: 'doc-1',
          targetVersionId: 'ver-1',
        },
      ]);

      const mockUpdatedVersion = { version: 1 };
      const mockUpdatedRef = {
        id: 'ref-1',
        relation: 'external_application',
        position: 0,
        label: 'Updated Label',
        targetDocumentId: 'doc-1',
        targetVersionId: 'ver-1',
        targetKind: 'external-application',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };

      txMock.returning
        .mockResolvedValueOnce([mockUpdatedVersion])
        .mockResolvedValueOnce([mockUpdatedRef]);

      const result = await service.updateExternal(
        'user-1',
        'service-1',
        'owner-version-1',
        'ref-1',
        {
          label: 'Updated Label',
          url: 'https://example.com/new-apply',
        },
      );

      expect(result).toEqual({
        id: 'ref-1',
        relation: 'external_application',
        position: 0,
        label: 'Updated Label',
        url: 'https://example.com/new-apply',
        targetDocumentId: 'doc-1',
        targetVersionId: 'ver-1',
        targetKind: 'external-application',
        targetTitle: 'Updated Label',
        targetVersion: 1,
        targetStatus: 'draft',
        hasSubmissions: false,
        hasStructure: true,
        createdAt: new Date('2026-07-12T00:00:00.000Z').toISOString(),
      });
    });
  });
});
