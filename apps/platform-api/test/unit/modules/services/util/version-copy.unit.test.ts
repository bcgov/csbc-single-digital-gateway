import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  reactivateServiceTx,
  discardVersionTx,
  copyReferences,
  dedupCopiedForms,
} from '../../../../../src/modules/services/util/version-copy';
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
    it('reactivates a service and its references successfully', async () => {
      txMock.select
        // 1. latest version query
        .mockReturnValueOnce(mockQuery([{ id: 'version-1', status: 'archived', version: 2 }]))
        // 2. target form version ids query
        .mockReturnValueOnce(mockQuery([{ vid: 'form-version-1' }]));

      await reactivateServiceTx(txMock, 'service-1');

      expect(txMock.update).toHaveBeenCalledWith(documentVersions);
      expect(txMock.set).toHaveBeenCalledWith({ archivedAt: null });
    });

    it('throws NotFoundException if service version does not exist', async () => {
      txMock.select.mockReturnValueOnce(mockQuery([]));

      await expect(reactivateServiceTx(txMock, 'service-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if service is not archived', async () => {
      txMock.select.mockReturnValueOnce(
        mockQuery([{ id: 'version-1', status: 'published', version: 1 }]),
      );

      await expect(reactivateServiceTx(txMock, 'service-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('discardVersionTx', () => {
    it('successfully discards draft version and deletes orphaned forms', async () => {
      txMock.select
        // 1. counts query (needs count > 1)
        .mockReturnValueOnce(mockQuery([{ n: 3 }]))
        // 2. target form ids query
        .mockReturnValueOnce(mockQuery([{ formId: 'form-1' }]))
        // 3. remaining counts query (0 remaining references)
        .mockReturnValueOnce(mockQuery([{ n: 0 }]));

      await discardVersionTx(txMock, 'service-1', 'version-1');

      expect(txMock.delete).toHaveBeenNthCalledWith(1, documentVersions);
      expect(txMock.delete).toHaveBeenNthCalledWith(2, documents); // orphaned form deleted
    });

    it('throws ConflictException if discarding the only version of a service', async () => {
      txMock.select.mockReturnValueOnce(mockQuery([{ n: 1 }]));

      await expect(discardVersionTx(txMock, 'service-1', 'version-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws ConflictException if counts query returns empty', async () => {
      txMock.select.mockReturnValueOnce(mockQuery([]));

      await expect(discardVersionTx(txMock, 'service-1', 'version-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('does not delete form document if it is still referenced elsewhere (remaining count > 0)', async () => {
      txMock.select
        // 1. counts query (needs count > 1)
        .mockReturnValueOnce(mockQuery([{ n: 3 }]))
        // 2. target form ids query
        .mockReturnValueOnce(mockQuery([{ formId: 'form-1' }]))
        // 3. remaining counts query (1 remaining reference)
        .mockReturnValueOnce(mockQuery([{ n: 1 }]));

      await discardVersionTx(txMock, 'service-1', 'version-1');

      expect(txMock.delete).toHaveBeenCalledWith(documentVersions);
      expect(txMock.delete).not.toHaveBeenCalledWith(documents);
    });

    it('deletes form document if remaining count query returns empty', async () => {
      txMock.select
        // 1. counts query (needs count > 1)
        .mockReturnValueOnce(mockQuery([{ n: 3 }]))
        // 2. target form ids query
        .mockReturnValueOnce(mockQuery([{ formId: 'form-1' }]))
        // 3. remaining counts query (empty result)
        .mockReturnValueOnce(mockQuery([]));

      await discardVersionTx(txMock, 'service-1', 'version-1');

      expect(txMock.delete).toHaveBeenNthCalledWith(1, documentVersions);
      expect(txMock.delete).toHaveBeenNthCalledWith(2, documents); // orphaned form deleted
    });
  });

  describe('copyReferences', () => {
    const source = {
      sourceVersionId: 'src-v-1',
      newVersionId: 'new-v-1',
      serviceId: 'service-1',
      workspaceId: 'ws-1',
    };

    it('copies references and deep-copies application forms', async () => {
      txMock.select.mockReturnValueOnce(
        mockQuery([
          {
            relation: 'application_form',
            label: 'Apply',
            position: 0,
            targetKind: 'basic-form',
            targetDocumentId: 'form-1',
            targetVersionId: 'form-v-1',
            formTitle: 'Apply Form',
            formKind: 'basic-form',
            formTypeId: 't-1',
            formTypeVersionId: 'tv-1',
            formSchema: { type: 'object' },
          },
          {
            relation: 'related_service',
            label: 'Related',
            position: 1,
            targetKind: 'service',
            targetDocumentId: 'service-2',
            targetVersionId: 'service-2-v-1',
          },
        ]),
      );

      txMock.returning
        .mockResolvedValueOnce([{ id: 'new-form-1' }]) // inserted form doc
        .mockResolvedValueOnce([{ id: 'new-form-v-1' }]); // inserted form version

      await copyReferences(txMock, source);

      // Verify copies:
      // Form document copy
      expect(txMock.insert).toHaveBeenNthCalledWith(1, documents);
      // Form version copy
      expect(txMock.insert).toHaveBeenNthCalledWith(2, documentVersions);
      // New form reference
      expect(txMock.insert).toHaveBeenNthCalledWith(3, documentReferences);
      // Related service reference copied as-is
      expect(txMock.insert).toHaveBeenNthCalledWith(4, documentReferences);
    });

    it('throws error if one helper returns no rows during copy', async () => {
      txMock.select.mockReturnValueOnce(
        mockQuery([
          {
            relation: 'application_form',
            label: 'Apply',
            position: 0,
            targetKind: 'basic-form',
            targetDocumentId: 'form-1',
            targetVersionId: 'form-v-1',
            formTitle: 'Apply Form',
            formKind: 'basic-form',
            formTypeId: 't-1',
            formTypeVersionId: 'tv-1',
            formSchema: {},
          },
        ]),
      );

      txMock.returning.mockResolvedValueOnce([]); // doc returning empty

      await expect(copyReferences(txMock, source)).rejects.toThrow(
        'form document copy returned no row',
      );
    });

    it('throws error if form version copy returns no rows during copy', async () => {
      txMock.select.mockReturnValueOnce(
        mockQuery([
          {
            relation: 'application_form',
            label: 'Apply',
            position: 0,
            targetKind: 'basic-form',
            targetDocumentId: 'form-1',
            targetVersionId: 'form-v-1',
            formTitle: 'Apply Form',
            formKind: 'basic-form',
            formTypeId: 't-1',
            formTypeVersionId: 'tv-1',
            formSchema: {},
          },
        ]),
      );

      txMock.returning
        .mockResolvedValueOnce([{ id: 'new-form-1' }]) // doc succeeds
        .mockResolvedValueOnce([]); // version fails

      await expect(copyReferences(txMock, source)).rejects.toThrow(
        'form version copy returned no row',
      );
    });
  });

  describe('dedupCopiedForms', () => {
    it('exits early if no published version is found', async () => {
      txMock.select.mockReturnValueOnce(mockQuery([])); // pubRows is empty

      await dedupCopiedForms(txMock, 'service-1', 'version-2');

      expect(txMock.update).not.toHaveBeenCalled();
    });

    it('deduplicates deep-copied forms if schemas are identical', async () => {
      txMock.select
        // 1. pubRows query -> returns previous published id
        .mockReturnValueOnce(mockQuery([{ id: 'version-1' }]))
        // 2. previous references/schemas
        .mockReturnValueOnce(
          mockQuery([
            {
              label: 'Apply',
              targetDocumentId: 'form-original',
              targetVersionId: 'form-v-original',
              schema: { type: 'object', properties: { field: { type: 'string' } } },
            },
          ]),
        )
        // 3. current references/schemas
        .mockReturnValueOnce(
          mockQuery([
            {
              refId: 'ref-current',
              label: 'Apply',
              targetDocumentId: 'form-copy',
              schema: { type: 'object', properties: { field: { type: 'string' } } }, // identical schema
            },
          ]),
        );

      await dedupCopiedForms(txMock, 'service-1', 'version-2');

      // Should update the current reference to point back to the original form
      expect(txMock.update).toHaveBeenCalledWith(documentReferences);
      expect(txMock.set).toHaveBeenCalledWith({
        targetDocumentId: 'form-original',
        targetVersionId: 'form-v-original',
      });
      // Should delete the redundant form copy document
      expect(txMock.delete).toHaveBeenCalledWith(documents);
    });

    it('does not deduplicate if schemas are different', async () => {
      txMock.select
        // 1. pubRows query -> returns previous published id
        .mockReturnValueOnce(mockQuery([{ id: 'version-1' }]))
        // 2. previous references/schemas
        .mockReturnValueOnce(
          mockQuery([
            {
              label: 'Apply',
              targetDocumentId: 'form-original',
              targetVersionId: 'form-v-original',
              schema: { type: 'object', properties: { field: { type: 'string' } } },
            },
          ]),
        )
        // 3. current references/schemas
        .mockReturnValueOnce(
          mockQuery([
            {
              refId: 'ref-current',
              label: 'Apply',
              targetDocumentId: 'form-copy',
              schema: { type: 'object', properties: { field: { type: 'number' } } }, // different type
            },
          ]),
        );

      await dedupCopiedForms(txMock, 'service-1', 'version-2');

      expect(txMock.update).not.toHaveBeenCalled();
      expect(txMock.delete).not.toHaveBeenCalled();
    });

    it('exits early if the published version is the same as the version being published', async () => {
      txMock.select.mockReturnValueOnce(mockQuery([{ id: 'version-1' }])); // publishedId === versionId

      await dedupCopiedForms(txMock, 'service-1', 'version-1');

      expect(txMock.update).not.toHaveBeenCalled();
    });

    it('does not deduplicate if no previous form matches current form by label', async () => {
      txMock.select
        // 1. pubRows query -> returns previous published id
        .mockReturnValueOnce(mockQuery([{ id: 'version-1' }]))
        // 2. previous references/schemas (label is 'Apply')
        .mockReturnValueOnce(
          mockQuery([
            {
              label: 'Apply',
              targetDocumentId: 'form-original',
              targetVersionId: 'form-v-original',
              schema: { type: 'object' },
            },
          ]),
        )
        // 3. current references/schemas (label is 'Apply-New')
        .mockReturnValueOnce(
          mockQuery([
            {
              refId: 'ref-current',
              label: 'Apply-New',
              targetDocumentId: 'form-copy',
              schema: { type: 'object' },
            },
          ]),
        );

      await dedupCopiedForms(txMock, 'service-1', 'version-2');

      expect(txMock.update).not.toHaveBeenCalled();
      expect(txMock.delete).not.toHaveBeenCalled();
    });

    it('deduplicates deep-copied forms with null labels if schemas are identical', async () => {
      txMock.select
        // 1. pubRows query -> returns previous published id
        .mockReturnValueOnce(mockQuery([{ id: 'version-1' }]))
        // 2. previous references/schemas with null label
        .mockReturnValueOnce(
          mockQuery([
            {
              label: null,
              targetDocumentId: 'form-original',
              targetVersionId: 'form-v-original',
              schema: { type: 'object' },
            },
          ]),
        )
        // 3. current references/schemas with null label
        .mockReturnValueOnce(
          mockQuery([
            {
              refId: 'ref-current',
              label: null,
              targetDocumentId: 'form-copy',
              schema: { type: 'object' },
            },
          ]),
        );

      await dedupCopiedForms(txMock, 'service-1', 'version-2');

      expect(txMock.update).toHaveBeenCalledWith(documentReferences);
      expect(txMock.set).toHaveBeenCalledWith({
        targetDocumentId: 'form-original',
        targetVersionId: 'form-v-original',
      });
      expect(txMock.delete).toHaveBeenCalledWith(documents);
    });
  });
});
