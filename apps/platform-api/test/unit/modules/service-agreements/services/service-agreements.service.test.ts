import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ServiceAgreementsService } from '../../../../../src/modules/service-agreements/services/service-agreements.service';
import { createMockQuery } from '../../../../utils/create-mock-query';
import { createMockDoc, createMockVersion } from '../../../../utils/test-helpers';
import { createMockDb } from '../../../../utils/create-db-mock';

describe('ServiceAgreementsService', () => {
  let service: ServiceAgreementsService;
  let dbMock: any;
  let txMock: any;
  let agreementTypeMock: any;

  const mockAdminActor = { id: 'admin-1', isAdmin: true };
  const mockUserActor = { id: 'user-1', isAdmin: false };
  const mockWorkspaceId = 'e6005cbb-84f9-467a-bb48-e8cbffc9c991';

  beforeEach(() => {
    vi.clearAllMocks();

    const mocks = createMockDb();
    txMock = mocks.txMock;
    dbMock = mocks.dbMock;

    agreementTypeMock = {
      resolve: vi.fn().mockResolvedValue({
        typeId: 'type-123',
        typeVersionId: 'ver-123',
        schema: { type: 'object', properties: { title: { type: 'string' } } },
        uischema: {},
      }),
      schemaForVersion: vi.fn().mockResolvedValue({
        type: 'object',
        properties: { title: { type: 'string' } },
        required: ['title'],
      }),
    };

    service = new ServiceAgreementsService(dbMock, agreementTypeMock);
  });

  describe('create', () => {
    it('Should throw ForbiddenException if non-admin attempts to create a global service agreement', async () => {
      await expect(service.create(mockUserActor, { data: { title: 'Terms' } })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('Should throw NotFoundException if user is not a member of the target workspace', async () => {
      dbMock.select.mockImplementationOnce(() => createMockQuery([])); // isMember -> false

      await expect(
        service.create(mockUserActor, {
          workspaceId: mockWorkspaceId,
          data: { title: 'Terms' },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('Should create workspace-scoped service agreement successfully', async () => {
      dbMock.select.mockImplementationOnce(() => createMockQuery([{ role: 'member' }])); // isMember -> true
      const mockDoc = createMockDoc({
        id: 'doc-123',
        workspaceId: mockWorkspaceId,
        kind: 'service-agreement',
        title: 'Terms',
        createdAt: new Date('2026-07-28T12:00:00.000Z'),
        updatedAt: new Date('2026-07-28T12:00:00.000Z'),
      });
      const mockVer = createMockVersion({
        data: { title: 'Terms' },
      });

      txMock.returning.mockResolvedValueOnce([mockDoc]).mockResolvedValueOnce([mockVer]);

      const result = await service.create(mockUserActor, {
        workspaceId: mockWorkspaceId,
        data: { title: 'Terms' },
      });

      expect(result).toEqual({
        agreement: {
          id: 'doc-123',
          workspaceId: mockWorkspaceId,
          title: 'Terms',
          kind: 'service-agreement',
          createdAt: '2026-07-28T12:00:00.000Z',
          updatedAt: '2026-07-28T12:00:00.000Z',
        },
        version: {
          id: 'ver-123',
          version: 1,
          status: 'draft',
          data: { title: 'Terms' },
          createdAt: '2026-07-28T12:00:00.000Z',
          publishedAt: null,
          archivedAt: null,
        },
      });
    });

    it('Should create global service agreement successfully by admin', async () => {
      const mockDoc = createMockDoc({
        id: 'doc-global',
        workspaceId: null,
        kind: 'service-agreement',
        title: 'Global Terms',
        createdAt: new Date('2026-07-28T12:00:00.000Z'),
        updatedAt: new Date('2026-07-28T12:00:00.000Z'),
      });
      const mockVer = createMockVersion({
        id: 'ver-global',
        data: { title: 'Global Terms' },
      });

      txMock.returning.mockResolvedValueOnce([mockDoc]).mockResolvedValueOnce([mockVer]);

      const result = await service.create(mockAdminActor, {
        data: { title: 'Global Terms' },
      });

      expect(result.agreement.workspaceId).toBeNull();
      expect(result.agreement.title).toBe('Global Terms');
    });

    it('Should throw Error if document insert returned no row when creating service agreements', async () => {
      txMock.returning.mockResolvedValueOnce([]); // empty document insert returning

      await expect(
        service.create(mockAdminActor, {
          data: { title: 'Global Terms' },
        }),
      ).rejects.toThrow('document insert returned no row');
    });

    it('Should create workspace-scoped service agreement with untitled fallback title if title is missing or empty', async () => {
      dbMock.select.mockImplementationOnce(() => createMockQuery([{ role: 'member' }])); // isMember -> true
      const mockDoc = createMockDoc({
        id: 'doc-123',
        workspaceId: mockWorkspaceId,
        kind: 'service-agreement',
        title: 'Untitled service agreement',
        createdAt: new Date('2026-07-28T12:00:00.000Z'),
        updatedAt: new Date('2026-07-28T12:00:00.000Z'),
      });
      const mockVer = createMockVersion({
        id: 'ver-123',
      });

      txMock.returning.mockResolvedValueOnce([mockDoc]).mockResolvedValueOnce([mockVer]);

      const result = await service.create(mockUserActor, {
        workspaceId: mockWorkspaceId,
        data: {},
      });

      expect(result.agreement.title).toBe('Untitled service agreement');
    });
  });

  describe('list', () => {
    it('Should throw ForbiddenException if non-admin tries to list global service agreements', async () => {
      await expect(service.list(mockUserActor, {})).rejects.toThrow(ForbiddenException);
    });

    it('Should list agreements successfully', async () => {
      dbMock.select
        .mockImplementationOnce(() => createMockQuery([{ role: 'member' }])) // isMember -> true
        .mockImplementationOnce(() =>
          createMockQuery([
            {
              id: 'doc-123',
              workspaceId: mockWorkspaceId,
              title: 'Terms',
              kind: 'service-agreement',
              createdAt: new Date('2026-07-28T12:00:00.000Z'),
              updatedAt: new Date('2026-07-28T12:00:00.000Z'),
            },
          ]),
        ) // select docs
        .mockImplementationOnce(() => createMockQuery([{ status: 'published' }])); // versionsOf

      const result = await service.list(mockUserActor, { workspaceId: mockWorkspaceId });

      expect(result).toEqual([
        {
          id: 'doc-123',
          workspaceId: mockWorkspaceId,
          title: 'Terms',
          kind: 'service-agreement',
          createdAt: '2026-07-28T12:00:00.000Z',
          updatedAt: '2026-07-28T12:00:00.000Z',
          status: 'published',
          isGlobal: false,
        },
      ]);
    });

    it('Should list global agreements successfully by admin with various version statuses (draft, archived, none)', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          createMockQuery([
            {
              id: 'doc-draft',
              workspaceId: null,
              title: 'Draft Global',
              kind: 'service-agreement',
              createdAt: new Date('2026-07-28T12:00:00.000Z'),
              updatedAt: new Date('2026-07-28T12:00:00.000Z'),
            },
            {
              id: 'doc-archived',
              workspaceId: null,
              title: 'Archived Global',
              kind: 'service-agreement',
              createdAt: new Date('2026-07-28T12:00:00.000Z'),
              updatedAt: new Date('2026-07-28T12:00:00.000Z'),
            },
            {
              id: 'doc-none',
              workspaceId: null,
              title: 'None Global',
              kind: 'service-agreement',
              createdAt: new Date('2026-07-28T12:00:00.000Z'),
              updatedAt: new Date('2026-07-28T12:00:00.000Z'),
            },
          ]),
        ) // select docs
        .mockImplementationOnce(() => createMockQuery([{ status: 'draft' }])) // versionsOf doc-draft
        .mockImplementationOnce(() => createMockQuery([{ status: 'archived' }])) // versionsOf doc-archived
        .mockImplementationOnce(() => createMockQuery([])); // versionsOf doc-none (empty)

      const result = await service.list(mockAdminActor, {});

      expect(result).toHaveLength(3);
      expect(result[0]!.status).toBe('draft');
      expect(result[0]!.isGlobal).toBe(true);
      expect(result[1]!.status).toBe('archived');
      expect(result[1]!.isGlobal).toBe(true);
      expect(result[2]!.status).toBe('none');
      expect(result[2]!.isGlobal).toBe(true);
    });
  });

  describe('listPage', () => {
    it('Should throw ForbiddenException if non-admin tries to list global service agreements', async () => {
      await expect(
        service.listPage(mockUserActor, {
          sort: 'updated',
          order: 'desc',
          limit: 10,
          offset: 0,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Should throw NotFoundException if user is not a member of the target workspace', async () => {
      dbMock.select.mockImplementationOnce(() => createMockQuery([])); // isMember -> false
      await expect(
        service.listPage(mockUserActor, {
          workspaceId: mockWorkspaceId,
          sort: 'updated',
          order: 'desc',
          limit: 10,
          offset: 0,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('Should list workspace-scoped agreements with search query, sort title asc, and aggregate multiple versions', async () => {
      dbMock.select
        .mockImplementationOnce(() => createMockQuery([{ role: 'member' }])) // isMember -> true
        .mockImplementationOnce(() =>
          createMockQuery([
            {
              id: 'doc-1',
              workspaceId: mockWorkspaceId,
              title: 'Terms of Service',
              kind: 'service-agreement',
              createdAt: new Date('2026-07-28T12:00:00.000Z'),
              updatedAt: new Date('2026-07-28T12:00:00.000Z'),
            },
            {
              id: 'doc-2',
              workspaceId: mockWorkspaceId,
              title: 'Privacy Policy',
              kind: 'service-agreement',
              createdAt: new Date('2026-07-28T12:00:00.000Z'),
              updatedAt: new Date('2026-07-28T12:00:00.000Z'),
            },
          ]),
        ) // docs
        .mockImplementationOnce(() => createMockQuery([{ count: 2 }])) // totals
        .mockImplementationOnce(() =>
          createMockQuery([
            { documentId: 'doc-1', status: 'draft' },
            { documentId: 'doc-1', status: 'published' },
          ]),
        ); // versionRows

      const result = await service.listPage(mockUserActor, {
        workspaceId: mockWorkspaceId,
        q: '  terms  ',
        sort: 'title',
        order: 'asc',
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual({
        items: [
          {
            id: 'doc-1',
            workspaceId: mockWorkspaceId,
            title: 'Terms of Service',
            kind: 'service-agreement',
            createdAt: '2026-07-28T12:00:00.000Z',
            updatedAt: '2026-07-28T12:00:00.000Z',
            status: 'published',
            isGlobal: false,
          },
          {
            id: 'doc-2',
            workspaceId: mockWorkspaceId,
            title: 'Privacy Policy',
            kind: 'service-agreement',
            createdAt: '2026-07-28T12:00:00.000Z',
            updatedAt: '2026-07-28T12:00:00.000Z',
            status: 'none',
            isGlobal: false,
          },
        ],
        total: 2,
        limit: 10,
        offset: 0,
      });
    });

    it('Should list global agreements by admin with sort status, blank q string, and totals fallback', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          createMockQuery([
            {
              id: 'doc-global',
              workspaceId: null,
              title: 'Global Agreement',
              kind: 'service-agreement',
              createdAt: new Date('2026-07-28T12:00:00.000Z'),
              updatedAt: new Date('2026-07-28T12:00:00.000Z'),
            },
          ]),
        ) // docs
        .mockImplementationOnce(() => createMockQuery([])) // totals empty [] to test totals[0]?.count ?? 0
        .mockImplementationOnce(() =>
          createMockQuery([{ documentId: 'doc-global', status: 'draft' }]),
        ); // versionRows

      const result = await service.listPage(mockAdminActor, {
        q: '   ',
        sort: 'status',
        order: 'desc',
        limit: 5,
        offset: 10,
      });

      expect(result).toEqual({
        items: [
          {
            id: 'doc-global',
            workspaceId: null,
            title: 'Global Agreement',
            kind: 'service-agreement',
            createdAt: '2026-07-28T12:00:00.000Z',
            updatedAt: '2026-07-28T12:00:00.000Z',
            status: 'draft',
            isGlobal: true,
          },
        ],
        total: 0,
        limit: 5,
        offset: 10,
      });
    });

    it('Should return empty items and not query versions when docs is empty', async () => {
      dbMock.select
        .mockImplementationOnce(() => createMockQuery([])) // docs
        .mockImplementationOnce(() => createMockQuery([{ count: 0 }])); // totals

      const result = await service.listPage(mockAdminActor, {
        sort: 'updated',
        order: 'desc',
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual({
        items: [],
        total: 0,
        limit: 10,
        offset: 0,
      });
    });
  });

  describe('get', () => {
    it('Should throw NotFoundException if user has no access to workspace service agreement', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          createMockQuery([
            {
              id: 'doc-123',
              workspaceId: mockWorkspaceId,
              kind: 'service-agreement',
            },
          ]),
        ) // loadAgreement
        .mockImplementationOnce(() => createMockQuery([])); // isMember -> false

      await expect(service.get(mockUserActor, 'doc-123')).rejects.toThrow(NotFoundException);
    });

    it('Should retrieve details successfully', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          createMockQuery([
            {
              id: 'doc-123',
              workspaceId: null, // global
              kind: 'service-agreement',
              title: 'Global Terms',
              createdAt: new Date('2026-07-28T12:00:00.000Z'),
              updatedAt: new Date('2026-07-28T12:00:00.000Z'),
            },
          ]),
        ) // loadAgreement
        .mockImplementationOnce(() =>
          createMockQuery([
            {
              id: 'ver-123',
              version: 1,
              status: 'published',
              data: {},
              createdAt: new Date('2026-07-28T12:00:00.000Z'),
              updatedAt: new Date('2026-07-28T12:00:00.000Z'),
              publishedAt: new Date('2026-07-28T12:00:00.000Z'),
              archivedAt: null,
            },
          ]),
        ); // versionsOf

      dbMock.selectDistinct.mockImplementationOnce(() => createMockQuery([])); // associatedServices

      const result = await service.get(mockUserActor, 'doc-123');

      expect(result).toEqual({
        agreement: {
          id: 'doc-123',
          workspaceId: null,
          title: 'Global Terms',
          kind: 'service-agreement',
          createdAt: '2026-07-28T12:00:00.000Z',
          updatedAt: '2026-07-28T12:00:00.000Z',
        },
        versions: [
          {
            id: 'ver-123',
            version: 1,
            status: 'published',
            data: {},
            createdAt: '2026-07-28T12:00:00.000Z',
            publishedAt: '2026-07-28T12:00:00.000Z',
            archivedAt: null,
          },
        ],
        definition: {
          schema: { type: 'object', properties: { title: { type: 'string' } } },
          uischema: {},
        },
        services: [],
      });
    });

    it('Should retrieve details successfully by admin', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          createMockQuery([
            {
              id: 'doc-123',
              workspaceId: 'ws-123', // workspace scoped
              kind: 'service-agreement',
              title: 'Global Terms',
              createdAt: new Date('2026-07-28T12:00:00.000Z'),
              updatedAt: new Date('2026-07-28T12:00:00.000Z'),
            },
          ]),
        ) // loadAgreement
        .mockImplementationOnce(() =>
          createMockQuery([
            {
              id: 'ver-123',
              version: 1,
              status: 'published',
              data: {},
              createdAt: new Date('2026-07-28T12:00:00.000Z'),
              updatedAt: new Date('2026-07-28T12:00:00.000Z'),
              publishedAt: new Date('2026-07-28T12:00:00.000Z'),
            },
          ]),
        ); // versionsOf

      dbMock.selectDistinct.mockImplementationOnce(() =>
        createMockQuery([{ id: 'svc-1', title: 'Service 1', workspaceSlug: 'slug-1' }]),
      ); // associatedServices (will cover isAdmin check)

      const result = await service.get(mockAdminActor, 'doc-123');

      expect(result.services).toHaveLength(1);
    });
  });

  describe('updateDraft', () => {
    it('Should throw ConflictException if agreement status is not draft', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          createMockQuery([{ id: 'doc-123', workspaceId: null, kind: 'service-agreement' }]),
        ) // loadAgreement
        .mockImplementationOnce(() => createMockQuery([{ id: 'ver-123', status: 'published' }])); // requireDraftVersion (not draft)

      await expect(
        service.updateDraft(mockAdminActor, 'doc-123', 'ver-123', {
          title: 'New Title',
          data: {},
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('Should update draft version data successfully', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          createMockQuery([{ id: 'doc-123', workspaceId: null, kind: 'service-agreement' }]),
        ) // loadAgreement
        .mockImplementationOnce(() => createMockQuery([{ id: 'ver-123', status: 'draft' }])) // requireDraftVersion
        .mockImplementationOnce(() => createMockQuery([])); // requireServiceEditable (none)

      dbMock.returning.mockResolvedValueOnce([
        {
          id: 'ver-123',
          version: 1,
          status: 'draft',
          data: { title: 'New Title' },
          createdAt: new Date('2026-07-28T12:00:00.000Z'),
          publishedAt: null,
          archivedAt: null,
        },
      ]);

      const result = await service.updateDraft(mockAdminActor, 'doc-123', 'ver-123', {
        title: 'New Title',
        data: { title: 'New Title' },
      });

      expect(result).toEqual({
        id: 'ver-123',
        version: 1,
        status: 'draft',
        data: { title: 'New Title' },
        createdAt: '2026-07-28T12:00:00.000Z',
        publishedAt: null,
        archivedAt: null,
      });
    });

    it('Should update draft title falling back to titleFromData when title input is omitted', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          createMockQuery([{ id: 'doc-123', workspaceId: null, kind: 'service-agreement' }]),
        ) // loadAgreement
        .mockImplementationOnce(() => createMockQuery([{ id: 'ver-123', status: 'draft' }])) // requireDraftVersion
        .mockImplementationOnce(() => createMockQuery([])); // requireServiceEditable (none)

      dbMock.returning.mockResolvedValueOnce([
        {
          id: 'ver-123',
          version: 1,
          status: 'draft',
          data: { title: 'Terms' },
          createdAt: new Date('2026-07-28T12:00:00.000Z'),
          publishedAt: null,
          archivedAt: null,
        },
      ]);

      const result = await service.updateDraft(mockAdminActor, 'doc-123', 'ver-123', {
        data: { title: 'Terms' },
      });

      expect(result.data).toEqual({ title: 'Terms' });
    });

    it('Should allow admin to update draft of workspace-scoped agreement even if not a member', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          createMockQuery([{ id: 'doc-123', workspaceId: 'ws-123', kind: 'service-agreement' }]),
        ) // loadAgreement (workspace-scoped, workspaceId is not null)
        .mockImplementationOnce(() => createMockQuery([{ id: 'ver-123', status: 'draft' }])) // requireDraftVersion
        .mockImplementationOnce(() => createMockQuery([])); // requireServiceEditable (none)

      dbMock.returning.mockResolvedValueOnce([
        {
          id: 'ver-123',
          version: 1,
          status: 'draft',
          data: { title: 'Workspace Terms' },
          createdAt: new Date('2026-07-28T12:00:00.000Z'),
          publishedAt: null,
          archivedAt: null,
        },
      ]);

      const result = await service.updateDraft(mockAdminActor, 'doc-123', 'ver-123', {
        title: 'New Workspace Title',
        data: { title: 'Workspace Terms' },
      });

      expect(result.status).toBe('draft');
    });
  });

  describe('addVersion', () => {
    it('Should append a new version copying the latest data', async () => {
      dbMock.select.mockImplementationOnce(() =>
        createMockQuery([{ id: 'doc-123', workspaceId: null, kind: 'service-agreement' }]),
      ); // loadAgreement

      txMock.returning.mockResolvedValueOnce([
        {
          id: 'ver-124',
          version: 2,
          status: 'draft',
          data: { key: 'value' },
          createdAt: new Date('2026-07-28T12:00:00.000Z'),
          publishedAt: null,
          archivedAt: null,
        },
      ]);

      txMock.select.mockImplementationOnce(() =>
        createMockQuery([{ version: 1, data: { key: 'value' } }]),
      ); // select latest version

      const result = await service.addVersion(mockAdminActor, 'doc-123');

      expect(result).toEqual({
        id: 'ver-124',
        version: 2,
        status: 'draft',
        data: { key: 'value' },
        createdAt: '2026-07-28T12:00:00.000Z',
        publishedAt: null,
        archivedAt: null,
      });
    });

    it('Should append a new version using default fallbacks when latest version is undefined', async () => {
      dbMock.select.mockImplementationOnce(() =>
        createMockQuery([{ id: 'doc-123', workspaceId: null, kind: 'service-agreement' }]),
      ); // loadAgreement

      txMock.returning.mockResolvedValueOnce([
        {
          id: 'ver-124',
          version: 1, // falls back to 1
          status: 'draft',
          data: {}, // falls back to {}
          createdAt: new Date('2026-07-28T12:00:00.000Z'),
          publishedAt: null,
          archivedAt: null,
        },
      ]);

      txMock.select.mockImplementationOnce(() => createMockQuery([])); // select latest version returns empty

      const result = await service.addVersion(mockAdminActor, 'doc-123');

      expect(result.version).toBe(1);
      expect(result.data).toEqual({});
    });
  });

  describe('publish', () => {
    it('Should throw UnprocessableEntityException if validation fails against Zod schema', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          createMockQuery([{ id: 'doc-123', workspaceId: null, kind: 'service-agreement' }]),
        ) // loadAgreement
        .mockImplementationOnce(() =>
          createMockQuery([
            { id: 'ver-123', status: 'draft', data: {}, typeVersionId: 'type-ver-1' },
          ]),
        ); // requireDraftVersion

      await expect(service.publish(mockAdminActor, 'doc-123', 'ver-123')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('Should publish and archive previous version successfully', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          createMockQuery([{ id: 'doc-123', workspaceId: null, kind: 'service-agreement' }]),
        ) // loadAgreement
        .mockImplementationOnce(() =>
          createMockQuery([
            {
              id: 'ver-123',
              status: 'draft',
              data: { title: 'Terms' },
              typeVersionId: 'type-ver-1',
            },
          ]),
        ); // requireDraftVersion

      txMock.returning.mockResolvedValueOnce([
        {
          id: 'ver-123',
          version: 1,
          status: 'published',
          data: { title: 'Terms' },
          createdAt: new Date('2026-07-28T12:00:00.000Z'),
          publishedAt: new Date('2026-07-28T12:00:00.000Z'),
          archivedAt: null,
        },
      ]);

      const result = await service.publish(mockAdminActor, 'doc-123', 'ver-123');

      expect(result).toEqual({
        id: 'ver-123',
        version: 1,
        status: 'published',
        data: { title: 'Terms' },
        createdAt: '2026-07-28T12:00:00.000Z',
        publishedAt: '2026-07-28T12:00:00.000Z',
        archivedAt: null,
      });
    });

    it('Should throw Error if publish returning returns empty array', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          createMockQuery([{ id: 'doc-123', workspaceId: null, kind: 'service-agreement' }]),
        ) // loadAgreement
        .mockImplementationOnce(() =>
          createMockQuery([
            {
              id: 'ver-123',
              status: 'draft',
              data: { title: 'Terms' },
              typeVersionId: 'type-ver-1',
            },
          ]),
        ); // requireDraftVersion

      txMock.returning.mockResolvedValueOnce([]); // empty returning

      await expect(service.publish(mockAdminActor, 'doc-123', 'ver-123')).rejects.toThrow(
        new Error('document version mutation returned no row'),
      );
    });
  });

  describe('error boundaries', () => {
    it('Should throw NotFoundException if agreement is not found in loadAgreement', async () => {
      dbMock.select.mockImplementationOnce(() => createMockQuery([])); // loadAgreement returns empty

      await expect(service.get(mockUserActor, 'doc-123')).rejects.toThrow(NotFoundException);
    });

    it('Should throw NotFoundException if workspace agreement is read by non-member non-admin', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          createMockQuery([{ id: 'doc-123', workspaceId: 'ws-123', kind: 'service-agreement' }]),
        ) // loadAgreement
        .mockImplementationOnce(() => createMockQuery([])); // isMember check (false)

      await expect(service.get(mockUserActor, 'doc-123')).rejects.toThrow(NotFoundException);
    });

    it('Should throw ForbiddenException if non-admin tries to update global agreement draft', async () => {
      dbMock.select.mockImplementationOnce(() =>
        createMockQuery([{ id: 'doc-123', workspaceId: null, kind: 'service-agreement' }]),
      ); // loadAgreement

      await expect(
        service.updateDraft(mockUserActor, 'doc-123', 'ver-123', {
          title: 'New Title',
          data: {},
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Should throw NotFoundException if non-member non-admin tries to update workspace agreement draft', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          createMockQuery([{ id: 'doc-123', workspaceId: 'ws-123', kind: 'service-agreement' }]),
        ) // loadAgreement
        .mockImplementationOnce(() => createMockQuery([])); // isMember check (false)

      await expect(
        service.updateDraft(mockUserActor, 'doc-123', 'ver-123', {
          title: 'New Title',
          data: {},
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('Should throw Error if document version insert returned no row in create', async () => {
      dbMock.select.mockImplementationOnce(() => createMockQuery([{ role: 'member' }])); // isMember -> true
      txMock.returning.mockResolvedValueOnce([{ id: 'doc-123' }]).mockResolvedValueOnce([]); // empty version insert

      await expect(
        service.create(mockUserActor, {
          workspaceId: mockWorkspaceId,
          data: { title: 'Terms' },
        }),
      ).rejects.toThrow('document version insert returned no row');
    });

    it('Should throw NotFoundException if agreement version not found in requireDraftVersion', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          createMockQuery([{ id: 'doc-123', workspaceId: null, kind: 'service-agreement' }]),
        ) // loadAgreement
        .mockImplementationOnce(() => createMockQuery([])); // requireDraftVersion returns empty

      await expect(
        service.updateDraft(mockAdminActor, 'doc-123', 'ver-123', {
          title: 'New Title',
          data: {},
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('Should throw ConflictException if associated service is not in draft status in requireServiceEditable', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          createMockQuery([{ id: 'doc-123', workspaceId: null, kind: 'service-agreement' }]),
        ) // loadAgreement
        .mockImplementationOnce(() => createMockQuery([{ id: 'ver-123', status: 'draft' }])) // requireDraftVersion
        .mockImplementationOnce(() => createMockQuery([{ status: 'published' }])); // requireServiceEditable returns published owner

      await expect(
        service.updateDraft(mockAdminActor, 'doc-123', 'ver-123', {
          title: 'New Title',
          data: {},
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
