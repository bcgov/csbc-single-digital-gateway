import { ConflictException, NotFoundException } from '@nestjs/common';
import { documentVersions } from '@repo/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  discardVersionTx,
  reactivateServiceTx,
} from '../../../../../src/modules/services/util/version-copy';

/**
 * Feature 217 cut `copyReferences` and `dedupCopiedForms` from this module — both existed to
 * deep-copy and de-duplicate the application-method documents a service version referenced, and
 * `document_references` is gone. What remains is the two version-lifecycle helpers.
 */

const mockQuery = (resolvedValue: unknown) => {
  const qb = Promise.resolve(resolvedValue);
  return Object.assign(qb, {
    from: vi.fn().mockReturnValue(qb),
    innerJoin: vi.fn().mockReturnValue(qb),
    leftJoin: vi.fn().mockReturnValue(qb),
    limit: vi.fn().mockReturnValue(qb),
    orderBy: vi.fn().mockReturnValue(qb),
    where: vi.fn().mockReturnValue(qb),
  });
};

describe('version-copy utility tests', () => {
  let txMock: any;

  beforeEach(() => {
    txMock = Object.assign(Promise.resolve([]), {
      select: vi.fn().mockImplementation(() => mockQuery([])),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
    });
  });

  describe('reactivateServiceTx', () => {
    it('clears archived_at on the latest version', async () => {
      txMock.select.mockReturnValueOnce(
        mockQuery([{ id: 'version-1', status: 'archived', versionNumber: 2 }]),
      );

      await reactivateServiceTx(txMock, 'service-1');

      expect(txMock.update).toHaveBeenCalledWith(documentVersions);
      expect(txMock.set).toHaveBeenCalledWith({ archivedAt: null });
    });

    it('reads the latest version with ONE query — it no longer looks up form versions', async () => {
      // The second query was the referenced application-form version ids (feature 217: gone).
      txMock.select.mockReturnValueOnce(
        mockQuery([{ id: 'version-1', status: 'archived', versionNumber: 2 }]),
      );

      await reactivateServiceTx(txMock, 'service-1');

      expect(txMock.select).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException if the service has no versions', async () => {
      txMock.select.mockReturnValueOnce(mockQuery([]));

      await expect(reactivateServiceTx(txMock, 'service-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if the latest version is not archived', async () => {
      txMock.select.mockReturnValueOnce(
        mockQuery([{ id: 'version-1', status: 'published', versionNumber: 1 }]),
      );

      await expect(reactivateServiceTx(txMock, 'service-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('discardVersionTx', () => {
    it('deletes the version when the service has more than one', async () => {
      txMock.select.mockReturnValueOnce(mockQuery([{ n: 3 }]));

      await discardVersionTx(txMock, 'service-1', 'version-1');

      expect(txMock.delete).toHaveBeenCalledTimes(1);
      expect(txMock.delete).toHaveBeenCalledWith(documentVersions);
    });

    it('no longer deletes orphaned application-method documents', async () => {
      // Feature 217: a version owned no method documents to orphan.
      txMock.select.mockReturnValueOnce(mockQuery([{ n: 3 }]));

      await discardVersionTx(txMock, 'service-1', 'version-1');

      expect(txMock.select).toHaveBeenCalledTimes(1);
      expect(txMock.delete).toHaveBeenCalledTimes(1);
    });

    it('throws ConflictException when discarding the only version of a service', async () => {
      txMock.select.mockReturnValueOnce(mockQuery([{ n: 1 }]));

      await expect(discardVersionTx(txMock, 'service-1', 'version-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws ConflictException when the count query returns nothing', async () => {
      txMock.select.mockReturnValueOnce(mockQuery([]));

      await expect(discardVersionTx(txMock, 'service-1', 'version-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
