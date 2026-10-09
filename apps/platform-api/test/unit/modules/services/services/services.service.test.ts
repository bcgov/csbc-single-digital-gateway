import { readFileSync } from 'node:fs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ServicesService } from '../../../../../src/modules/services/services/services.service';
import { reactivateServiceTx } from '../../../../../src/modules/services/util/version-copy';
import { rebuildLinksTx } from '../../../../../src/modules/services/util/document-links';
import { documents, documentVersions } from '@repo/database';

vi.mock('../../../../../src/modules/services/util/version-copy', () => ({
  reactivateServiceTx: vi.fn(),
}));
vi.mock('../../../../../src/modules/services/util/document-links', () => ({
  rebuildLinksTx: vi.fn(),
}));

const mockQuery = (resolvedValue: any) => {
  const qb = Promise.resolve(resolvedValue);
  return Object.assign(qb, {
    from: vi.fn().mockReturnValue(qb),
    innerJoin: vi.fn().mockReturnValue(qb),
    leftJoin: vi.fn().mockReturnValue(qb),
    limit: vi.fn().mockReturnValue(qb),
    orderBy: vi.fn().mockReturnValue(qb),
    where: vi.fn().mockReturnValue(qb),
    offset: vi.fn().mockReturnValue(qb),
    groupBy: vi.fn().mockReturnValue(qb),
  });
};

describe('ServicesService', () => {
  let service: ServicesService;
  let dbMock: any;
  let txMock: any;
  let templatesMock: any;
  let lifecycleMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    txMock = Object.assign(Promise.resolve([]), {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      select: vi.fn().mockImplementation(() => mockQuery([])),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
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

    templatesMock = {
      forCreate: vi.fn().mockResolvedValue({
        templateId: 'template-1',
        templateVersionId: 'template-version-1',
        schema: { type: 'object', properties: {} },
        variants: { default: { type: 'Form', elements: [] } },
      }),
      contentForVersion: vi.fn(),
      // Feature 174: the READ path resolves templates per version, never via forCreate().
      contentsForVersions: vi.fn().mockResolvedValue({}),
    };

    lifecycleMock = {
      archiveMethodsTx: vi.fn(),
      reactivateMethodsTx: vi.fn(),
      deleteMethodsTx: vi.fn(),
    };
    service = new ServicesService(dbMock, templatesMock, lifecycleMock);
  });

  describe('create', () => {
    const input = { workspaceId: 'ws-1', title: 'New Service' };

    it('successfully creates service document and draft version in a transaction', async () => {
      // 1. requireMembership select
      dbMock.select.mockReturnValueOnce(mockQuery([{ role: 'member' }]));

      const mockDoc = {
        id: 'service-doc-1',
        workspaceId: 'ws-1',
        type: 'services.service',
        kind: 'document',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
        updatedAt: new Date('2026-07-12T00:00:00.000Z'),
      };
      const mockVersion = {
        id: 'service-version-1',
        documentId: 'service-doc-1',
        templateVersionId: 'template-version-1',
        versionNumber: 1,
        revision: 1,
        status: 'draft',
        title: 'New Service',
        description: null,
        content: { schema: {}, variants: { default: { type: 'Form', elements: [] } } },
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
        updatedAt: new Date('2026-07-12T00:00:00.000Z'),
        publishedAt: null,
        archivedAt: null,
      };

      txMock.returning
        .mockResolvedValueOnce([mockDoc]) // inserted doc
        .mockResolvedValueOnce([mockVersion]); // inserted version

      const result = await service.create('user-1', input);

      expect(dbMock.transaction).toHaveBeenCalledTimes(1);
      expect(txMock.insert).toHaveBeenNthCalledWith(1, documents);
      expect(txMock.insert).toHaveBeenNthCalledWith(2, documentVersions);
      // Doc 275: the template's schema and variants, the title on the DEFAULT variant's label.
      expect(txMock.values.mock.calls[1][0].content).toEqual({
        schema: { type: 'object', properties: {} },
        variants: { default: { type: 'Form', elements: [], label: 'New Service' } },
      });

      expect(result).toEqual({
        service: expect.objectContaining({ id: 'service-doc-1' }),
        versions: [expect.objectContaining({ id: 'service-version-1' })],
      });
    });

    it('stamps the title on EVERY variant the template brings', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([{ role: 'member' }]));
      templatesMock.forCreate.mockResolvedValueOnce({
        templateId: 'template-1',
        templateVersionId: 'template-version-1',
        schema: { type: 'object', properties: {} },
        variants: {
          default: { type: 'Form', elements: [], label: 'Template title' },
          Citizen: {
            type: 'Form',
            elements: [],
            label: 'Template title',
            options: { displayOnly: true },
          },
        },
      });
      const at = new Date('2026-07-12T00:00:00.000Z');
      txMock.returning
        .mockResolvedValueOnce([
          { id: 'service-doc-1', workspaceId: 'ws-1', createdAt: at, updatedAt: at },
        ])
        .mockResolvedValueOnce([
          {
            id: 'service-version-1',
            documentId: 'service-doc-1',
            templateVersionId: 'template-version-1',
            versionNumber: 1,
            revision: 1,
            status: 'draft',
            title: 'New Service',
            description: null,
            content: {},
            createdAt: at,
            updatedAt: at,
            publishedAt: null,
            archivedAt: null,
          },
        ]);

      await service.create('user-1', input);

      expect(txMock.values.mock.calls[1][0].content.variants).toEqual({
        default: { type: 'Form', elements: [], label: 'New Service' },
        Citizen: {
          type: 'Form',
          elements: [],
          label: 'New Service',
          options: { displayOnly: true },
        },
      });
    });

    it('throws NotFoundException if user has no workspace membership', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([]));

      await expect(service.create('user-1', input)).rejects.toThrow(NotFoundException);
    });

    it('throws Error if documents insert returned no row', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([{ role: 'member' }]));
      txMock.returning.mockResolvedValueOnce([]); // empty doc insert

      await expect(service.create('user-1', input)).rejects.toThrow(
        new Error('document insert returned no row'),
      );
    });

    it('throws Error if documentVersions insert returned no row', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([{ role: 'member' }]));
      txMock.returning.mockResolvedValueOnce([{ id: 'service-doc-1' }]).mockResolvedValueOnce([]); // empty version insert

      await expect(service.create('user-1', input)).rejects.toThrow(
        new Error('document version insert returned no row'),
      );
    });
  });

  describe('getServiceDefinition', () => {
    it('returns the schema definition of the resolved service type', async () => {
      templatesMock.forCreate.mockResolvedValue({
        schema: { type: 'object' },
        variants: { default: { type: 'Form' } },
      });

      const result = await service.getServiceDefinition('tpl-1');

      // Doc 228: the template the author chose.
      expect(templatesMock.forCreate).toHaveBeenCalledWith('services.service', 'tpl-1');
      expect(result).toEqual({
        schema: { type: 'object' },
        variants: { default: { type: 'Form' } },
      });
    });
  });

  describe('list', () => {
    it('returns summary of services in a workspace', async () => {
      dbMock.select = vi
        .fn()
        // 1. requireMembership select
        .mockReturnValueOnce(mockQuery([{ role: 'member' }]))
        // 2. docs select
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'service-1',
              workspaceId: 'ws-1',
              title: 'Service 1',
              description: 'desc',
              createdAt: new Date('2026-07-12T00:00:00.000Z'),
              updatedAt: new Date('2026-07-12T00:00:00.000Z'),
            },
          ]),
        )
        // 3. totals count select
        .mockReturnValueOnce(mockQuery([{ count: 1 }]))
        // 4. versionRows select
        .mockReturnValueOnce(
          mockQuery([
            {
              documentId: 'service-1',
              id: 'version-1',
              status: 'published',
              publishedAt: new Date(),
              version: 1,
            },
          ]),
        )
        // 5. submissionRows select
        .mockReturnValueOnce(mockQuery([]));

      templatesMock.forCreate.mockResolvedValue({ typeId: 'type-1' });

      const result = await service.list('user-1', { workspaceId: 'ws-1' } as any);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.status).toBe('published');
      expect(result.items[0]!.versionCount).toBe(1);
      expect(result.items[0]!.hasSubmissions).toBe(false);
    });

    it('returns status draft when service only has draft versions', async () => {
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ role: 'member' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'service-1',
              workspaceId: 'ws-1',
              title: 'Service 1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        )
        .mockReturnValueOnce(mockQuery([{ count: 1 }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              documentId: 'service-1',
              id: 'version-1',
              status: 'draft',
              publishedAt: null,
              version: 1,
            },
          ]),
        )
        .mockReturnValueOnce(mockQuery([]));

      templatesMock.forCreate.mockResolvedValue({ typeId: 'type-1' });

      const result = await service.list('user-1', { workspaceId: 'ws-1' } as any);
      expect(result.items[0]!.status).toBe('draft');
    });

    it('returns status archived when service only has archived versions', async () => {
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ role: 'member' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'service-1',
              workspaceId: 'ws-1',
              title: 'Service 1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        )
        .mockReturnValueOnce(mockQuery([{ count: 1 }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              documentId: 'service-1',
              id: 'version-1',
              status: 'archived',
              publishedAt: null,
              version: 1,
            },
          ]),
        )
        .mockReturnValueOnce(mockQuery([]));

      templatesMock.forCreate.mockResolvedValue({ typeId: 'type-1' });

      const result = await service.list('user-1', { workspaceId: 'ws-1' } as any);
      expect(result.items[0]!.status).toBe('archived');
    });

    it('returns status none when service has no versions', async () => {
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ role: 'member' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'service-1',
              workspaceId: 'ws-1',
              title: 'Service 1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        )
        .mockReturnValueOnce(mockQuery([{ count: 1 }]))
        .mockReturnValueOnce(mockQuery([])) // empty versions
        .mockReturnValueOnce(mockQuery([]));

      templatesMock.forCreate.mockResolvedValue({ typeId: 'type-1' });

      const result = await service.list('user-1', { workspaceId: 'ws-1' } as any);
      expect(result.items[0]!.status).toBe('none');
    });

    it('falls back to false for hasSubmissions if count query returns empty', async () => {
      dbMock.select = vi
        .fn()
        // 1. requireMembership select
        .mockReturnValueOnce(mockQuery([{ role: 'member' }]))
        // 2. docs select
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'service-1',
              workspaceId: 'ws-1',
              title: 'Service 1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        )
        // 3. totals count select
        .mockReturnValueOnce(mockQuery([{ count: 1 }]))
        // 4. versionRows select
        .mockReturnValueOnce(
          mockQuery([
            {
              documentId: 'service-1',
              id: 'version-1',
              status: 'published',
              publishedAt: new Date(),
              version: 1,
            },
          ]),
        )
        // 5. submissionRows select (empty result)
        .mockReturnValueOnce(mockQuery([]));

      templatesMock.forCreate.mockResolvedValue({ typeId: 'type-1' });

      const result = await service.list('user-1', { workspaceId: 'ws-1' } as any);

      expect(result.items[0]!.hasSubmissions).toBe(false);
    });
  });

  describe('get', () => {
    it('successfully retrieves detailed service information', async () => {
      const mockDoc = {
        id: 'service-1',
        workspaceId: 'ws-1',
        type: 'services.service',
        kind: 'document',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
        updatedAt: new Date('2026-07-12T00:00:00.000Z'),
      };
      dbMock.select = vi
        .fn()
        // 1. requireDocument select
        .mockReturnValueOnce(mockQuery([{ doc: mockDoc }]))
        // 2. versionsOf select
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'version-1',
              documentId: 'service-1',
              templateVersionId: 'template-version-1',
              versionNumber: 1,
              revision: 1,
              status: 'draft',
              title: 'Service Title',
              description: null,
              content: { schema: {}, variants: { default: { type: 'Form', elements: [] } } },
              createdAt: new Date('2026-07-12T00:00:00.000Z'),
              updatedAt: new Date('2026-07-12T00:00:00.000Z'),
              publishedAt: null,
              archivedAt: null,
            },
          ]),
        )
        // 3. hasSubmissions select
        .mockReturnValueOnce(mockQuery([{ n: 0 }]));

      templatesMock.contentsForVersions.mockResolvedValue({
        'template-version-1': { schema: { type: 'object' }, variants: { default: {} } },
      });

      const result = await service.get('user-1', 'service-1');

      expect(result.service.id).toBe('service-1');
      expect(result.versions).toHaveLength(1);
      expect(result.definition.schema).toEqual({ type: 'object' });
    });

    it('throws NotFoundException if the service document is not found', async () => {
      dbMock.select = vi.fn().mockReturnValueOnce(mockQuery([])); // empty requireDocument

      await expect(service.get('user-1', 'service-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes the service document when it has no submissions', async () => {
      // Feature 217: deleting the document cascades its versions. There are no referenced
      // application-method documents left to orphan and clean up.
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ doc: { id: 'service-1', workspaceId: 'ws-1' } }]))
        .mockReturnValueOnce(mockQuery([{ n: 0 }]));

      await service.remove('user-1', 'service-1');

      // Doc 290 rule 11: inside one transaction with the method cleanup.
      expect(txMock.delete).toHaveBeenCalledTimes(1);
      expect(txMock.delete).toHaveBeenCalledWith(documents);
    });

    it('throws ConflictException if the service has submissions', async () => {
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ doc: { id: 'service-1', workspaceId: 'ws-1' } }]))
        .mockReturnValueOnce(mockQuery([{ n: 5 }]));

      await expect(service.remove('user-1', 'service-1')).rejects.toThrow(ConflictException);
    });

    it('treats an empty count result as no submissions', async () => {
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ doc: { id: 'service-1', workspaceId: 'ws-1' } }]))
        .mockReturnValueOnce(mockQuery([]));

      await service.remove('user-1', 'service-1');

      // Doc 290 rule 11: the delete runs in the transaction.
      expect(txMock.delete).toHaveBeenCalledWith(documents);
    });
  });

  describe('archive', () => {
    it("archives the service's own non-archived versions", async () => {
      // Feature 217: it used to also archive the referenced application-form versions.
      dbMock.select = vi
        .fn()
        .mockReturnValueOnce(mockQuery([{ doc: { id: 'service-1', workspaceId: 'ws-1' } }]));

      await service.archive('user-1', 'service-1');

      expect(dbMock.select).toHaveBeenCalledTimes(1);
      // Doc 290 rule 9: inside one transaction with the method cascade.
      expect(txMock.update).toHaveBeenCalledWith(documentVersions);
    });
  });

  describe('reactivate', () => {
    it('reactivates a service via reactivateServiceTx', async () => {
      const mockDoc = { id: 'service-1' };
      dbMock.select.mockReturnValueOnce(mockQuery([{ doc: mockDoc }])); // requireDocument

      await service.reactivate('user-1', 'service-1');

      expect(vi.mocked(reactivateServiceTx)).toHaveBeenCalledWith(txMock, 'service-1');
    });
  });

  // Doc 290.
  describe('method lifecycle (doc 290)', () => {
    const SERVICE = { id: 'service-1', workspaceId: 'ws-1' };

    describe('create (rule 2)', () => {
      it('rebuilds the first version links in the create transaction', async () => {
        dbMock.select.mockReturnValueOnce(mockQuery([{ role: 'member' }]));
        const doc = { id: 'service-doc-1', workspaceId: 'ws-1', type: 'services.service' };
        const version = { id: 'service-version-1', documentId: 'service-doc-1', content: {} };
        txMock.returning.mockResolvedValueOnce([doc]).mockResolvedValueOnce([version]);

        await service
          .create('user-1', { workspaceId: 'ws-1', title: 'New' })
          .catch(() => undefined);

        expect(dbMock.transaction).toHaveBeenCalledTimes(1);
        expect(vi.mocked(rebuildLinksTx)).toHaveBeenCalledWith(txMock, version);
      });
    });

    describe('archive / reactivate (rules 9-10)', () => {
      it('archives the service and its methods in one transaction with one timestamp', async () => {
        dbMock.select.mockReturnValueOnce(mockQuery([{ doc: SERVICE }]));

        await service.archive('user-1', 'service-1');

        expect(dbMock.transaction).toHaveBeenCalledTimes(1);
        const at = txMock.set.mock.calls[0][0].archivedAt;
        expect(at).toBeInstanceOf(Date);
        expect(lifecycleMock.archiveMethodsTx).toHaveBeenCalledWith(txMock, SERVICE, at);
      });

      it('reactivates the methods archived with the service', async () => {
        dbMock.select.mockReturnValueOnce(mockQuery([{ doc: SERVICE }]));
        const archived = { id: 'v2', archivedAt: new Date('2026-10-08T00:00:00.000Z') };
        vi.mocked(reactivateServiceTx).mockResolvedValueOnce(archived as any);

        await service.reactivate('user-1', 'service-1');

        expect(lifecycleMock.reactivateMethodsTx).toHaveBeenCalledWith(txMock, SERVICE, archived);
      });
    });

    describe('remove (rule 11)', () => {
      it('deletes the methods only it uses in the delete transaction', async () => {
        dbMock.select = vi
          .fn()
          .mockReturnValueOnce(mockQuery([{ doc: SERVICE }]))
          .mockReturnValueOnce(mockQuery([{ n: 0 }]));

        await service.remove('user-1', 'service-1');

        expect(lifecycleMock.deleteMethodsTx).toHaveBeenCalledWith(txMock, SERVICE);
        expect(lifecycleMock.deleteMethodsTx.mock.invocationCallOrder[0]).toBeLessThan(
          txMock.delete.mock.invocationCallOrder[0],
        );
      });
    });
  });
});

/**
 * Feature 174. getServiceDetail() must resolve `definition` per the version being read
 * (contentsForVersions, keyed by document_versions.template_version_id), not via forCreate()
 * (currently-published). Without this, publishing a reshaped Service type version renders every
 * existing service's details page as empty em-dashes.
 */
const versionRow = (over: Record<string, unknown>) => ({
  id: 'version-1',
  documentId: 'service-1',
  templateVersionId: 'template-version-1',
  versionNumber: 1,
  revision: 1,
  status: 'draft',
  title: 'Service Title',
  description: null,
  content: { schema: {}, variants: { default: { type: 'Form', elements: [] } } },
  createdAt: new Date('2026-07-12T00:00:00.000Z'),
  updatedAt: new Date('2026-07-12T00:00:00.000Z'),
  publishedAt: null,
  archivedAt: null,
  ...over,
});

describe('ServicesService.get — per-version definition (feature 174)', () => {
  let service: ServicesService;
  let dbMock: any;
  let templatesMock: any;

  const doc = {
    id: 'service-1',
    workspaceId: 'ws-1',
    type: 'services.service',
    kind: 'document',
    createdAt: new Date('2026-07-12T00:00:00.000Z'),
    updatedAt: new Date('2026-07-12T00:00:00.000Z'),
  };

  const arrange = (versions: unknown[]) => {
    dbMock.select = vi
      .fn()
      .mockReturnValueOnce(mockQuery([{ doc }])) // requireDocument
      .mockReturnValueOnce(mockQuery(versions)) // versionsOf (ascending)
      .mockReturnValueOnce(mockQuery([{ n: 0 }])); // hasSubmissions
  };

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = Object.assign(Promise.resolve([]), {
      select: vi.fn().mockImplementation(() => mockQuery([])),
    });
    templatesMock = {
      forCreate: vi.fn(),
      contentForVersion: vi.fn(),
      contentsForVersions: vi.fn().mockResolvedValue({}),
    };
    service = new ServicesService(dbMock, templatesMock, {} as any);
  });

  it('should resolve the definition from the selected version type_version_id', async () => {
    arrange([versionRow({ templateVersionId: 'tv-new', publishedAt: new Date() })]);
    templatesMock.contentsForVersions.mockResolvedValue({
      'tv-new': { schema: { marker: 'new' }, variants: { default: {} } },
    });

    const result = await service.get('user-1', 'service-1');

    expect(templatesMock.contentsForVersions).toHaveBeenCalledWith(['tv-new']);
    expect(result.definition.schema).toEqual({ marker: 'new' });
    expect(result.definitions['tv-new']).toEqual({
      schema: { marker: 'new' },
      variants: { default: {} },
    });
  });

  it('should return the OLD template for a version pinned to an older type version', async () => {
    // v1 (published) is pinned to the OLD type version; v2 (draft) to the new one. The service is
    // rendered from its published version, so it must get the OLD template — this is exactly the
    // case that rendered as all em-dashes before the fix.
    arrange([
      versionRow({
        id: 'v1',
        versionNumber: 1,
        templateVersionId: 'tv-old',
        publishedAt: new Date(),
      }),
      versionRow({ id: 'v2', versionNumber: 2, templateVersionId: 'tv-new' }),
    ]);
    templatesMock.contentsForVersions.mockResolvedValue({
      'tv-old': { schema: { marker: 'old' }, variants: { default: {} } },
      'tv-new': { schema: { marker: 'new' }, variants: { default: {} } },
    });

    const result = await service.get('user-1', 'service-1');

    expect(templatesMock.contentsForVersions).toHaveBeenCalledWith(['tv-old', 'tv-new']);
    expect(result.definition.schema).toEqual({ marker: 'old' });
    // Both templates are available so the version picker can render either faithfully.
    expect(result.definitions['tv-old']?.schema).toEqual({ marker: 'old' });
    expect(result.definitions['tv-new']?.schema).toEqual({ marker: 'new' });
  });

  it('should not call forCreate() (currently-published) on the read path', async () => {
    arrange([versionRow({})]);
    templatesMock.contentsForVersions.mockResolvedValue({
      'type-version-1': { schema: {}, variants: { default: {} } },
    });

    await service.get('user-1', 'service-1');

    expect(templatesMock.forCreate).not.toHaveBeenCalled();
  });

  it('should fall back to the newest version when none is published', async () => {
    arrange([
      versionRow({ id: 'v1', versionNumber: 1, templateVersionId: 'tv-old' }),
      versionRow({ id: 'v2', versionNumber: 2, templateVersionId: 'tv-new' }),
    ]);
    templatesMock.contentsForVersions.mockResolvedValue({
      'tv-old': { schema: { marker: 'old' }, variants: { default: {} } },
      'tv-new': { schema: { marker: 'new' }, variants: { default: {} } },
    });

    const result = await service.get('user-1', 'service-1');

    expect(result.definition.schema).toEqual({ marker: 'new' });
  });

  it('should return an empty definition for a service with no versions', async () => {
    arrange([]);

    const result = await service.get('user-1', 'service-1');

    expect(result.definition).toEqual({ schema: {}, variants: { default: {} } });
    expect(result.definitions).toEqual({});
  });

  it('should return an empty definition when the pinned type version is missing', async () => {
    arrange([versionRow({ templateVersionId: 'tv-gone', publishedAt: new Date() })]);
    templatesMock.contentsForVersions.mockResolvedValue({});

    const result = await service.get('user-1', 'service-1');

    expect(result.definition).toEqual({ schema: {}, variants: { default: {} } });
  });

  it('should still use forCreate() on the create path (a new service binds to a published template)', () => {
    // Guard against an over-eager fix: CREATE must keep binding to the currently-published
    // template version, or new services would be authored against a stale template.
    const source = readFileSync(
      new URL('../../../../../src/modules/services/services/services.service.ts', import.meta.url),
      'utf8',
    );
    const createBody = source.slice(source.indexOf('async create('), source.indexOf('async get('));
    expect(createBody).toContain(
      'this.templates.forCreate(DOCUMENT_TYPE.service, input.templateId)',
    );
  });
});
