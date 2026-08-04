import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { DocumentTypesService } from '../../../../../src/modules/document-types/services/document-types.service';

describe('DocumentTypesService', () => {
  let service: DocumentTypesService;
  let dbMock: any;

  const dummyType1 = {
    id: 'type-1',
    name: 'Type 1',
    kind: 'basic-form',
    createdAt: new Date('2026-07-12T00:00:00.000Z'),
  };

  const dummyType2 = {
    id: 'type-2',
    name: 'Type 2',
    kind: 'service',
    createdAt: new Date('2026-07-12T01:00:00.000Z'),
  };

  const dummyVersion1 = {
    id: 'v-1',
    typeId: 'type-1',
    version: 1,
    status: 'draft',
    definition: {},
    createdAt: new Date('2026-07-12T00:00:00.000Z'),
    publishedAt: null,
    archivedAt: null,
  };

  const dummyVersion2 = {
    id: 'v-2',
    typeId: 'type-1',
    version: 2,
    status: 'published',
    definition: {},
    createdAt: new Date('2026-07-12T01:00:00.000Z'),
    publishedAt: new Date('2026-07-12T01:30:00.000Z'),
    archivedAt: null,
  };

  const dummyVersion3 = {
    id: 'v-3',
    typeId: 'type-1',
    version: 3,
    status: 'archived',
    definition: {},
    createdAt: new Date('2026-07-12T02:00:00.000Z'),
    publishedAt: new Date('2026-07-12T02:30:00.000Z'),
    archivedAt: new Date('2026-07-12T03:00:00.000Z'),
  };

  beforeEach(() => {
    dbMock = Object.assign(Promise.resolve([]), {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn(),
      limit: vi.fn(),
    });

    service = new DocumentTypesService(dbMock);
  });

  describe('adminList', () => {
    it('returns a list of document types with all of their versions', async () => {
      // 1. Types select call (db.select().from().orderBy())
      dbMock.orderBy.mockResolvedValueOnce([dummyType2, dummyType1]);
      // 2. Versions select call for type-2 (none)
      dbMock.orderBy.mockResolvedValueOnce([]);
      // 3. Versions select call for type-1 (v-1, v-2, v-3)
      dbMock.orderBy.mockResolvedValueOnce([dummyVersion1, dummyVersion2, dummyVersion3]);

      const result = await service.adminList();

      expect(result).toHaveLength(2);
      expect(result[0]!.type.id).toBe('type-2');
      expect(result[0]!.versions).toEqual([]);
      expect(result[1]!.type.id).toBe('type-1');
      expect(result[1]!.versions).toHaveLength(3);
    });
  });

  describe('adminGet', () => {
    it('returns a single type with its versions', async () => {
      // 1. requireType limit call
      dbMock.limit.mockResolvedValueOnce([dummyType1]);
      // 2. versionsOf orderBy call
      dbMock.orderBy.mockResolvedValueOnce([dummyVersion1, dummyVersion2]);

      const result = await service.adminGet('type-1');

      expect(result.type.id).toBe('type-1');
      expect(result.versions).toHaveLength(2);
    });

    it('throws NotFoundException if the type is not found', async () => {
      dbMock.limit.mockResolvedValueOnce([]); // empty

      await expect(service.adminGet('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('staffList', () => {
    it('returns list of types with their published version', async () => {
      dbMock.orderBy.mockResolvedValueOnce([{ type: dummyType1, version: dummyVersion2 }]);

      const result = await service.staffList();

      expect(result).toHaveLength(1);
      expect(result[0]!.type.id).toBe('type-1');
      expect(result[0]!.published.id).toBe('v-2');
    });
  });

  describe('staffGet', () => {
    it('returns type, published version and only published/archived versions in history', async () => {
      dbMock.limit.mockResolvedValueOnce([dummyType1]);
      // versionsOf returns draft, published, archived versions
      dbMock.orderBy.mockResolvedValueOnce([dummyVersion1, dummyVersion2, dummyVersion3]);

      const result = await service.staffGet('type-1');

      expect(result.type.id).toBe('type-1');
      expect(result.published?.id).toBe('v-2');
      // History should only contain non-draft (v-2 and v-3)
      expect(result.history).toHaveLength(2);
      expect(result.history.map((v) => v.id)).toEqual(['v-2', 'v-3']);
    });

    it('returns published as null if no published version exists', async () => {
      dbMock.limit.mockResolvedValueOnce([dummyType1]);
      // versionsOf returns draft and archived versions (no published version)
      dbMock.orderBy.mockResolvedValueOnce([dummyVersion1, dummyVersion3]);

      const result = await service.staffGet('type-1');

      expect(result.type.id).toBe('type-1');
      expect(result.published).toBeNull();
      // History should only contain non-draft (v-3)
      expect(result.history).toHaveLength(1);
      expect(result.history[0]!.id).toBe('v-3');
    });
  });

  describe('staffGetVersion', () => {
    it('returns the version if it is published or archived', async () => {
      dbMock.limit.mockResolvedValueOnce([dummyVersion2]); // published version

      const result = await service.staffGetVersion('type-1', 'v-2');

      expect(result.id).toBe('v-2');
      expect(result.status).toBe('published');
    });

    it('throws NotFoundException if the version is a draft', async () => {
      dbMock.limit.mockResolvedValueOnce([dummyVersion1]); // draft version

      await expect(service.staffGetVersion('type-1', 'v-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if the version is not found', async () => {
      dbMock.limit.mockResolvedValueOnce([]); // not found

      await expect(service.staffGetVersion('type-1', 'invalid')).rejects.toThrow(NotFoundException);
    });
  });
});
