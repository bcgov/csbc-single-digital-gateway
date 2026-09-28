import { readFileSync } from 'node:fs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ServicesService } from '../../../../../src/modules/services/services/services.service';
import { reactivateServiceTx } from '../../../../../src/modules/services/util/version-copy';
import { documents, documentVersions } from '@repo/database';

vi.mock('../../../../../src/modules/services/util/version-copy', () => ({
  reactivateServiceTx: vi.fn(),
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

  beforeEach(() => {
    vi.clearAllMocks();

    txMock = Object.assign(Promise.resolve([]), {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      select: vi.fn().mockImplementation(() => mockQuery([])),
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
      resolve: vi.fn().mockResolvedValue({
        templateId: 'template-1',
        templateVersionId: 'template-version-1',
        schema: { type: 'object', properties: {} },
        uischema: { type: 'Service', elements: [] },
      }),
      contentForVersion: vi.fn(),
      // Feature 174: the READ path resolves templates per version, never via resolve().
      contentsForVersions: vi.fn().mockResolvedValue({}),
    };

    service = new ServicesService(dbMock, templatesMock);
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
        content: { schema: {}, uischema: { type: 'Service', elements: [] } },
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

      expect(result).toEqual({
        service: expect.objectContaining({ id: 'service-doc-1' }),
        versions: [expect.objectContaining({ id: 'service-version-1' })],
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
      templatesMock.resolve.mockResolvedValue({
        schema: { type: 'object' },
        uischema: { type: 'Service' },
      });

      const result = await service.getServiceDefinition();

      expect(templatesMock.resolve).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        schema: { type: 'object' },
        uischema: { type: 'Service' },
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

      templatesMock.resolve.mockResolvedValue({ typeId: 'type-1' });

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

      templatesMock.resolve.mockResolvedValue({ typeId: 'type-1' });

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

      templatesMock.resolve.mockResolvedValue({ typeId: 'type-1' });

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

      templatesMock.resolve.mockResolvedValue({ typeId: 'type-1' });

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

      templatesMock.resolve.mockResolvedValue({ typeId: 'type-1' });

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
              content: { schema: {}, uischema: { type: 'Service', elements: [] } },
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
        'template-version-1': { schema: { type: 'object' }, uischema: {} },
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

      expect(dbMock.delete).toHaveBeenCalledTimes(1);
      expect(dbMock.delete).toHaveBeenCalledWith(documents);
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

      expect(dbMock.delete).toHaveBeenCalledWith(documents);
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
      expect(dbMock.update).toHaveBeenCalledWith(documentVersions);
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
});

/**
 * Feature 174. getServiceDetail() must resolve `definition` per the version being read
 * (contentsForVersions, keyed by document_versions.template_version_id), not via resolve()
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
  content: { schema: {}, uischema: { type: 'Service', elements: [] } },
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
      resolve: vi.fn(),
      contentForVersion: vi.fn(),
      contentsForVersions: vi.fn().mockResolvedValue({}),
    };
    service = new ServicesService(dbMock, templatesMock);
  });

  it('should resolve the definition from the selected version type_version_id', async () => {
    arrange([versionRow({ templateVersionId: 'tv-new', publishedAt: new Date() })]);
    templatesMock.contentsForVersions.mockResolvedValue({
      'tv-new': { schema: { marker: 'new' }, uischema: {} },
    });

    const result = await service.get('user-1', 'service-1');

    expect(templatesMock.contentsForVersions).toHaveBeenCalledWith(['tv-new']);
    expect(result.definition.schema).toEqual({ marker: 'new' });
    expect(result.definitions['tv-new']).toEqual({ schema: { marker: 'new' }, uischema: {} });
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
      'tv-old': { schema: { marker: 'old' }, uischema: {} },
      'tv-new': { schema: { marker: 'new' }, uischema: {} },
    });

    const result = await service.get('user-1', 'service-1');

    expect(templatesMock.contentsForVersions).toHaveBeenCalledWith(['tv-old', 'tv-new']);
    expect(result.definition.schema).toEqual({ marker: 'old' });
    // Both templates are available so the version picker can render either faithfully.
    expect(result.definitions['tv-old']?.schema).toEqual({ marker: 'old' });
    expect(result.definitions['tv-new']?.schema).toEqual({ marker: 'new' });
  });

  it('should not call resolve() (currently-published) on the read path', async () => {
    arrange([versionRow({})]);
    templatesMock.contentsForVersions.mockResolvedValue({
      'type-version-1': { schema: {}, uischema: {} },
    });

    await service.get('user-1', 'service-1');

    expect(templatesMock.resolve).not.toHaveBeenCalled();
  });

  it('should fall back to the newest version when none is published', async () => {
    arrange([
      versionRow({ id: 'v1', versionNumber: 1, templateVersionId: 'tv-old' }),
      versionRow({ id: 'v2', versionNumber: 2, templateVersionId: 'tv-new' }),
    ]);
    templatesMock.contentsForVersions.mockResolvedValue({
      'tv-old': { schema: { marker: 'old' }, uischema: {} },
      'tv-new': { schema: { marker: 'new' }, uischema: {} },
    });

    const result = await service.get('user-1', 'service-1');

    expect(result.definition.schema).toEqual({ marker: 'new' });
  });

  it('should return an empty definition for a service with no versions', async () => {
    arrange([]);

    const result = await service.get('user-1', 'service-1');

    expect(result.definition).toEqual({ schema: {}, uischema: {} });
    expect(result.definitions).toEqual({});
  });

  it('should return an empty definition when the pinned type version is missing', async () => {
    arrange([versionRow({ templateVersionId: 'tv-gone', publishedAt: new Date() })]);
    templatesMock.contentsForVersions.mockResolvedValue({});

    const result = await service.get('user-1', 'service-1');

    expect(result.definition).toEqual({ schema: {}, uischema: {} });
  });

  it('should still use resolve() on the create path (a new service binds to the published template)', () => {
    // Guard against an over-eager fix: CREATE must keep binding to the currently-published
    // template version, or new services would be authored against a stale template.
    const source = readFileSync(
      new URL('../../../../../src/modules/services/services/services.service.ts', import.meta.url),
      'utf8',
    );
    const createBody = source.slice(source.indexOf('async create('), source.indexOf('async get('));
    expect(createBody).toContain('this.templates.resolve(DOCUMENT_TYPE.service)');
  });
});
