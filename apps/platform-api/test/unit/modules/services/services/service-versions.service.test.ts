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
import { createMockQuery } from '../../../../utils/create-mock-query';
import { createMockDb } from '../../../../utils/create-db-mock';
import { createMockService } from '../../../../utils/create-mock-services';

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

describe('ServiceVersionsService', () => {
  let service: ServiceVersionsService;
  let txMock: any;
  let dbMock: any;
  let servicesServiceMock: any;
  let serviceTypeResolverMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    const mocks = createMockDb();
    txMock = mocks.txMockQuery;
    dbMock = mocks.dbMockQuery;

    servicesServiceMock = createMockService();

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

    it('Should successfully update a draft version and sync title/applications', async () => {
      // 1. servicesService.requireDocument
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });

      // 2. requireVersion query -> status: draft
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ id: 'version-1', status: 'draft' }]));

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
      txMock.select = vi.fn().mockReturnValueOnce(createMockQuery([])); // no existing references

      const result = await service.updateDraft('user-1', 'service-1', 'version-1', {
        data: { title: 'Updated Title' },
        applications: [],
      });

      expect(servicesServiceMock.requireDocument).toHaveBeenCalledWith('user-1', 'service-1');
      expect(result.id).toBe('version-1');
      expect(result.data).toEqual({ title: 'Updated Title' });
    });

    it('Should throw ConflictException if version is not a draft', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ id: 'version-1', status: 'published' }]));

      await expect(
        service.updateDraft('user-1', 'service-1', 'version-1', { data: {} }),
      ).rejects.toThrow(ConflictException);
    });

    it('Should successfully resolve and insert a new application', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ id: 'version-1', status: 'draft' }]));

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
      txMock.select = vi.fn().mockReturnValueOnce(createMockQuery([])); // existing references count

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

    it('Should reorder applications successfully when applicationOrder is provided', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ id: 'version-1', status: 'draft' }]));

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
        .mockImplementationOnce(() => createMockQuery([{ id: 'ref-1' }, { id: 'ref-2' }]));

      await service.updateDraft('user-1', 'service-1', 'version-1', {
        data: {},
        applicationOrder: ['ref-2', 'ref-1', 'ref-invalid'],
      });

      expect(txMock.update).toHaveBeenCalledWith(documentReferences);
      expect(txMock.set).toHaveBeenCalledWith({ position: 0 });
      expect(txMock.set).toHaveBeenCalledWith({ position: 1 });
    });

    it('Should throw Error if version update returned no row', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ id: 'version-1', status: 'draft' }]));
      vi.mocked(resolveApplications).mockResolvedValueOnce([]);
      txMock.returning.mockResolvedValueOnce([]); // empty update returning

      await expect(
        service.updateDraft('user-1', 'service-1', 'version-1', { data: {} }),
      ).rejects.toThrow(new Error('document version mutation returned no row'));
    });

    it('Should update document title using input.title if provided', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ id: 'version-1', status: 'draft' }]));
      vi.mocked(resolveApplications).mockResolvedValueOnce([]);
      txMock.returning.mockResolvedValueOnce([mockDraftVersion]);
      txMock.select = vi.fn().mockReturnValueOnce(createMockQuery([]));

      await service.updateDraft('user-1', 'service-1', 'version-1', {
        title: 'Explicit Title Input',
        data: {},
      });

      expect(txMock.update).toHaveBeenCalledWith(documents);
      expect(txMock.set).toHaveBeenCalledWith({ title: 'Explicit Title Input' });
    });

    it('Should not update document title if title is empty or whitespace', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ id: 'version-1', status: 'draft' }]));
      vi.mocked(resolveApplications).mockResolvedValueOnce([]);
      txMock.returning.mockResolvedValueOnce([mockDraftVersion]);
      txMock.select = vi.fn().mockReturnValueOnce(createMockQuery([]));

      await service.updateDraft('user-1', 'service-1', 'version-1', {
        title: '   ',
        data: {},
      });

      expect(txMock.update).not.toHaveBeenCalledWith(documents);
    });

    it('Should not update document title if title is undefined', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ id: 'version-1', status: 'draft' }]));
      vi.mocked(resolveApplications).mockResolvedValueOnce([]);
      txMock.returning.mockResolvedValueOnce([mockDraftVersion]);
      txMock.select = vi.fn().mockReturnValueOnce(createMockQuery([]));

      await service.updateDraft('user-1', 'service-1', 'version-1', {
        data: {},
      });

      expect(txMock.update).not.toHaveBeenCalledWith(documents);
    });

    it('Should successfully delete a dropped application reference if referenced elsewhere', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ id: 'version-1', status: 'draft' }]));
      vi.mocked(resolveApplications).mockResolvedValueOnce([]);
      txMock.returning.mockResolvedValueOnce([mockDraftVersion]);

      txMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ id: 'ref-1', targetDocumentId: 'target-1' }]))
        .mockReturnValueOnce(createMockQuery([{ n: 2 }]));

      await service.updateDraft('user-1', 'service-1', 'version-1', {
        data: {},
        applications: [],
      });

      expect(txMock.delete).toHaveBeenCalledWith(documentReferences);
    });

    it('Should throw ConflictException if a dropped reference is not referenced elsewhere', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ id: 'version-1', status: 'draft' }]));
      vi.mocked(resolveApplications).mockResolvedValueOnce([]);

      txMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ id: 'ref-1', targetDocumentId: 'target-1' }]))
        .mockReturnValueOnce(createMockQuery([{ n: 1 }]));

      await expect(
        service.updateDraft('user-1', 'service-1', 'version-1', {
          data: {},
          applications: [],
        }),
      ).rejects.toThrow(new ConflictException('A form must be referenced by at least one service'));

      expect(txMock.delete).not.toHaveBeenCalled();
    });

    it('Should successfully update label and position of a kept application reference', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ id: 'version-1', status: 'draft' }]));
      vi.mocked(resolveApplications).mockResolvedValueOnce([]);
      txMock.returning.mockResolvedValueOnce([mockDraftVersion]);
      txMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ id: 'ref-1', targetDocumentId: 'target-1' }]));

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

    it('Should throw ConflictException if a dropped reference query returns empty counts', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ id: 'version-1', status: 'draft' }]));
      vi.mocked(resolveApplications).mockResolvedValueOnce([]);

      txMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ id: 'ref-1', targetDocumentId: 'target-1' }]))
        .mockReturnValueOnce(createMockQuery([])); // empty count returns undefined

      await expect(
        service.updateDraft('user-1', 'service-1', 'version-1', {
          data: {},
          applications: [],
        }),
      ).rejects.toThrow(new ConflictException('A form must be referenced by at least one service'));

      expect(txMock.delete).not.toHaveBeenCalled();
    });

    it('Should ignore kept application references that do not exist in the database', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ id: 'version-1', status: 'draft' }]));
      vi.mocked(resolveApplications).mockResolvedValueOnce([]);
      txMock.returning.mockResolvedValueOnce([mockDraftVersion]);
      txMock.select = vi.fn().mockReturnValueOnce(createMockQuery([])); // empty existing references

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
    it('Should successfully validate and publish a draft service version', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });

      // select calls in tx:
      // - requireVersion -> status: draft
      // - documentReferences -> returns 1 application
      txMock.select = vi
        .fn()
        .mockReturnValueOnce(
          createMockQuery([{ id: 'version-1', status: 'draft', typeVersionId: 'tv-1', data: {} }]),
        )
        .mockReturnValueOnce(
          createMockQuery([
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

    it('Should throw UnprocessableEntityException if validation fails', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      txMock.select = vi
        .fn()
        .mockReturnValueOnce(
          createMockQuery([{ id: 'version-1', status: 'draft', typeVersionId: 'tv-1', data: {} }]),
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

    it('Should throw UnprocessableEntityException if no application forms are referenced', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      txMock.select = vi
        .fn()
        .mockReturnValueOnce(
          createMockQuery([{ id: 'version-1', status: 'draft', typeVersionId: 'tv-1', data: {} }]),
        )
        .mockReturnValueOnce(createMockQuery([])); // empty references

      serviceTypeResolverMock.schemaForVersion.mockResolvedValue({ type: 'object' });
      vi.mocked(validateData).mockReturnValueOnce({ valid: true, errors: [] });

      await expect(service.publish('user-1', 'service-1', 'version-1')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('Should throw NotFoundException if the version is not found when publishing a service version', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      txMock.select = vi.fn().mockReturnValueOnce(createMockQuery([])); // version not found

      await expect(service.publish('user-1', 'service-1', 'version-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Should throw ConflictException if trying to publish a non-draft version', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      txMock.select = vi
        .fn()
        .mockReturnValueOnce(
          createMockQuery([
            { id: 'version-1', status: 'published', typeVersionId: 'tv-1', data: {} },
          ]),
        );

      await expect(service.publish('user-1', 'service-1', 'version-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('Should throw UnprocessableEntityException if a referenced form has no structure', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      txMock.select = vi
        .fn()
        .mockReturnValueOnce(
          createMockQuery([{ id: 'version-1', status: 'draft', typeVersionId: 'tv-1', data: {} }]),
        )
        .mockReturnValueOnce(
          createMockQuery([
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

    it('Should throw Error if publish mutation returns no row', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      txMock.select = vi
        .fn()
        .mockReturnValueOnce(
          createMockQuery([{ id: 'version-1', status: 'draft', typeVersionId: 'tv-1', data: {} }]),
        )
        .mockReturnValueOnce(
          createMockQuery([
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

    it('Should skip publishing application if targetVersionId is null', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });

      txMock.select = vi
        .fn()
        .mockReturnValueOnce(
          createMockQuery([{ id: 'version-1', status: 'draft', typeVersionId: 'tv-1', data: {} }]),
        )
        .mockReturnValueOnce(
          createMockQuery([
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
    it('Should archive an active service version', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ id: 'version-1', status: 'published' }]));

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

    it('Should throw ConflictException if already archived', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ id: 'version-1', status: 'archived' }]));

      await expect(service.archive('user-1', 'service-1', 'version-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('Should throw Error if archive mutation returns no row when archiving a service version', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ id: 'version-1', status: 'published' }]));
      dbMock.returning.mockResolvedValueOnce([]); // empty

      await expect(service.archive('user-1', 'service-1', 'version-1')).rejects.toThrow(
        new Error('document version mutation returned no row'),
      );
    });

    it('Should throw NotFoundException if the version is not found when archiving a service version', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      dbMock.select = vi.fn().mockReturnValueOnce(createMockQuery([]));

      await expect(service.archive('user-1', 'service-1', 'version-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('discardVersion', () => {
    it('Should discard a draft version via discardVersionTx', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ id: 'version-1', status: 'draft' }]));

      await service.discardVersion('user-1', 'service-1', 'version-1');

      expect(vi.mocked(discardVersionTx)).toHaveBeenCalledWith(txMock, 'service-1', 'version-1');
    });

    it('Should throw ConflictException if trying to discard a published version', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ id: 'version-1', status: 'published' }]));

      await expect(service.discardVersion('user-1', 'service-1', 'version-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('Should throw NotFoundException if the version is not found when discarding a service version', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ id: 'service-1' });
      dbMock.select = vi.fn().mockReturnValueOnce(createMockQuery([]));

      await expect(service.discardVersion('user-1', 'service-1', 'version-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addVersion', () => {
    it('Should add a new version by copying from the latest', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      serviceTypeResolverMock.resolve.mockResolvedValue({ typeId: 't-1', typeVersionId: 'tv-1' });

      // select latest version inside transaction:
      txMock.select = vi
        .fn()
        .mockReturnValueOnce(
          createMockQuery([{ id: 'version-1', version: 1, data: { text: 'test' } }]),
        );

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

    it('Should throw Error if addVersion mutation returns no row', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      serviceTypeResolverMock.resolve.mockResolvedValue({ typeId: 't-1', typeVersionId: 'tv-1' });
      txMock.select = vi
        .fn()
        .mockReturnValueOnce(createMockQuery([{ id: 'version-1', version: 1, data: {} }]));
      txMock.returning.mockResolvedValueOnce([]); // empty

      await expect(service.addVersion('user-1', 'service-1')).rejects.toThrow(
        new Error('document version mutation returned no row'),
      );
    });

    it('Should add a new version as version 1 when no prior version exists', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({
        id: 'service-1',
        workspaceId: 'ws-1',
      });
      serviceTypeResolverMock.resolve.mockResolvedValue({ typeId: 't-1', typeVersionId: 'tv-1' });
      txMock.select = vi.fn().mockReturnValueOnce(createMockQuery([]));

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
