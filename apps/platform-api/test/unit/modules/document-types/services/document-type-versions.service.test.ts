import { describe, expect, it, beforeEach } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DocumentTypeVersionsService } from '../../../../../src/modules/document-types/services/document-type-versions.service';
import { createMockDb } from '../../../../utils/create-db-mock';

describe('DocumentTypeVersionsService', () => {
  let service: DocumentTypeVersionsService;
  let dbMock: any;
  let txMock: any;

  const validBasicFormDef = {
    name: 'Applicant details',
    description: 'Basic applicant info',
    schema: { type: 'object', properties: {}, required: [] },
    uischema: { type: 'VerticalLayout', elements: [] },
  };

  const dummyType = {
    id: 'type-1',
    kind: 'basic-form',
    name: 'Type 1',
  };

  const dummyDraftVersion = {
    id: 'v-1',
    typeId: 'type-1',
    version: 1,
    definition: validBasicFormDef,
    status: 'draft',
    createdAt: new Date('2026-07-12T00:00:00.000Z'),
    publishedAt: null,
    archivedAt: null,
  };

  const dummyPublishedVersion = {
    ...dummyDraftVersion,
    id: 'v-2',
    version: 2,
    status: 'published',
    publishedAt: new Date('2026-07-12T01:00:00.000Z'),
  };

  const dummyArchivedVersion = {
    ...dummyDraftVersion,
    id: 'v-3',
    version: 3,
    status: 'archived',
    archivedAt: new Date('2026-07-12T02:00:00.000Z'),
  };

  beforeEach(() => {
    const mocks = createMockDb();
    txMock = mocks.txMock;
    dbMock = mocks.dbMock;

    service = new DocumentTypeVersionsService(dbMock);
  });

  describe('addVersion', () => {
    it('Should successfully add a new version when type is found and definition is valid', async () => {
      // 1. requireType select
      dbMock.limit.mockResolvedValueOnce([dummyType]);
      // 2. max select in transaction
      txMock.limit.mockResolvedValueOnce([{ max: 1 }]);
      // 3. insert returning
      txMock.returning.mockResolvedValueOnce([{ ...dummyDraftVersion, id: 'v-new', version: 2 }]);

      const result = await service.addVersion('type-1', validBasicFormDef);

      expect(dbMock.select).toHaveBeenCalledTimes(1);
      expect(txMock.select).toHaveBeenCalledTimes(1);
      expect(txMock.insert).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        id: 'v-new',
        typeId: 'type-1',
        version: 2,
        status: 'draft',
        definition: validBasicFormDef,
        createdAt: '2026-07-12T00:00:00.000Z',
        publishedAt: null,
        archivedAt: null,
      });
    });

    it('Should throw NotFoundException if type is not found', async () => {
      dbMock.limit.mockResolvedValueOnce([]); // type not found

      await expect(service.addVersion('type-invalid', validBasicFormDef)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Should throw BadRequestException if definition is invalid', async () => {
      dbMock.limit.mockResolvedValueOnce([dummyType]);

      await expect(service.addVersion('type-1', { invalid: 'field' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('Should throw BadRequestException if type kind is unknown', async () => {
      dbMock.limit.mockResolvedValueOnce([{ ...dummyType, kind: 'unknown-kind' }]);

      await expect(service.addVersion('type-1', validBasicFormDef)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('editDraft', () => {
    it('Should successfully edits a draft version', async () => {
      // requireVersion selects:
      // 1. requireType select
      dbMock.limit.mockResolvedValueOnce([dummyType]);
      // 2. requireVersion select
      dbMock.limit.mockResolvedValueOnce([dummyDraftVersion]);
      // update returning select
      dbMock.returning.mockResolvedValueOnce([
        { ...dummyDraftVersion, definition: { ...validBasicFormDef, name: 'Updated' } },
      ]);

      const result = await service.editDraft('type-1', 'v-1', {
        ...validBasicFormDef,
        name: 'Updated',
      });

      expect(dbMock.update).toHaveBeenCalledTimes(1);
      expect(result.definition.name).toBe('Updated');
    });

    it('Should throw ConflictException if version is not draft', async () => {
      dbMock.limit.mockResolvedValueOnce([dummyType]);
      dbMock.limit.mockResolvedValueOnce([dummyPublishedVersion]);

      await expect(service.editDraft('type-1', 'v-2', validBasicFormDef)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('deleteDraft', () => {
    it('Should successfully delete a draft version', async () => {
      dbMock.limit.mockResolvedValueOnce([dummyType]);
      dbMock.limit.mockResolvedValueOnce([dummyDraftVersion]);
      dbMock.delete.mockReturnThis();

      await service.deleteDraft('type-1', 'v-1');

      expect(dbMock.delete).toHaveBeenCalledTimes(1);
    });

    it('Should throw ConflictException if trying to delete a published version', async () => {
      dbMock.limit.mockResolvedValueOnce([dummyType]);
      dbMock.limit.mockResolvedValueOnce([dummyPublishedVersion]);

      await expect(service.deleteDraft('type-1', 'v-2')).rejects.toThrow(ConflictException);
    });
  });

  describe('publish', () => {
    it('Should successfully publish a draft version, archiving the currently published version', async () => {
      // 1. requireType select
      dbMock.limit.mockResolvedValueOnce([dummyType]);
      // 2. tx version check select
      txMock.limit.mockResolvedValueOnce([dummyDraftVersion]);
      // 3. tx publish returning select
      txMock.returning.mockResolvedValueOnce([
        {
          ...dummyDraftVersion,
          status: 'published',
          publishedAt: new Date('2026-07-12T03:00:00.000Z'),
        },
      ]);

      const result = await service.publish('type-1', 'v-1');

      expect(txMock.update).toHaveBeenCalledTimes(2); // one for archive current, one for publish target
      expect(result.status).toBe('published');
      expect(result.publishedAt).toBe('2026-07-12T03:00:00.000Z');
    });

    it('Should throw NotFoundException if target version does not exist in publish', async () => {
      dbMock.limit.mockResolvedValueOnce([dummyType]);
      txMock.limit.mockResolvedValueOnce([]); // not found

      await expect(service.publish('type-1', 'v-invalid')).rejects.toThrow(NotFoundException);
    });

    it('Should throw ConflictException if version to publish is not draft', async () => {
      dbMock.limit.mockResolvedValueOnce([dummyType]);
      txMock.limit.mockResolvedValueOnce([dummyPublishedVersion]); // already published

      await expect(service.publish('type-1', 'v-2')).rejects.toThrow(ConflictException);
    });
  });

  describe('archive', () => {
    it('Should successfully archive a published version', async () => {
      dbMock.limit.mockResolvedValueOnce([dummyType]);
      dbMock.limit.mockResolvedValueOnce([dummyPublishedVersion]);
      dbMock.returning.mockResolvedValueOnce([
        {
          ...dummyPublishedVersion,
          status: 'archived',
          archivedAt: new Date('2026-07-12T04:00:00.000Z'),
        },
      ]);

      const result = await service.archive('type-1', 'v-2');

      expect(dbMock.update).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('archived');
      expect(result.archivedAt).toBe('2026-07-12T04:00:00.000Z');
    });

    it('Should throw ConflictException if version is already archived', async () => {
      dbMock.limit.mockResolvedValueOnce([dummyType]);
      dbMock.limit.mockResolvedValueOnce([dummyArchivedVersion]);

      await expect(service.archive('type-1', 'v-3')).rejects.toThrow(ConflictException);
    });

    it('Should throw NotFoundException if target version is not found when archiving a document type version', async () => {
      dbMock.limit.mockResolvedValueOnce([dummyType]);
      dbMock.limit.mockResolvedValueOnce([]); // version not found

      await expect(service.archive('type-1', 'v-invalid')).rejects.toThrow(NotFoundException);
    });

    it('Should throw Error if archive mutation returns no row when archiving a document type version', async () => {
      dbMock.limit.mockResolvedValueOnce([dummyType]);
      dbMock.limit.mockResolvedValueOnce([dummyPublishedVersion]);
      dbMock.returning.mockResolvedValueOnce([]); // empty update returning

      await expect(service.archive('type-1', 'v-2')).rejects.toThrow(
        new Error('document type version mutation returned no row'),
      );
    });
  });
});
