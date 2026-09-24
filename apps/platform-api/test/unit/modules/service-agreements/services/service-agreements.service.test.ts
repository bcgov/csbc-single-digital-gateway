import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { documentVersions, documents } from '@repo/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceAgreementsService } from '../../../../../src/modules/service-agreements/services/service-agreements.service';

/**
 * Feature 217. An agreement is a `documents` row with `type = 'service-agreement'`: create takes a
 * TITLE (stamped into the content's root label, which the GENERATED title column reads) rather
 * than a `data` blob; a draft save writes one `content`; publish validates the content's SHAPE
 * rather than filled values against a JSON schema; and the "attached services" list and the
 * "only editable while its service is a draft" gate are gone with `document_references`.
 */

const mockQuery = (resolvedValue: unknown) => {
  const qb = Promise.resolve(resolvedValue);
  return Object.assign(qb, {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  });
};

const TEMPLATE = {
  templateId: 'template-1',
  templateVersionId: 'template-version-1',
  schema: { type: 'object', properties: {} },
  uischema: { type: 'Form', elements: [] },
};
const CONTENT = {
  schema: { type: 'object', properties: {} },
  uischema: { type: 'Form', elements: [], label: 'Terms' },
};

const agreementDoc = (over: Record<string, unknown> = {}) => ({
  id: 'agreement-1',
  workspaceId: null,
  type: 'service-agreement',
  kind: 'document',
  templateId: TEMPLATE.templateId,
  templateKind: 'template',
  createdAt: new Date('2026-07-28T12:00:00.000Z'),
  updatedAt: new Date('2026-07-28T12:00:00.000Z'),
  ...over,
});
const agreementVersion = (over: Record<string, unknown> = {}) => ({
  id: 'version-1',
  documentId: 'agreement-1',
  templateId: TEMPLATE.templateId,
  templateVersionId: TEMPLATE.templateVersionId,
  versionNumber: 1,
  revision: 1,
  status: 'draft',
  title: 'Terms',
  description: null,
  content: CONTENT,
  createdAt: new Date('2026-07-28T12:00:00.000Z'),
  updatedAt: new Date('2026-07-28T12:00:00.000Z'),
  publishedAt: null,
  archivedAt: null,
  ...over,
});

describe('ServiceAgreementsService', () => {
  let service: ServiceAgreementsService;
  let dbMock: any;
  let txMock: any;
  let templatesMock: any;

  const mockAdminActor = { id: 'admin-1', isAdmin: true };
  const mockUserActor = { id: 'user-1', isAdmin: false };
  const mockWorkspaceId = 'e6005cbb-84f9-467a-bb48-e8cbffc9c991';

  beforeEach(() => {
    vi.clearAllMocks();

    txMock = {
      select: vi.fn().mockImplementation(() => mockQuery([])),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };

    dbMock = {
      select: vi.fn().mockImplementation(() => mockQuery([])),
      selectDistinct: vi.fn().mockImplementation(() => mockQuery([])),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      transaction: vi.fn().mockImplementation(async (cb) => cb(txMock)),
    };

    templatesMock = { resolve: vi.fn().mockResolvedValue(TEMPLATE) };

    service = new ServiceAgreementsService(dbMock, templatesMock);
  });

  describe('create', () => {
    it('throws ForbiddenException if a non-admin creates a global agreement', async () => {
      await expect(service.create(mockUserActor, { title: 'Terms' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException if the caller is not a member of the target workspace', async () => {
      dbMock.select.mockImplementationOnce(() => mockQuery([]));

      await expect(
        service.create(mockUserActor, { workspaceId: mockWorkspaceId, title: 'Terms' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates a workspace-scoped agreement and its draft v1', async () => {
      dbMock.select.mockImplementationOnce(() => mockQuery([{ role: 'member' }]));
      txMock.returning
        .mockResolvedValueOnce([agreementDoc({ workspaceId: mockWorkspaceId })])
        .mockResolvedValueOnce([agreementVersion()]);

      const result = await service.create(mockUserActor, {
        workspaceId: mockWorkspaceId,
        title: 'Terms',
      });

      expect(txMock.insert).toHaveBeenNthCalledWith(1, documents);
      expect(txMock.insert).toHaveBeenNthCalledWith(2, documentVersions);
      expect(txMock.values.mock.calls[0][0]).toEqual({
        type: 'service-agreement',
        kind: 'document',
        workspaceId: mockWorkspaceId,
        templateId: TEMPLATE.templateId,
      });
      expect(result.agreement.id).toBe('agreement-1');
    });

    it('stamps the title into the label the GENERATED title column reads', async () => {
      dbMock.select.mockImplementationOnce(() => mockQuery([{ role: 'member' }]));
      txMock.returning
        .mockResolvedValueOnce([agreementDoc({ workspaceId: mockWorkspaceId })])
        .mockResolvedValueOnce([agreementVersion()]);

      await service.create(mockUserActor, { workspaceId: mockWorkspaceId, title: 'Terms' });

      const values = txMock.values.mock.calls[1][0];
      expect(values.content.uischema.label).toBe('Terms');
      expect(values.templateVersionId).toBe(TEMPLATE.templateVersionId);
      expect(values.versionNumber).toBe(1);
    });

    it('lets an admin create a global agreement (workspaceId null)', async () => {
      txMock.returning
        .mockResolvedValueOnce([agreementDoc()])
        .mockResolvedValueOnce([agreementVersion()]);

      const result = await service.create(mockAdminActor, { title: 'Terms' });

      expect(txMock.values.mock.calls[0][0].workspaceId).toBeNull();
      expect(result.agreement.workspaceId).toBeNull();
    });

    it('throws if the document insert returns no row', async () => {
      txMock.returning.mockResolvedValueOnce([]);

      await expect(service.create(mockAdminActor, { title: 'Terms' })).rejects.toThrow(
        'document insert returned no row',
      );
    });

    it('throws if the version insert returns no row', async () => {
      txMock.returning.mockResolvedValueOnce([agreementDoc()]).mockResolvedValueOnce([]);

      await expect(service.create(mockAdminActor, { title: 'Terms' })).rejects.toThrow(
        'document version insert returned no row',
      );
    });
  });

  describe('list', () => {
    it('throws ForbiddenException if a non-admin lists global agreements', async () => {
      await expect(service.list(mockUserActor, {})).rejects.toThrow(ForbiddenException);
    });

    it('takes each row title from its current version', async () => {
      dbMock.select
        .mockImplementationOnce(() => mockQuery([{ role: 'member' }])) // requireMembership
        .mockImplementationOnce(() => mockQuery([agreementDoc({ workspaceId: mockWorkspaceId })]))
        .mockImplementationOnce(() =>
          mockQuery([agreementVersion({ status: 'published', publishedAt: new Date() })]),
        );

      const result = await service.list(mockUserActor, { workspaceId: mockWorkspaceId });

      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe('Terms');
      expect(result[0]?.status).toBe('published');
      expect(result[0]?.isGlobal).toBe(false);
    });

    it('marks a workspace-less agreement as global', async () => {
      dbMock.select
        .mockImplementationOnce(() => mockQuery([agreementDoc()]))
        .mockImplementationOnce(() => mockQuery([]));

      const result = await service.list(mockAdminActor, {});

      expect(result[0]?.isGlobal).toBe(true);
      expect(result[0]?.status).toBe('none');
    });
  });

  describe('get', () => {
    it('throws NotFoundException if a non-member reads a workspace agreement', async () => {
      dbMock.select
        .mockImplementationOnce(() => mockQuery([agreementDoc({ workspaceId: mockWorkspaceId })]))
        .mockImplementationOnce(() => mockQuery([])); // not a member

      await expect(service.get(mockUserActor, 'agreement-1')).rejects.toThrow(NotFoundException);
    });

    it('returns the agreement, its versions and the template, with no attached-services list', async () => {
      dbMock.select
        .mockImplementationOnce(() => mockQuery([agreementDoc()]))
        .mockImplementationOnce(() => mockQuery([agreementVersion()]));

      const result = await service.get(mockAdminActor, 'agreement-1');

      expect(result.agreement.title).toBe('Terms');
      expect(result.versions).toHaveLength(1);
      expect(result.definition).toEqual({ schema: TEMPLATE.schema, uischema: TEMPLATE.uischema });
      expect(result).not.toHaveProperty('services');
      // The attached-services lookup was the only selectDistinct in this service.
      expect(dbMock.selectDistinct).not.toHaveBeenCalled();
    });
  });

  describe('updateDraft', () => {
    it('writes the content and bumps the revision', async () => {
      dbMock.select
        .mockImplementationOnce(() => mockQuery([agreementDoc()]))
        .mockImplementationOnce(() => mockQuery([agreementVersion()]));
      dbMock.returning.mockResolvedValueOnce([agreementVersion({ revision: 2 })]);

      const result = await service.updateDraft(mockAdminActor, 'agreement-1', 'version-1', {
        content: CONTENT,
      });

      const setArg = dbMock.set.mock.calls[0][0];
      expect(setArg.content).toEqual(CONTENT);
      expect(setArg.revision).toBeDefined();
      expect(result.revision).toBe(2);
    });

    it('never writes a document title — there is no title column to sync', async () => {
      dbMock.select
        .mockImplementationOnce(() => mockQuery([agreementDoc()]))
        .mockImplementationOnce(() => mockQuery([agreementVersion()]));
      dbMock.returning.mockResolvedValueOnce([agreementVersion()]);

      await service.updateDraft(mockAdminActor, 'agreement-1', 'version-1', { content: CONTENT });

      expect(dbMock.update).toHaveBeenCalledTimes(1);
      expect(dbMock.update).not.toHaveBeenCalledWith(documents);
    });

    it('rejects a content whose root is not a Form', async () => {
      dbMock.select
        .mockImplementationOnce(() => mockQuery([agreementDoc()]))
        .mockImplementationOnce(() => mockQuery([agreementVersion()]));

      await expect(
        service.updateDraft(mockAdminActor, 'agreement-1', 'version-1', {
          content: {
            schema: { type: 'object', properties: {} },
            uischema: { type: 'Service', elements: [] },
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if the version is not a draft', async () => {
      dbMock.select
        .mockImplementationOnce(() => mockQuery([agreementDoc()]))
        .mockImplementationOnce(() => mockQuery([agreementVersion({ status: 'published' })]));

      await expect(
        service.updateDraft(mockAdminActor, 'agreement-1', 'version-1', { content: CONTENT }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ForbiddenException if a non-admin edits a global agreement', async () => {
      dbMock.select.mockImplementationOnce(() => mockQuery([agreementDoc()]));

      await expect(
        service.updateDraft(mockUserActor, 'agreement-1', 'version-1', { content: CONTENT }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addVersion', () => {
    it('copies the latest content into the next version number', async () => {
      dbMock.select.mockImplementationOnce(() => mockQuery([agreementDoc()]));
      txMock.select.mockImplementationOnce(() =>
        mockQuery([agreementVersion({ versionNumber: 2 })]),
      );
      txMock.returning.mockResolvedValueOnce([agreementVersion({ versionNumber: 3 })]);

      const result = await service.addVersion(mockAdminActor, 'agreement-1');

      const values = txMock.values.mock.calls[0][0];
      expect(values.versionNumber).toBe(3);
      expect(values.content).toEqual(CONTENT);
      expect(result.versionNumber).toBe(3);
    });

    it('starts at version 1 from the template when there is no prior version', async () => {
      dbMock.select.mockImplementationOnce(() => mockQuery([agreementDoc()]));
      txMock.select.mockImplementationOnce(() => mockQuery([]));
      txMock.returning.mockResolvedValueOnce([agreementVersion()]);

      await service.addVersion(mockAdminActor, 'agreement-1');

      const values = txMock.values.mock.calls[0][0];
      expect(values.versionNumber).toBe(1);
      expect(values.content).toEqual({ schema: TEMPLATE.schema, uischema: TEMPLATE.uischema });
    });
  });

  describe('publish', () => {
    it('validates the content shape rather than filled values', async () => {
      dbMock.select
        .mockImplementationOnce(() => mockQuery([agreementDoc()]))
        .mockImplementationOnce(() =>
          mockQuery([
            agreementVersion({
              content: {
                schema: { type: 'object', properties: {} },
                uischema: { type: 'Service', elements: [] },
              },
            }),
          ]),
        );

      await expect(service.publish(mockAdminActor, 'agreement-1', 'version-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('archives the currently-published version BEFORE promoting the draft', async () => {
      dbMock.select
        .mockImplementationOnce(() => mockQuery([agreementDoc()]))
        .mockImplementationOnce(() => mockQuery([agreementVersion()]));
      txMock.returning.mockResolvedValueOnce([
        agreementVersion({ status: 'published', publishedAt: new Date() }),
      ]);

      const result = await service.publish(mockAdminActor, 'agreement-1', 'version-1');

      expect(txMock.set.mock.calls[0][0]).toHaveProperty('archivedAt');
      expect(txMock.set.mock.calls[1][0]).toHaveProperty('publishedAt');
      expect(result.status).toBe('published');
    });

    it('throws if the promote mutation returns no row', async () => {
      dbMock.select
        .mockImplementationOnce(() => mockQuery([agreementDoc()]))
        .mockImplementationOnce(() => mockQuery([agreementVersion()]));
      txMock.returning.mockResolvedValueOnce([]);

      await expect(service.publish(mockAdminActor, 'agreement-1', 'version-1')).rejects.toThrow(
        'document version mutation returned no row',
      );
    });
  });

  describe('error boundaries', () => {
    it('throws NotFoundException if the agreement does not exist', async () => {
      dbMock.select.mockImplementationOnce(() => mockQuery([]));

      await expect(service.get(mockAdminActor, 'missing')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if a non-member non-admin updates a workspace agreement', async () => {
      dbMock.select
        .mockImplementationOnce(() => mockQuery([agreementDoc({ workspaceId: mockWorkspaceId })]))
        .mockImplementationOnce(() => mockQuery([])); // not a member

      await expect(
        service.updateDraft(mockUserActor, 'agreement-1', 'version-1', { content: CONTENT }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if the draft version is not found', async () => {
      dbMock.select
        .mockImplementationOnce(() => mockQuery([agreementDoc()]))
        .mockImplementationOnce(() => mockQuery([]));

      await expect(
        service.updateDraft(mockAdminActor, 'agreement-1', 'version-1', { content: CONTENT }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
