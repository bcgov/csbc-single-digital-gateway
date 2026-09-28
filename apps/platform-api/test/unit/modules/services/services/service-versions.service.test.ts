import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { documentVersions } from '@repo/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceVersionsService } from '../../../../../src/modules/services/services/service-versions.service';
import { discardVersionTx } from '../../../../../src/modules/services/util/version-copy';

vi.mock('../../../../../src/modules/services/util/version-copy', () => ({
  discardVersionTx: vi.fn(),
  reactivateServiceTx: vi.fn(),
}));

/**
 * Feature 217. A draft save writes ONE `content` — no `data`, no title sync onto the document row
 * (the title is GENERATED from `content.uischema.label`), and no reconciled application
 * references. Publish validates the content's SHAPE; it no longer validates filled values against
 * the template's JSON schema (a service has no values), and no longer gates on
 * "≥ 1 application method", which needed `document_references`.
 */

const mockQuery = (resolvedValue: unknown) => {
  const qb = Promise.resolve(resolvedValue);
  return Object.assign(qb, {
    from: vi.fn().mockReturnValue(qb),
    innerJoin: vi.fn().mockReturnValue(qb),
    limit: vi.fn().mockReturnValue(qb),
    orderBy: vi.fn().mockReturnValue(qb),
    where: vi.fn().mockReturnValue(qb),
  });
};

const CONTENT = {
  schema: { type: 'object', properties: {} },
  uischema: { type: 'Service', elements: [], label: 'Waste permit' },
};
const TEMPLATE = {
  templateId: 'template-1',
  templateVersionId: 'template-version-1',
  schema: { type: 'object', properties: {} },
  uischema: { type: 'Service', elements: [] },
};
const SERVICE_DOC = {
  id: 'service-1',
  workspaceId: 'ws-1',
  type: 'services.service' as const,
  kind: 'document' as const,
  templateId: TEMPLATE.templateId,
  templateKind: 'template' as const,
  createdAt: new Date('2026-07-12T00:00:00.000Z'),
  updatedAt: new Date('2026-07-12T00:00:00.000Z'),
};
const draftVersion = (over: Record<string, unknown> = {}) => ({
  id: 'version-1',
  documentId: 'service-1',
  templateId: TEMPLATE.templateId,
  templateVersionId: TEMPLATE.templateVersionId,
  versionNumber: 1,
  revision: 1,
  status: 'draft',
  title: 'Waste permit',
  description: null,
  content: CONTENT,
  createdAt: new Date('2026-07-12T00:00:00.000Z'),
  updatedAt: new Date('2026-07-12T00:00:00.000Z'),
  publishedAt: null,
  archivedAt: null,
  ...over,
});

describe('ServiceVersionsService', () => {
  let service: ServiceVersionsService;
  let dbMock: any;
  let txMock: any;
  let servicesServiceMock: any;
  let templatesMock: any;

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

    servicesServiceMock = { requireDocument: vi.fn().mockResolvedValue(SERVICE_DOC) };
    templatesMock = {
      forDocument: vi.fn().mockResolvedValue(TEMPLATE),
      // Doc 222: ungoverned — these cases are about versioning, not capabilities.
      capabilitiesForVersion: vi.fn().mockResolvedValue(undefined),
    };

    service = new ServiceVersionsService(dbMock, servicesServiceMock, templatesMock);
  });

  describe('updateDraft', () => {
    it('writes the content and bumps the revision', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([draftVersion()]));
      dbMock.returning.mockResolvedValueOnce([draftVersion({ revision: 2 })]);

      const result = await service.updateDraft('user-1', 'service-1', 'version-1', {
        content: CONTENT,
      });

      expect(dbMock.update).toHaveBeenCalledWith(documentVersions);
      const setArg = dbMock.set.mock.calls[0][0];
      expect(setArg.content).toEqual(CONTENT);
      expect(setArg.revision).toBeDefined();
      expect(result.revision).toBe(2);
    });

    it('never writes a document title — there is no title column to sync', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([draftVersion()]));
      dbMock.returning.mockResolvedValueOnce([draftVersion()]);

      await service.updateDraft('user-1', 'service-1', 'version-1', { content: CONTENT });

      expect(dbMock.update).toHaveBeenCalledTimes(1);
      expect(dbMock.set.mock.calls[0][0]).not.toHaveProperty('title');
    });

    it('rejects a content whose root is not a Service', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([draftVersion()]));

      await expect(
        service.updateDraft('user-1', 'service-1', 'version-1', {
          content: {
            schema: { type: 'object', properties: {} },
            uischema: { type: 'Form', elements: [] },
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if the version is not a draft', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([draftVersion({ status: 'published' })]));

      await expect(
        service.updateDraft('user-1', 'service-1', 'version-1', { content: CONTENT }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException if the version is not found', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([]));

      await expect(
        service.updateDraft('user-1', 'service-1', 'version-1', { content: CONTENT }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('publish', () => {
    it('archives the currently-published version BEFORE promoting the draft', async () => {
      // The partial unique index is not deferrable, so promote-then-demote would collide.
      txMock.select.mockReturnValueOnce(mockQuery([draftVersion()]));
      txMock.returning.mockResolvedValueOnce([
        draftVersion({ status: 'published', publishedAt: new Date() }),
      ]);

      const result = await service.publish('user-1', 'service-1', 'version-1');

      expect(txMock.update).toHaveBeenNthCalledWith(1, documentVersions);
      expect(txMock.set.mock.calls[0][0]).toHaveProperty('archivedAt');
      expect(txMock.set.mock.calls[1][0]).toHaveProperty('publishedAt');
      expect(result.status).toBe('published');
    });

    it('validates the content shape rather than filled values', async () => {
      txMock.select.mockReturnValueOnce(
        mockQuery([
          draftVersion({
            content: {
              schema: { type: 'object', properties: {} },
              uischema: { type: 'Form', elements: [] },
            },
          }),
        ]),
      );

      await expect(service.publish('user-1', 'service-1', 'version-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('does not require an application method to publish', async () => {
      // Feature 217: the "a service needs ≥ 1 way to apply" gate needed document_references.
      txMock.select.mockReturnValueOnce(mockQuery([draftVersion()]));
      txMock.returning.mockResolvedValueOnce([draftVersion({ status: 'published' })]);

      await expect(service.publish('user-1', 'service-1', 'version-1')).resolves.toBeDefined();
      expect(txMock.select).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException if the version is not found', async () => {
      txMock.select.mockReturnValueOnce(mockQuery([]));

      await expect(service.publish('user-1', 'service-1', 'version-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException when publishing a non-draft version', async () => {
      txMock.select.mockReturnValueOnce(mockQuery([draftVersion({ status: 'archived' })]));

      await expect(service.publish('user-1', 'service-1', 'version-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws if the promote mutation returns no row', async () => {
      txMock.select.mockReturnValueOnce(mockQuery([draftVersion()]));
      txMock.returning.mockResolvedValueOnce([]);

      await expect(service.publish('user-1', 'service-1', 'version-1')).rejects.toThrow(
        'document version mutation returned no row',
      );
    });
  });

  describe('archive', () => {
    it('archives an active version', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([draftVersion()]));
      dbMock.returning.mockResolvedValueOnce([draftVersion({ status: 'archived' })]);

      const result = await service.archive('user-1', 'service-1', 'version-1');

      expect(dbMock.update).toHaveBeenCalledWith(documentVersions);
      expect(result.status).toBe('archived');
    });

    it('throws ConflictException if it is already archived', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([draftVersion({ status: 'archived' })]));

      await expect(service.archive('user-1', 'service-1', 'version-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws if the archive mutation returns no row', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([draftVersion()]));
      dbMock.returning.mockResolvedValueOnce([]);

      await expect(service.archive('user-1', 'service-1', 'version-1')).rejects.toThrow(
        'document version mutation returned no row',
      );
    });

    it('throws NotFoundException if the version is not found', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([]));

      await expect(service.archive('user-1', 'service-1', 'version-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('discardVersion', () => {
    it('discards a draft version via discardVersionTx', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([draftVersion()]));

      await service.discardVersion('user-1', 'service-1', 'version-1');

      expect(vi.mocked(discardVersionTx)).toHaveBeenCalledWith(txMock, 'service-1', 'version-1');
    });

    it('throws ConflictException when discarding a published version', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([draftVersion({ status: 'published' })]));

      await expect(service.discardVersion('user-1', 'service-1', 'version-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFoundException if the version is not found', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([]));

      await expect(service.discardVersion('user-1', 'service-1', 'version-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addVersion', () => {
    it('copies the latest version content into the next version number', async () => {
      txMock.select.mockReturnValueOnce(mockQuery([draftVersion({ versionNumber: 2 })]));
      txMock.returning.mockResolvedValueOnce([draftVersion({ id: 'version-3', versionNumber: 3 })]);

      const result = await service.addVersion('user-1', 'service-1');

      const values = txMock.values.mock.calls[0][0];
      expect(values.versionNumber).toBe(3);
      expect(values.content).toEqual(CONTENT);
      expect(values.templateVersionId).toBe(TEMPLATE.templateVersionId);
      expect(result.versionNumber).toBe(3);
    });

    it('starts at version 1 from the template when there is no prior version', async () => {
      txMock.select.mockReturnValueOnce(mockQuery([]));
      txMock.returning.mockResolvedValueOnce([draftVersion()]);

      await service.addVersion('user-1', 'service-1');

      const values = txMock.values.mock.calls[0][0];
      expect(values.versionNumber).toBe(1);
      expect(values.content).toEqual({ schema: TEMPLATE.schema, uischema: TEMPLATE.uischema });
    });

    it('throws if the insert returns no row', async () => {
      txMock.select.mockReturnValueOnce(mockQuery([]));
      txMock.returning.mockResolvedValueOnce([]);

      await expect(service.addVersion('user-1', 'service-1')).rejects.toThrow(
        'document version mutation returned no row',
      );
    });
  });
});
