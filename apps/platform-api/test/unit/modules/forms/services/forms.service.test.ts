import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FormsService } from '../../../../../src/modules/forms/services/forms.service';
import { documents, documentVersions } from '@repo/database';

describe('FormsService', () => {
  let service: FormsService;
  let dbMock: any;
  let txMock: any;

  beforeEach(() => {
    txMock = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
    };

    dbMock = {
      transaction: vi.fn().mockImplementation((cb) => cb(txMock)),
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    };

    service = new FormsService(dbMock);
  });

  describe('create', () => {
    const mockInput = {
      workspaceId: 'ws-1',
      typeId: 'type-1',
      title: 'New Form',
      definition: { schema: {}, uischema: {} },
    };

    it('successfully creates a form and version inside a transaction', async () => {
      // 1. requireMembership check
      dbMock.limit.mockResolvedValueOnce([{ role: 'member' }]);
      // 2. resolveType lookup
      dbMock.limit.mockResolvedValueOnce([
        {
          typeId: 'type-1',
          typeVersionId: 'type-version-1',
          kind: 'basic-form',
        },
      ]);

      const mockDoc = {
        id: 'doc-1',
        workspaceId: 'ws-1',
        title: 'New Form',
        kind: 'basic-form',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };
      const mockVersion = {
        id: 'version-1',
        documentId: 'doc-1',
        version: 1,
        status: 'draft',
        schema: { schema: {}, uischema: {} },
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };

      txMock.returning
        .mockResolvedValueOnce([mockDoc]) // inserted doc
        .mockResolvedValueOnce([mockVersion]); // inserted version

      const result = await service.create('user-1', mockInput);

      expect(dbMock.transaction).toHaveBeenCalledTimes(1);
      expect(txMock.insert).toHaveBeenNthCalledWith(1, documents);
      expect(txMock.insert).toHaveBeenNthCalledWith(2, documentVersions);
      expect(result).toEqual({
        form: {
          id: 'doc-1',
          workspaceId: 'ws-1',
          title: 'New Form',
          kind: 'basic-form',
          createdAt: '2026-07-12T00:00:00.000Z',
        },
        version: {
          id: 'version-1',
          documentId: 'doc-1',
          version: 1,
          status: 'draft',
          schema: { schema: {}, uischema: {} },
          createdAt: '2026-07-12T00:00:00.000Z',
        },
      });
    });

    it('throws NotFoundException if user is not a workspace member', async () => {
      dbMock.limit.mockResolvedValueOnce([]); // no membership

      await expect(service.create('user-1', mockInput)).rejects.toThrow(NotFoundException);
    });

    it('throws UnprocessableEntityException if type has no published version', async () => {
      dbMock.limit.mockResolvedValueOnce([{ role: 'member' }]); // member
      dbMock.limit.mockResolvedValueOnce([]); // type not found / not published

      await expect(service.create('user-1', mockInput)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws BadRequestException if the resolved type is not a form kind', async () => {
      dbMock.limit.mockResolvedValueOnce([{ role: 'member' }]); // member
      dbMock.limit.mockResolvedValueOnce([
        {
          typeId: 'type-1',
          typeVersionId: 'type-version-1',
          kind: 'service', // not basic-form or multi-stage-form
        },
      ]);

      await expect(service.create('user-1', mockInput)).rejects.toThrow(BadRequestException);
    });

    it('throws Error if document insert returned no row', async () => {
      dbMock.limit.mockResolvedValueOnce([{ role: 'member' }]);
      dbMock.limit.mockResolvedValueOnce([
        {
          typeId: 'type-1',
          typeVersionId: 'type-version-1',
          kind: 'basic-form',
        },
      ]);
      txMock.returning.mockResolvedValueOnce([]); // empty doc insert

      await expect(service.create('user-1', mockInput)).rejects.toThrow(
        new Error('document insert returned no row'),
      );
    });

    it('throws Error if document version insert returned no row', async () => {
      dbMock.limit.mockResolvedValueOnce([{ role: 'member' }]);
      dbMock.limit.mockResolvedValueOnce([
        {
          typeId: 'type-1',
          typeVersionId: 'type-version-1',
          kind: 'basic-form',
        },
      ]);
      const mockDoc = { id: 'doc-1', workspaceId: 'ws-1' };
      txMock.returning.mockResolvedValueOnce([mockDoc]).mockResolvedValueOnce([]); // empty version insert

      await expect(service.create('user-1', mockInput)).rejects.toThrow(
        new Error('document version insert returned no row'),
      );
    });
  });

  describe('get', () => {
    it('successfully retrieves a form and its latest version', async () => {
      const mockDoc = {
        id: 'doc-1',
        workspaceId: 'ws-1',
        title: 'New Form',
        kind: 'basic-form',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };
      const mockVersion = {
        id: 'version-1',
        documentId: 'doc-1',
        version: 1,
        status: 'draft',
        schema: { schema: {}, uischema: {} },
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };

      // 1. requireDocument
      dbMock.limit.mockResolvedValueOnce([{ doc: mockDoc }]);
      // 2. latest document version lookup
      dbMock.limit.mockResolvedValueOnce([mockVersion]);

      const result = await service.get('user-1', 'doc-1');

      expect(result).toEqual({
        form: {
          id: 'doc-1',
          workspaceId: 'ws-1',
          title: 'New Form',
          kind: 'basic-form',
          createdAt: '2026-07-12T00:00:00.000Z',
        },
        version: {
          id: 'version-1',
          documentId: 'doc-1',
          version: 1,
          status: 'draft',
          schema: { schema: {}, uischema: {} },
          createdAt: '2026-07-12T00:00:00.000Z',
        },
      });
    });

    it('throws NotFoundException if the document has no versions', async () => {
      const mockDoc = {
        id: 'doc-1',
        workspaceId: 'ws-1',
        title: 'New Form',
        kind: 'basic-form',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };

      dbMock.limit.mockResolvedValueOnce([{ doc: mockDoc }]); // requireDocument succeeds
      dbMock.limit.mockResolvedValueOnce([]); // no versions

      await expect(service.get('user-1', 'doc-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if the document does not exist or user is not a member', async () => {
      dbMock.limit.mockResolvedValueOnce([]); // requireDocument fails

      await expect(service.get('user-1', 'doc-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSchema', () => {
    const mockInput = {
      definition: { schema: { new: true }, uischema: {} },
      title: 'Updated Form Title',
    };

    it('successfully updates a draft form version and the document title', async () => {
      const mockDoc = {
        id: 'doc-1',
        workspaceId: 'ws-1',
        title: 'Old Form Title',
        kind: 'basic-form',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };
      const mockVersion = {
        id: 'version-1',
        documentId: 'doc-1',
        version: 1,
        status: 'draft',
        schema: { schema: {}, uischema: {} },
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };
      const mockUpdatedVersion = {
        ...mockVersion,
        schema: { schema: { new: true }, uischema: {} },
      };

      // 1. requireDocument
      dbMock.limit.mockResolvedValueOnce([{ doc: mockDoc }]);
      // 2. document version lookup
      dbMock.limit.mockResolvedValueOnce([mockVersion]);
      // 3. update version returning
      dbMock.returning = vi.fn().mockResolvedValueOnce([mockUpdatedVersion]);

      const result = await service.updateSchema('user-1', 'doc-1', 'version-1', mockInput);

      expect(dbMock.update).toHaveBeenNthCalledWith(1, documentVersions);
      expect(dbMock.update).toHaveBeenNthCalledWith(2, documents);
      expect(result).toEqual({
        id: 'version-1',
        documentId: 'doc-1',
        version: 1,
        status: 'draft',
        schema: { schema: { new: true }, uischema: {} },
        createdAt: '2026-07-12T00:00:00.000Z',
      });
    });

    it('throws NotFoundException if the version is not found', async () => {
      const mockDoc = { id: 'doc-1', workspaceId: 'ws-1' };

      dbMock.limit.mockResolvedValueOnce([{ doc: mockDoc }]); // requireDocument succeeds
      dbMock.limit.mockResolvedValueOnce([]); // version not found

      await expect(service.updateSchema('user-1', 'doc-1', 'version-1', mockInput)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException if the version is not in draft status', async () => {
      const mockDoc = { id: 'doc-1', workspaceId: 'ws-1' };
      const mockVersion = {
        id: 'version-1',
        documentId: 'doc-1',
        version: 1,
        status: 'published', // not draft
      };

      dbMock.limit.mockResolvedValueOnce([{ doc: mockDoc }]); // requireDocument succeeds
      dbMock.limit.mockResolvedValueOnce([mockVersion]);

      await expect(service.updateSchema('user-1', 'doc-1', 'version-1', mockInput)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFoundException if updating version query returned no row', async () => {
      const mockDoc = { id: 'doc-1', workspaceId: 'ws-1' };
      const mockVersion = {
        id: 'version-1',
        documentId: 'doc-1',
        version: 1,
        status: 'draft',
      };

      dbMock.limit.mockResolvedValueOnce([{ doc: mockDoc }]); // requireDocument succeeds
      dbMock.limit.mockResolvedValueOnce([mockVersion]);
      dbMock.returning = vi.fn().mockResolvedValueOnce([]); // empty returning

      await expect(service.updateSchema('user-1', 'doc-1', 'version-1', mockInput)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('successfully updates a draft form version without updating the document title if title is omitted', async () => {
      const mockDoc = {
        id: 'doc-1',
        workspaceId: 'ws-1',
        title: 'Old Form Title',
        kind: 'basic-form',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };
      const mockVersion = {
        id: 'version-1',
        documentId: 'doc-1',
        version: 1,
        status: 'draft',
        schema: { schema: {}, uischema: {} },
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };
      const mockUpdatedVersion = {
        ...mockVersion,
        schema: { schema: { updated: true }, uischema: {} },
      };

      dbMock.limit.mockResolvedValueOnce([{ doc: mockDoc }]); // requireDocument succeeds
      dbMock.limit.mockResolvedValueOnce([mockVersion]); // version lookup
      dbMock.returning = vi.fn().mockResolvedValueOnce([mockUpdatedVersion]); // update returning

      const result = await service.updateSchema('user-1', 'doc-1', 'version-1', {
        definition: { schema: { updated: true }, uischema: {} },
      });

      expect(dbMock.update).toHaveBeenCalledTimes(1);
      expect(dbMock.update).toHaveBeenCalledWith(documentVersions);
      expect(dbMock.update).not.toHaveBeenCalledWith(documents);
      expect(result.schema).toEqual({ schema: { updated: true }, uischema: {} });
    });
  });
});
