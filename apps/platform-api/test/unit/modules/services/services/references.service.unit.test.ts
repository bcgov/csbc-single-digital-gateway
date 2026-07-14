import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ReferencesService } from '../../../../../src/modules/services/services/references.service';
import { documents, documentVersions, documentReferences } from '@repo/database';

const mockQuery = (resolvedValue: any) => {
  const qb = Promise.resolve(resolvedValue);
  return Object.assign(qb, {
    from: vi.fn().mockReturnValue(qb),
    innerJoin: vi.fn().mockReturnValue(qb),
    limit: vi.fn().mockReturnValue(qb),
    orderBy: vi.fn().mockReturnValue(qb),
    where: vi.fn().mockReturnValue(qb),
  });
};

describe('ReferencesService', () => {
  let service: ReferencesService;
  let dbMock: any;
  let txMock: any;
  let servicesServiceMock: any;

  beforeEach(() => {
    txMock = Object.assign(Promise.resolve([]), {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
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

    servicesServiceMock = {
      requireDocument: vi.fn(),
    };

    service = new ReferencesService(dbMock, servicesServiceMock);
  });

  describe('list', () => {
    it('returns ReferenceResponse items for a service version', async () => {
      // 1. servicesService.requireDocument
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });

      // 2. select calls:
      // - requireOwnerVersion -> status: draft
      // - list query -> returns mock references
      const mockCreatedAt = new Date('2026-07-12T00:00:00.000Z');
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }]))
        .mockReturnValueOnce(
          mockQuery([
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
          ]),
        );

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
        createdAt: '2026-07-12T00:00:00.000Z',
      });
    });

    it('throws NotFoundException if the owner service version is not found', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      dbMock.select = vi.fn().mockReturnValueOnce(mockQuery([])); // no version found

      await expect(service.list('user-1', 'service-1', 'owner-version-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('add', () => {
    const input = {
      targetVersionId: 'target-version-1',
      relation: 'application_form' as const,
      label: 'My Reference',
    };

    it('successfully adds a reference to a draft service version', async () => {
      // 1. requireDocument
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      // 2. select calls:
      // - requireOwnerVersion -> status: draft
      // - loadTargetVersion -> target document info
      const mockCreatedAt = new Date('2026-07-12T00:00:00.000Z');
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              documentId: 'target-doc-1',
              kind: 'basic-form',
              workspaceId: 'ws-1',
              title: 'Target Title',
              version: 2,
            },
          ]),
        );

      // 3. insert return
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
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              documentId: 'target-doc-1',
              kind: 'basic-form',
              workspaceId: 'ws-2',
              title: 'Target Title',
              version: 2,
            },
          ]),
        );

      await expect(service.add('user-1', 'service-1', 'owner-version-1', input)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if the service references itself', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              documentId: 'service-1',
              kind: 'service',
              workspaceId: 'ws-1',
              title: 'Service Title',
              version: 1,
            },
          ]),
        );

      await expect(service.add('user-1', 'service-1', 'owner-version-1', input)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if target kind does not match reference relation', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              documentId: 'target-service-1',
              kind: 'service',
              workspaceId: 'ws-1',
              title: 'Service Target Title',
              version: 1,
            },
          ]),
        );

      await expect(service.add('user-1', 'service-1', 'owner-version-1', input)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws ConflictException if inserting duplicate reference causes primary key violation', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              documentId: 'target-doc-1',
              kind: 'basic-form',
              workspaceId: 'ws-1',
              title: 'Target Title',
              version: 1,
            },
          ]),
        );
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
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              documentId: 'target-doc-1',
              kind: 'basic-form',
              workspaceId: 'ws-1',
              title: 'Target Title',
              version: 2,
            },
          ]),
        );
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
      dbMock.select = vi.fn().mockReturnValueOnce(mockQuery([{ status: 'published' }])); // non-draft

      await expect(service.add('user-1', 'service-1', 'owner-version-1', input)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFoundException if target document version is not found', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }]))
        .mockReturnValueOnce(mockQuery([])); // target not found

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
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              documentId: 'target-doc-1',
              kind: 'service',
              workspaceId: 'ws-1',
              title: 'Target Title',
              version: 2,
            },
          ]),
        );

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
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              documentId: 'target-doc-1',
              kind: 'basic-form', // invalid for related_service
              workspaceId: 'ws-1',
              title: 'Target Title',
              version: 2,
            },
          ]),
        );

      await expect(
        service.add('user-1', 'service-1', 'owner-version-1', relatedInput),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if inserting duplicate reference causes unique violation wrapped in cause', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              documentId: 'target-doc-1',
              kind: 'basic-form',
              workspaceId: 'ws-1',
              title: 'Target Title',
              version: 1,
            },
          ]),
        );
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
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              documentId: 'target-doc-1',
              kind: 'basic-form',
              workspaceId: 'ws-1',
              title: 'Target Title',
              version: 1,
            },
          ]),
        );
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
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              documentId: 'target-doc-1',
              kind: 'basic-form',
              workspaceId: 'ws-1',
              title: 'Target Title',
              version: 2,
            },
          ]),
        );

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
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }])) // requireOwnerVersion
        .mockReturnValueOnce(mockQuery([mockRef])); // requireReference

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
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }])) // requireOwnerVersion
        .mockReturnValueOnce(mockQuery([mockRef])) // requireReference
        .mockReturnValueOnce(mockQuery([{ n: 2 }])); // count of references

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
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }])) // requireOwnerVersion
        .mockReturnValueOnce(mockQuery([mockRef])) // requireReference
        .mockReturnValueOnce(mockQuery([{ n: 1 }])) // count of references
        .mockReturnValueOnce(mockQuery([{ n: 0 }])); // submission count

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
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }])) // requireOwnerVersion
        .mockReturnValueOnce(mockQuery([mockRef])) // requireReference
        .mockReturnValueOnce(mockQuery([{ n: 1 }])) // count of references
        .mockReturnValueOnce(mockQuery([{ n: 5 }])); // submission count

      await expect(
        service.remove('user-1', 'service-1', 'owner-version-1', 'ref-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException if reference is not found', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }])) // requireOwnerVersion
        .mockReturnValueOnce(mockQuery([])); // requireReference returns empty

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
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }])) // requireOwnerVersion
        .mockReturnValueOnce(mockQuery([mockRef])) // requireReference
        .mockReturnValueOnce(mockQuery([])) // empty reference count query (falls back to 0)
        .mockReturnValueOnce(mockQuery([])); // empty submission count query (falls back to 0)

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
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }]))
        .mockReturnValueOnce(mockQuery([mockRef]));

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
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }]))
        .mockReturnValueOnce(mockQuery([mockRef]));

      await expect(
        service.archive('user-1', 'service-1', 'owner-version-1', 'ref-1'),
      ).rejects.toThrow(BadRequestException);
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
      // select calls:
      // - requireOwnerVersion -> status: draft
      // - loadFormType -> type info
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              kind: 'basic-form',
              typeVersionId: 'type-version-1',
              definition: { schema: {}, uischema: {} },
            },
          ]),
        );

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
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }]))
        .mockReturnValueOnce(mockQuery([])); // loadFormType returns nothing

      await expect(
        service.createForm('user-1', 'service-1', 'owner-version-1', input),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws Error if form document insert returned no row', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              kind: 'basic-form',
              typeVersionId: 'type-version-1',
              definition: { schema: {}, uischema: {} },
            },
          ]),
        );
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
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              kind: 'basic-form',
              typeVersionId: 'type-version-1',
              definition: { schema: {}, uischema: {} },
            },
          ]),
        );
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
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              kind: 'basic-form',
              typeVersionId: 'type-version-1',
              definition: { schema: {}, uischema: {} },
            },
          ]),
        );
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
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              kind: 'service', // invalid form type kind
              typeVersionId: 'type-version-1',
              definition: { schema: {}, uischema: {} },
            },
          ]),
        );

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
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ status: 'draft' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              kind: 'basic-form',
              typeVersionId: 'type-version-1',
              definition: { schema: {}, uischema: {} },
            },
          ]),
        );

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
});
