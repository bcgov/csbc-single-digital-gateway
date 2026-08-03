import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConflictException, UnprocessableEntityException, NotFoundException } from '@nestjs/common';
import { ServiceVersionsService } from '../../../../../src/modules/services/services/service-versions.service';
import {
  resolveApplications,
  formHasStructure,
  insertApplication,
} from '../../../../../src/modules/services/util/applications';
import { validateData } from '../../../../../src/modules/services/util/validate-data';
import {
  copyReferences,
  dedupCopiedForms,
  discardVersionTx,
} from '../../../../../src/modules/services/util/version-copy';
import { documentVersions, documents, documentReferences } from '@repo/database';

vi.mock('../../../../../src/modules/services/util/applications', () => ({
  resolveApplications: vi.fn(),
  insertApplication: vi.fn(),
  formHasStructure: vi.fn(),
  structureFromDefinition: vi.fn(),
}));

vi.mock('../../../../../src/modules/services/util/validate-data', () => ({
  validateData: vi.fn(),
}));

vi.mock('../../../../../src/modules/services/util/version-copy', () => ({
  copyReferences: vi.fn(),
  dedupCopiedForms: vi.fn(),
  discardVersionTx: vi.fn(),
}));

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

describe('ServiceVersionsService', () => {
  let service: ServiceVersionsService;
  let dbMock: any;
  let txMock: any;
  let servicesServiceMock: any;
  let serviceTypeResolverMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    txMock = Object.assign(Promise.resolve([]), {
      select: vi.fn().mockImplementation(() => mockQuery([])),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
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

    serviceTypeResolverMock = {
      schemaForVersion: vi.fn(),
      resolve: vi.fn(),
    };

    service = new ServiceVersionsService(dbMock, servicesServiceMock, serviceTypeResolverMock);
  });

  describe('updateDraft', () => {
    const mockDraftVersion = {
      id: 'version-1',
      documentId: 'service-1',
      version: 1,
      status: 'draft',
      data: {},
      createdAt: new Date('2026-07-12T00:00:00.000Z'),
    };

    it('successfully updates a draft version and syncs title/applications', async () => {
      // 1. servicesService.requireDocument
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });

      // 2. requireVersion query -> status: draft
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'version-1', status: 'draft' }]));

      // 3. resolveApplications mock
      vi.mocked(resolveApplications).mockResolvedValueOnce([]);

      // 4. tx.update returning updated version
      const mockUpdated = {
        id: 'version-1',
        documentId: 'service-1',
        version: 1,
        status: 'draft',
        data: { title: 'Updated Title' },
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };
      txMock.returning.mockResolvedValueOnce([mockUpdated]);

      // 5. reconcileApplications -> tx.select from documentReferences
      txMock.select = vi.fn().mockReturnValueOnce(mockQuery([])); // no existing references

      const result = await service.updateDraft('user-1', 'service-1', 'version-1', {
        data: { title: 'Updated Title' },
        applications: [],
      });

      expect(servicesServiceMock.requireDocument).toHaveBeenCalledWith('user-1', 'service-1');
      expect(result.id).toBe('version-1');
      expect(result.data).toEqual({ title: 'Updated Title' });
    });

    it('throws ConflictException if version is not a draft', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'version-1', status: 'published' }]));

      await expect(
        service.updateDraft('user-1', 'service-1', 'version-1', { data: {} }),
      ).rejects.toThrow(ConflictException);
    });

    it('successfully resolves and inserts a new application', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'version-1', status: 'draft' }]));

      const newAppInput = {
        label: 'New App',
        position: 1,
        form: { mode: 'new' as const, typeId: 't-1', title: 'New Title' },
      };
      const resolvedApp = { typeId: 't-1', kind: 'basic-form' } as any;
      vi.mocked(resolveApplications).mockResolvedValueOnce([resolvedApp]);

      const mockUpdated = {
        id: 'version-1',
        documentId: 'service-1',
        version: 1,
        status: 'draft',
        data: {},
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };
      txMock.returning.mockResolvedValueOnce([mockUpdated]);
      txMock.select = vi.fn().mockReturnValueOnce(mockQuery([])); // existing references count

      await service.updateDraft('user-1', 'service-1', 'version-1', {
        data: {},
        applications: [newAppInput],
      });

      expect(vi.mocked(resolveApplications)).toHaveBeenCalledWith(dbMock, 'service-1', 'ws-1', [
        newAppInput,
      ]);
      expect(vi.mocked(insertApplication)).toHaveBeenCalledWith(
        txMock,
        { ownerVersionId: 'version-1', ownerDocumentId: 'service-1', workspaceId: 'ws-1' },
        resolvedApp,
      );
    });

    it('reorders applications successfully when applicationOrder is provided', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'version-1', status: 'draft' }]));

      const mockUpdated = {
        id: 'version-1',
        documentId: 'service-1',
        version: 1,
        status: 'draft',
        data: {},
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };
      txMock.returning.mockResolvedValueOnce([mockUpdated]);

      // Mock the select query inside reorderApplications
      txMock.select = vi
        .fn()
        .mockImplementationOnce(() => mockQuery([{ id: 'ref-1' }, { id: 'ref-2' }]));

      await service.updateDraft('user-1', 'service-1', 'version-1', {
        data: {},
        applicationOrder: ['ref-2', 'ref-1', 'ref-invalid'],
      });

      expect(txMock.update).toHaveBeenCalledWith(documentReferences);
      expect(txMock.set).toHaveBeenCalledWith({ position: 0 });
      expect(txMock.set).toHaveBeenCalledWith({ position: 1 });
    });

    it('throws Error if version update returned no row', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'version-1', status: 'draft' }]));
      vi.mocked(resolveApplications).mockResolvedValueOnce([]);
      txMock.returning.mockResolvedValueOnce([]); // empty update returning

      await expect(
        service.updateDraft('user-1', 'service-1', 'version-1', { data: {} }),
      ).rejects.toThrow(new Error('document version mutation returned no row'));
    });

    it('updates document title using input.title if provided', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'version-1', status: 'draft' }]));
      vi.mocked(resolveApplications).mockResolvedValueOnce([]);
      txMock.returning.mockResolvedValueOnce([mockDraftVersion]);
      txMock.select = vi.fn().mockReturnValueOnce(mockQuery([]));

      await service.updateDraft('user-1', 'service-1', 'version-1', {
        title: 'Explicit Title Input',
        data: {},
      });

      expect(txMock.update).toHaveBeenCalledWith(documents);
      expect(txMock.set).toHaveBeenCalledWith({ title: 'Explicit Title Input' });
    });

    it('does not update document title if title is empty or whitespace', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'version-1', status: 'draft' }]));
      vi.mocked(resolveApplications).mockResolvedValueOnce([]);
      txMock.returning.mockResolvedValueOnce([mockDraftVersion]);
      txMock.select = vi.fn().mockReturnValueOnce(mockQuery([]));

      await service.updateDraft('user-1', 'service-1', 'version-1', {
        title: '   ',
        data: {},
      });

      expect(txMock.update).not.toHaveBeenCalledWith(documents);
    });

    it('does not update document title if title is undefined', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'version-1', status: 'draft' }]));
      vi.mocked(resolveApplications).mockResolvedValueOnce([]);
      txMock.returning.mockResolvedValueOnce([mockDraftVersion]);
      txMock.select = vi.fn().mockReturnValueOnce(mockQuery([]));

      await service.updateDraft('user-1', 'service-1', 'version-1', {
        data: {},
      });

      expect(txMock.update).not.toHaveBeenCalledWith(documents);
    });

    it('successfully deletes a dropped application reference if referenced elsewhere', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'version-1', status: 'draft' }]));
      vi.mocked(resolveApplications).mockResolvedValueOnce([]);
      txMock.returning.mockResolvedValueOnce([mockDraftVersion]);

      txMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'ref-1', targetDocumentId: 'target-1' }]))
        .mockReturnValueOnce(mockQuery([{ n: 2 }]));

      await service.updateDraft('user-1', 'service-1', 'version-1', {
        data: {},
        applications: [],
      });

      expect(txMock.delete).toHaveBeenCalledWith(documentReferences);
    });

    it('throws ConflictException if a dropped reference is not referenced elsewhere', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'version-1', status: 'draft' }]));
      vi.mocked(resolveApplications).mockResolvedValueOnce([]);

      txMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'ref-1', targetDocumentId: 'target-1' }]))
        .mockReturnValueOnce(mockQuery([{ n: 1 }]));

      await expect(
        service.updateDraft('user-1', 'service-1', 'version-1', {
          data: {},
          applications: [],
        }),
      ).rejects.toThrow(new ConflictException('A form must be referenced by at least one service'));

      expect(txMock.delete).not.toHaveBeenCalled();
    });

    it('successfully updates label and position of a kept application reference', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'version-1', status: 'draft' }]));
      vi.mocked(resolveApplications).mockResolvedValueOnce([]);
      txMock.returning.mockResolvedValueOnce([mockDraftVersion]);
      txMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'ref-1', targetDocumentId: 'target-1' }]));

      await service.updateDraft('user-1', 'service-1', 'version-1', {
        data: {},
        applications: [
          {
            id: 'ref-1',
            label: 'Updated Label',
            position: 5,
            form: { mode: 'existing' as const, versionId: '00000000-0000-0000-0000-000000000000' },
          },
        ],
      });

      expect(txMock.update).toHaveBeenCalledWith(documentReferences);
      expect(txMock.set).toHaveBeenCalledWith({ label: 'Updated Label', position: 5 });
    });

    it('throws ConflictException if a dropped reference query returns empty counts', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'version-1', status: 'draft' }]));
      vi.mocked(resolveApplications).mockResolvedValueOnce([]);

      txMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'ref-1', targetDocumentId: 'target-1' }]))
        .mockReturnValueOnce(mockQuery([])); // empty count returns undefined

      await expect(
        service.updateDraft('user-1', 'service-1', 'version-1', {
          data: {},
          applications: [],
        }),
      ).rejects.toThrow(new ConflictException('A form must be referenced by at least one service'));

      expect(txMock.delete).not.toHaveBeenCalled();
    });

    it('ignores kept application references that do not exist in the database', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'version-1', status: 'draft' }]));
      vi.mocked(resolveApplications).mockResolvedValueOnce([]);
      txMock.returning.mockResolvedValueOnce([mockDraftVersion]);
      txMock.select = vi.fn().mockReturnValueOnce(mockQuery([])); // empty existing references

      await service.updateDraft('user-1', 'service-1', 'version-1', {
        data: {},
        applications: [
          {
            id: 'ref-nonexistent',
            label: 'Ignored Label',
            position: 5,
            form: { mode: 'existing' as const, versionId: '00000000-0000-0000-0000-000000000000' },
          },
        ],
      });

      expect(txMock.update).not.toHaveBeenCalledWith(documentReferences);
    });
  });

  describe('publish', () => {
    it('successfully validates and publishes a draft service version', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });

      // select calls in tx:
      // - requireVersion -> status: draft
      // - documentReferences -> returns 1 application
      txMock.select = vi
        .fn()
        .mockReturnValueOnce(
          mockQuery([{ id: 'version-1', status: 'draft', typeVersionId: 'tv-1', data: {} }]),
        )
        .mockReturnValueOnce(
          mockQuery([
            {
              targetVersionId: 'form-version-1',
              targetKind: 'basic-form',
              targetSchema: {},
              targetTitle: 'Form 1',
            },
          ]),
        );

      // schema resolver mock
      serviceTypeResolverMock.schemaForVersion.mockResolvedValue({ type: 'object' });
      // validateData mock
      vi.mocked(validateData).mockReturnValueOnce({ valid: true, errors: [] });
      // formHasStructure mock
      vi.mocked(formHasStructure).mockReturnValueOnce(true);

      const mockPublished = {
        id: 'version-1',
        documentId: 'service-1',
        version: 1,
        status: 'published',
        data: {},
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };
      txMock.returning.mockResolvedValueOnce([mockPublished]);

      const result = await service.publish('user-1', 'service-1', 'version-1');

      expect(vi.mocked(dedupCopiedForms)).toHaveBeenCalledWith(txMock, 'service-1', 'version-1');
      expect(result.status).toBe('published');
    });

    it('throws UnprocessableEntityException if validation fails', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      txMock.select = vi
        .fn()
        .mockReturnValueOnce(
          mockQuery([{ id: 'version-1', status: 'draft', typeVersionId: 'tv-1', data: {} }]),
        );

      serviceTypeResolverMock.schemaForVersion.mockResolvedValue({ type: 'object' });
      vi.mocked(validateData).mockReturnValueOnce({
        valid: false,
        errors: [{ message: 'invalid' } as any],
      });

      await expect(service.publish('user-1', 'service-1', 'version-1')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws UnprocessableEntityException if no application forms are referenced', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      txMock.select = vi
        .fn()
        .mockReturnValueOnce(
          mockQuery([{ id: 'version-1', status: 'draft', typeVersionId: 'tv-1', data: {} }]),
        )
        .mockReturnValueOnce(mockQuery([])); // empty references

      serviceTypeResolverMock.schemaForVersion.mockResolvedValue({ type: 'object' });
      vi.mocked(validateData).mockReturnValueOnce({ valid: true, errors: [] });

      await expect(service.publish('user-1', 'service-1', 'version-1')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws NotFoundException if the version is not found', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      txMock.select = vi.fn().mockReturnValueOnce(mockQuery([])); // version not found

      await expect(service.publish('user-1', 'service-1', 'version-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException if trying to publish a non-draft version', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      txMock.select = vi
        .fn()
        .mockReturnValueOnce(
          mockQuery([{ id: 'version-1', status: 'published', typeVersionId: 'tv-1', data: {} }]),
        );

      await expect(service.publish('user-1', 'service-1', 'version-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws UnprocessableEntityException if a referenced form has no structure', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      txMock.select = vi
        .fn()
        .mockReturnValueOnce(
          mockQuery([{ id: 'version-1', status: 'draft', typeVersionId: 'tv-1', data: {} }]),
        )
        .mockReturnValueOnce(
          mockQuery([
            {
              targetVersionId: 'form-version-1',
              targetKind: 'basic-form',
              targetSchema: {},
              targetTitle: 'Form Without Fields',
            },
          ]),
        );

      serviceTypeResolverMock.schemaForVersion.mockResolvedValue({ type: 'object' });
      vi.mocked(validateData).mockReturnValueOnce({ valid: true, errors: [] });
      vi.mocked(formHasStructure).mockReturnValueOnce(false); // no fields structure

      await expect(service.publish('user-1', 'service-1', 'version-1')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws Error if publish mutation returns no row', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      txMock.select = vi
        .fn()
        .mockReturnValueOnce(
          mockQuery([{ id: 'version-1', status: 'draft', typeVersionId: 'tv-1', data: {} }]),
        )
        .mockReturnValueOnce(
          mockQuery([
            {
              targetVersionId: 'form-version-1',
              targetKind: 'basic-form',
              targetSchema: {},
              targetTitle: 'Form 1',
            },
          ]),
        );
      serviceTypeResolverMock.schemaForVersion.mockResolvedValue({ type: 'object' });
      vi.mocked(validateData).mockReturnValueOnce({ valid: true, errors: [] });
      vi.mocked(formHasStructure).mockReturnValueOnce(true);
      txMock.returning.mockResolvedValueOnce([]);

      await expect(service.publish('user-1', 'service-1', 'version-1')).rejects.toThrow(
        new Error('document version mutation returned no row'),
      );
    });

    it('skips publishing application if targetVersionId is null', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });

      txMock.select = vi
        .fn()
        .mockReturnValueOnce(
          mockQuery([{ id: 'version-1', status: 'draft', typeVersionId: 'tv-1', data: {} }]),
        )
        .mockReturnValueOnce(
          mockQuery([
            {
              targetVersionId: 'form-version-1',
              targetKind: 'basic-form',
              targetSchema: {},
              targetTitle: 'Form 1',
            },
            {
              targetVersionId: null, // targetVersionId is null
              targetKind: 'service_agreement',
              targetSchema: null,
              targetTitle: 'Agreement Ref',
            },
          ]),
        );

      serviceTypeResolverMock.schemaForVersion.mockResolvedValue({ type: 'object' });
      vi.mocked(validateData).mockReturnValueOnce({ valid: true, errors: [] });
      vi.mocked(formHasStructure).mockReturnValueOnce(true).mockReturnValueOnce(true);

      const mockPublished = {
        id: 'version-1',
        documentId: 'service-1',
        version: 1,
        status: 'published',
        data: {},
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };
      txMock.returning.mockResolvedValueOnce([mockPublished]);

      await service.publish('user-1', 'service-1', 'version-1');

      expect(txMock.update).toHaveBeenCalledWith(documentVersions);
    });
  });

  describe('archive', () => {
    it('archives an active service version', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'version-1', status: 'published' }]));

      const mockArchived = {
        id: 'version-1',
        documentId: 'service-1',
        version: 1,
        status: 'archived',
        data: {},
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };
      dbMock.returning.mockResolvedValueOnce([mockArchived]);

      const result = await service.archive('user-1', 'service-1', 'version-1');

      expect(result.status).toBe('archived');
    });

    it('throws ConflictException if already archived', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'version-1', status: 'archived' }]));

      await expect(service.archive('user-1', 'service-1', 'version-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws Error if archive mutation returns no row', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'version-1', status: 'published' }]));
      dbMock.returning.mockResolvedValueOnce([]); // empty

      await expect(service.archive('user-1', 'service-1', 'version-1')).rejects.toThrow(
        new Error('document version mutation returned no row'),
      );
    });

    it('throws NotFoundException if the version is not found', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      dbMock.select = vi.fn().mockReturnValueOnce(mockQuery([]));

      await expect(service.archive('user-1', 'service-1', 'version-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('discardVersion', () => {
    it('discards a draft version via discardVersionTx', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'version-1', status: 'draft' }]));

      await service.discardVersion('user-1', 'service-1', 'version-1');

      expect(vi.mocked(discardVersionTx)).toHaveBeenCalledWith(txMock, 'service-1', 'version-1');
    });

    it('throws ConflictException if trying to discard a published version', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'version-1', status: 'published' }]));

      await expect(service.discardVersion('user-1', 'service-1', 'version-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFoundException if the version is not found', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      dbMock.select = vi.fn().mockReturnValueOnce(mockQuery([]));

      await expect(service.discardVersion('user-1', 'service-1', 'version-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addVersion', () => {
    it('adds a new version by copying from the latest', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      serviceTypeResolverMock.resolve.mockResolvedValue({ typeId: 't-1', typeVersionId: 'tv-1' });

      // select latest version inside transaction:
      txMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'version-1', version: 1, data: { text: 'test' } }]));

      const mockNewVersion = {
        id: 'version-2',
        documentId: 'service-1',
        version: 2,
        status: 'draft',
        data: { text: 'test' },
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };
      txMock.returning.mockResolvedValueOnce([mockNewVersion]);

      const result = await service.addVersion('user-1', 'service-1');

      expect(txMock.insert).toHaveBeenCalledWith(documentVersions);
      expect(vi.mocked(copyReferences)).toHaveBeenCalledWith(txMock, {
        sourceVersionId: 'version-1',
        newVersionId: 'version-2',
        serviceId: 'service-1',
        workspaceId: 'ws-1',
      });
      expect(result.version).toBe(2);
    });

    it('throws Error if addVersion mutation returns no row', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      serviceTypeResolverMock.resolve.mockResolvedValue({ typeId: 't-1', typeVersionId: 'tv-1' });
      txMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ id: 'version-1', version: 1, data: {} }]));
      txMock.returning.mockResolvedValueOnce([]); // empty

      await expect(service.addVersion('user-1', 'service-1')).rejects.toThrow(
        new Error('document version mutation returned no row'),
      );
    });

    it('adds a new version as version 1 when no prior version exists', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      serviceTypeResolverMock.resolve.mockResolvedValue({ typeId: 't-1', typeVersionId: 'tv-1' });
      txMock.select = vi.fn().mockReturnValueOnce(mockQuery([]));

      const mockNewVersion = {
        id: 'version-1',
        documentId: 'service-1',
        version: 1,
        status: 'draft',
        data: {},
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };
      txMock.returning.mockResolvedValueOnce([mockNewVersion]);

      const result = await service.addVersion('user-1', 'service-1');

      expect(txMock.insert).toHaveBeenCalledWith(documentVersions);
      expect(vi.mocked(copyReferences)).not.toHaveBeenCalled();
      expect(result.version).toBe(1);
      expect(result.data).toEqual({});
    });
  });
});
