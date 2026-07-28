import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ServiceAgreementsService } from '../../../../../src/modules/service-agreements/services/service-agreements.service';

const mockQuery = (resolvedValue: any) => {
  const qb = Promise.resolve(resolvedValue);
  return Object.assign(qb, {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  });
};

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
    it('throws ForbiddenException if non-admin attempts to create a global service agreement', async () => {
      await expect(service.create(mockUserActor, { data: { title: 'Terms' } })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException if user is not a member of the target workspace', async () => {
      dbMock.select.mockImplementationOnce(() => mockQuery([])); // isMember -> false

      await expect(
        service.create(mockUserActor, {
          workspaceId: mockWorkspaceId,
          data: { title: 'Terms' },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates workspace-scoped service agreement successfully', async () => {
      dbMock.select.mockImplementationOnce(() => mockQuery([{ role: 'member' }])); // isMember -> true
      const mockDoc = {
        id: 'doc-123',
        workspaceId: mockWorkspaceId,
        kind: 'service-agreement',
        title: 'Terms',
        createdAt: new Date('2026-07-28T12:00:00.000Z'),
      };
      const mockVer = {
        id: 'ver-123',
        version: 1,
        status: 'draft',
        data: { title: 'Terms' },
        createdAt: new Date('2026-07-28T12:00:00.000Z'),
        publishedAt: null,
        archivedAt: null,
      };

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

    it('creates global service agreement successfully by admin', async () => {
      const mockDoc = {
        id: 'doc-global',
        workspaceId: null,
        kind: 'service-agreement',
        title: 'Global Terms',
        createdAt: new Date('2026-07-28T12:00:00.000Z'),
      };
      const mockVer = {
        id: 'ver-global',
        version: 1,
        status: 'draft',
        data: { title: 'Global Terms' },
        createdAt: new Date('2026-07-28T12:00:00.000Z'),
        publishedAt: null,
        archivedAt: null,
      };

      txMock.returning.mockResolvedValueOnce([mockDoc]).mockResolvedValueOnce([mockVer]);

      const result = await service.create(mockAdminActor, {
        data: { title: 'Global Terms' },
      });

      expect(result.agreement.workspaceId).toBeNull();
      expect(result.agreement.title).toBe('Global Terms');
    });

    it('throws Error if document insert returned no row', async () => {
      txMock.returning.mockResolvedValueOnce([]); // empty document insert returning

      await expect(
        service.create(mockAdminActor, {
          data: { title: 'Global Terms' },
        }),
      ).rejects.toThrow('document insert returned no row');
    });

    it('creates workspace-scoped service agreement with untitled fallback title if title is missing or empty', async () => {
      dbMock.select.mockImplementationOnce(() => mockQuery([{ role: 'member' }])); // isMember -> true
      const mockDoc = {
        id: 'doc-123',
        workspaceId: mockWorkspaceId,
        kind: 'service-agreement',
        title: 'Untitled service agreement',
        createdAt: new Date('2026-07-28T12:00:00.000Z'),
      };
      const mockVer = {
        id: 'ver-123',
        version: 1,
        status: 'draft',
        data: {},
        createdAt: new Date('2026-07-28T12:00:00.000Z'),
        publishedAt: null,
        archivedAt: null,
      };

      txMock.returning.mockResolvedValueOnce([mockDoc]).mockResolvedValueOnce([mockVer]);

      const result = await service.create(mockUserActor, {
        workspaceId: mockWorkspaceId,
        data: {},
      });

      expect(result.agreement.title).toBe('Untitled service agreement');
    });
  });

  describe('list', () => {
    it('throws ForbiddenException if non-admin tries to list global service agreements', async () => {
      await expect(service.list(mockUserActor, {})).rejects.toThrow(ForbiddenException);
    });

    it('lists agreements successfully', async () => {
      dbMock.select
        .mockImplementationOnce(() => mockQuery([{ role: 'member' }])) // isMember -> true
        .mockImplementationOnce(() =>
          mockQuery([
            {
              id: 'doc-123',
              workspaceId: mockWorkspaceId,
              title: 'Terms',
              kind: 'service-agreement',
              createdAt: new Date('2026-07-28T12:00:00.000Z'),
            },
          ]),
        ) // select docs
        .mockImplementationOnce(() => mockQuery([{ status: 'published' }])); // versionsOf

      const result = await service.list(mockUserActor, { workspaceId: mockWorkspaceId });

      expect(result).toEqual([
        {
          id: 'doc-123',
          workspaceId: mockWorkspaceId,
          title: 'Terms',
          kind: 'service-agreement',
          createdAt: '2026-07-28T12:00:00.000Z',
          status: 'published',
          isGlobal: false,
        },
      ]);
    });

    it('lists global agreements successfully by admin with various version statuses (draft, archived, none)', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          mockQuery([
            {
              id: 'doc-draft',
              workspaceId: null,
              title: 'Draft Global',
              kind: 'service-agreement',
              createdAt: new Date('2026-07-28T12:00:00.000Z'),
            },
            {
              id: 'doc-archived',
              workspaceId: null,
              title: 'Archived Global',
              kind: 'service-agreement',
              createdAt: new Date('2026-07-28T12:00:00.000Z'),
            },
            {
              id: 'doc-none',
              workspaceId: null,
              title: 'None Global',
              kind: 'service-agreement',
              createdAt: new Date('2026-07-28T12:00:00.000Z'),
            },
          ]),
        ) // select docs
        .mockImplementationOnce(() => mockQuery([{ status: 'draft' }])) // versionsOf doc-draft
        .mockImplementationOnce(() => mockQuery([{ status: 'archived' }])) // versionsOf doc-archived
        .mockImplementationOnce(() => mockQuery([])); // versionsOf doc-none (empty)

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

  describe('get', () => {
    it('throws NotFoundException if user has no access to workspace service agreement', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          mockQuery([
            {
              id: 'doc-123',
              workspaceId: mockWorkspaceId,
              kind: 'service-agreement',
            },
          ]),
        ) // loadAgreement
        .mockImplementationOnce(() => mockQuery([])); // isMember -> false

      await expect(service.get(mockUserActor, 'doc-123')).rejects.toThrow(NotFoundException);
    });

    it('retrieves details successfully', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          mockQuery([
            {
              id: 'doc-123',
              workspaceId: null, // global
              kind: 'service-agreement',
              title: 'Global Terms',
              createdAt: new Date('2026-07-28T12:00:00.000Z'),
            },
          ]),
        ) // loadAgreement
        .mockImplementationOnce(() =>
          mockQuery([
            {
              id: 'ver-123',
              version: 1,
              status: 'published',
              data: {},
              createdAt: new Date('2026-07-28T12:00:00.000Z'),
              publishedAt: new Date('2026-07-28T12:00:00.000Z'),
              archivedAt: null,
            },
          ]),
        ); // versionsOf

      dbMock.selectDistinct.mockImplementationOnce(() => mockQuery([])); // associatedServices

      const result = await service.get(mockUserActor, 'doc-123');

      expect(result).toEqual({
        agreement: {
          id: 'doc-123',
          workspaceId: null,
          title: 'Global Terms',
          kind: 'service-agreement',
          createdAt: '2026-07-28T12:00:00.000Z',
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

    it('retrieves details successfully by admin', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          mockQuery([
            {
              id: 'doc-123',
              workspaceId: 'ws-123', // workspace scoped
              kind: 'service-agreement',
              title: 'Global Terms',
              createdAt: new Date('2026-07-28T12:00:00.000Z'),
            },
          ]),
        ) // loadAgreement
        .mockImplementationOnce(() =>
          mockQuery([
            {
              id: 'ver-123',
              version: 1,
              status: 'published',
              data: {},
              createdAt: new Date('2026-07-28T12:00:00.000Z'),
              publishedAt: new Date('2026-07-28T12:00:00.000Z'),
            },
          ]),
        ); // versionsOf

      dbMock.selectDistinct.mockImplementationOnce(() =>
        mockQuery([{ id: 'svc-1', title: 'Service 1', workspaceSlug: 'slug-1' }]),
      ); // associatedServices (will cover isAdmin check)

      const result = await service.get(mockAdminActor, 'doc-123');

      expect(result.services).toHaveLength(1);
    });
  });

  describe('updateDraft', () => {
    it('throws ConflictException if agreement status is not draft', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          mockQuery([{ id: 'doc-123', workspaceId: null, kind: 'service-agreement' }]),
        ) // loadAgreement
        .mockImplementationOnce(() => mockQuery([{ id: 'ver-123', status: 'published' }])); // requireDraftVersion (not draft)

      await expect(
        service.updateDraft(mockAdminActor, 'doc-123', 'ver-123', {
          title: 'New Title',
          data: {},
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('updates draft version data successfully', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          mockQuery([{ id: 'doc-123', workspaceId: null, kind: 'service-agreement' }]),
        ) // loadAgreement
        .mockImplementationOnce(() => mockQuery([{ id: 'ver-123', status: 'draft' }])) // requireDraftVersion
        .mockImplementationOnce(() => mockQuery([])); // requireServiceEditable (none)

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

    it('updates draft title falling back to titleFromData when title input is omitted', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          mockQuery([{ id: 'doc-123', workspaceId: null, kind: 'service-agreement' }]),
        ) // loadAgreement
        .mockImplementationOnce(() => mockQuery([{ id: 'ver-123', status: 'draft' }])) // requireDraftVersion
        .mockImplementationOnce(() => mockQuery([])); // requireServiceEditable (none)

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

    it('allows admin to update draft of workspace-scoped agreement even if not a member', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          mockQuery([{ id: 'doc-123', workspaceId: 'ws-123', kind: 'service-agreement' }]),
        ) // loadAgreement (workspace-scoped, workspaceId is not null)
        .mockImplementationOnce(() => mockQuery([{ id: 'ver-123', status: 'draft' }])) // requireDraftVersion
        .mockImplementationOnce(() => mockQuery([])); // requireServiceEditable (none)

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
    it('appends a new version copying the latest data', async () => {
      dbMock.select.mockImplementationOnce(() =>
        mockQuery([{ id: 'doc-123', workspaceId: null, kind: 'service-agreement' }]),
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
        mockQuery([{ version: 1, data: { key: 'value' } }]),
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

    it('appends a new version using default fallbacks when latest version is undefined', async () => {
      dbMock.select.mockImplementationOnce(() =>
        mockQuery([{ id: 'doc-123', workspaceId: null, kind: 'service-agreement' }]),
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

      txMock.select.mockImplementationOnce(() => mockQuery([])); // select latest version returns empty

      const result = await service.addVersion(mockAdminActor, 'doc-123');

      expect(result.version).toBe(1);
      expect(result.data).toEqual({});
    });
  });

  describe('publish', () => {
    it('throws UnprocessableEntityException if validation fails against Zod schema', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          mockQuery([{ id: 'doc-123', workspaceId: null, kind: 'service-agreement' }]),
        ) // loadAgreement
        .mockImplementationOnce(() =>
          mockQuery([{ id: 'ver-123', status: 'draft', data: {}, typeVersionId: 'type-ver-1' }]),
        ); // requireDraftVersion

      await expect(service.publish(mockAdminActor, 'doc-123', 'ver-123')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('publishes and archives previous version successfully', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          mockQuery([{ id: 'doc-123', workspaceId: null, kind: 'service-agreement' }]),
        ) // loadAgreement
        .mockImplementationOnce(() =>
          mockQuery([
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

    it('throws Error if publish returning returns empty array', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          mockQuery([{ id: 'doc-123', workspaceId: null, kind: 'service-agreement' }]),
        ) // loadAgreement
        .mockImplementationOnce(() =>
          mockQuery([
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
    it('throws NotFoundException if agreement is not found in loadAgreement', async () => {
      dbMock.select.mockImplementationOnce(() => mockQuery([])); // loadAgreement returns empty

      await expect(service.get(mockUserActor, 'doc-123')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if workspace agreement is read by non-member non-admin', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          mockQuery([{ id: 'doc-123', workspaceId: 'ws-123', kind: 'service-agreement' }]),
        ) // loadAgreement
        .mockImplementationOnce(() => mockQuery([])); // isMember check (false)

      await expect(service.get(mockUserActor, 'doc-123')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if non-admin tries to update global agreement draft', async () => {
      dbMock.select.mockImplementationOnce(() =>
        mockQuery([{ id: 'doc-123', workspaceId: null, kind: 'service-agreement' }]),
      ); // loadAgreement

      await expect(
        service.updateDraft(mockUserActor, 'doc-123', 'ver-123', {
          title: 'New Title',
          data: {},
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if non-member non-admin tries to update workspace agreement draft', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          mockQuery([{ id: 'doc-123', workspaceId: 'ws-123', kind: 'service-agreement' }]),
        ) // loadAgreement
        .mockImplementationOnce(() => mockQuery([])); // isMember check (false)

      await expect(
        service.updateDraft(mockUserActor, 'doc-123', 'ver-123', {
          title: 'New Title',
          data: {},
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws Error if document version insert returned no row in create', async () => {
      dbMock.select.mockImplementationOnce(() => mockQuery([{ role: 'member' }])); // isMember -> true
      txMock.returning.mockResolvedValueOnce([{ id: 'doc-123' }]).mockResolvedValueOnce([]); // empty version insert

      await expect(
        service.create(mockUserActor, {
          workspaceId: mockWorkspaceId,
          data: { title: 'Terms' },
        }),
      ).rejects.toThrow('document version insert returned no row');
    });

    it('throws NotFoundException if agreement version not found in requireDraftVersion', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          mockQuery([{ id: 'doc-123', workspaceId: null, kind: 'service-agreement' }]),
        ) // loadAgreement
        .mockImplementationOnce(() => mockQuery([])); // requireDraftVersion returns empty

      await expect(
        service.updateDraft(mockAdminActor, 'doc-123', 'ver-123', {
          title: 'New Title',
          data: {},
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if associated service is not in draft status in requireServiceEditable', async () => {
      dbMock.select
        .mockImplementationOnce(() =>
          mockQuery([{ id: 'doc-123', workspaceId: null, kind: 'service-agreement' }]),
        ) // loadAgreement
        .mockImplementationOnce(() => mockQuery([{ id: 'ver-123', status: 'draft' }])) // requireDraftVersion
        .mockImplementationOnce(() => mockQuery([{ status: 'published' }])); // requireServiceEditable returns published owner

      await expect(
        service.updateDraft(mockAdminActor, 'doc-123', 'ver-123', {
          title: 'New Title',
          data: {},
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
