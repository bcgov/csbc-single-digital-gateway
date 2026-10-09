import { NotFoundException } from '@nestjs/common';
import { documentVersions } from '@repo/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceMethodsService } from '../../../../../src/modules/services/services/service-methods.service';
import { linkUsers } from '../../../../../src/modules/services/util/document-links';

// Doc 290: who else uses a method comes from `document_links` — stubbed, nobody else unless a case says so.
vi.mock('../../../../../src/modules/services/util/document-links', () => ({
  linkUsers: vi.fn(async () => new Map()),
}));

const mockQuery = (resolvedValue: unknown) => {
  const qb = Promise.resolve(resolvedValue);
  return Object.assign(qb, {
    from: vi.fn().mockReturnValue(qb),
    limit: vi.fn().mockReturnValue(qb),
    orderBy: vi.fn().mockReturnValue(qb),
    where: vi.fn().mockReturnValue(qb),
  });
};

const M1 = '11111111-1111-4111-8111-111111111111';
const M2 = '22222222-2222-4222-8222-222222222222';
const SERVICE_DOC = {
  id: 'service-1',
  workspaceId: 'ws-1',
  type: 'services.service',
  kind: 'document',
  templateId: 'st',
  templateKind: 'template',
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
  updatedAt: new Date('2026-10-01T00:00:00.000Z'),
};
const methodDoc = (id: string) => ({
  ...SERVICE_DOC,
  id,
  type: 'services.service-application-method',
  templateId: `t-${id}`,
});
const at = (iso: string) => new Date(iso);
const field = { type: 'Control', scope: '#/properties/name' };
const methodContent = (label: string) => ({
  schema: { type: 'object', properties: { name: { type: 'string' } } },
  variants: { default: { type: 'Form', label, elements: [field] } },
});
const methodVersion = (documentId: string, n: number, over: Record<string, unknown> = {}) => ({
  id: `${documentId.slice(0, 2)}-v${String(n)}`,
  documentId,
  templateId: `t-${documentId}`,
  templateVersionId: null,
  versionNumber: n,
  revision: 1,
  status: 'draft',
  title: 'Apply online',
  description: null,
  content: methodContent('Apply online'),
  createdAt: at('2026-10-01T00:00:00.000Z'),
  publishedAt: null,
  archivedAt: null,
  ...over,
});
/** A service version whose default variant references `ids` as application methods. */
const serviceVersion = (ids: string[], over: Record<string, unknown> = {}) => ({
  id: 'sv-1',
  documentId: 'service-1',
  templateVersionId: null,
  versionNumber: 1,
  revision: 1,
  status: 'draft',
  title: 'Permit',
  description: null,
  content: {
    schema: { type: 'object', properties: {} },
    variants: {
      default: {
        type: 'Form',
        elements: [
          {
            type: 'Control',
            scope: '#/properties/methods',
            options: {
              component: 'document-reference',
              documentType: 'services.service-application-method',
            },
          },
        ],
      },
    },
    data: { methods: ids.map((id) => ({ id })) },
  },
  createdAt: at('2026-10-01T00:00:00.000Z'),
  publishedAt: null,
  archivedAt: null,
  ...over,
});

// Doc 289: application methods of a service version — precheck, version choice, publish/draft/discard in a tx.
describe('ServiceMethodsService (doc 289)', () => {
  let service: ServiceMethodsService;
  let db: any;
  let tx: any;
  let templates: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const executor = () => ({
      select: vi.fn().mockImplementation(() => mockQuery([])),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockReturnThis(),
    });
    db = executor();
    tx = executor();
    templates = {
      forDocument: vi.fn().mockResolvedValue({ templateId: 'tmpl', templateVersionId: 'tmpl-v9' }),
      contentForVersion: vi.fn().mockResolvedValue({
        schema: {},
        variants: { default: { type: 'Form', label: 'Online template', elements: [] } },
      }),
    };
    service = new ServiceMethodsService(
      db,
      { requireDocument: vi.fn().mockResolvedValue(SERVICE_DOC) } as any,
      templates,
    );
  });

  /** The two reads `methods()` makes: the documents, then their versions. */
  const found = (executor: any, docs: unknown[], versions: unknown[]) =>
    executor.select.mockReturnValueOnce(mockQuery(docs)).mockReturnValueOnce(mockQuery(versions));

  describe('check', () => {
    it('reports hasMethods false and ok false when the version references no methods (rule 2)', async () => {
      const check = await service.check(db, SERVICE_DOC as any, serviceVersion([]) as any);
      expect(check).toEqual({ ok: false, hasMethods: false, methods: [] });
      expect(db.select).not.toHaveBeenCalled();
    });

    it('reports Not found for an id that is not an application method in the workspace (rule 3)', async () => {
      found(db, [methodDoc(M1)], [methodVersion(M1, 1)]);
      const check = await service.check(
        db,
        SERVICE_DOC as any,
        serviceVersion([M1, M2, 'not-a-uuid']) as any,
      );
      expect(check.ok).toBe(false);
      expect(check.hasMethods).toBe(true);
      expect(check.methods).toEqual([
        { id: M1, title: 'Apply online', status: 'draft', problems: [] },
        { id: M2, title: null, status: null, problems: ['Not found'] },
        { id: 'not-a-uuid', title: null, status: null, problems: ['Not found'] },
      ]);
    });

    it('reports ok true when every referenced method is valid (rule 6)', async () => {
      found(db, [methodDoc(M1), methodDoc(M2)], [methodVersion(M1, 1), methodVersion(M2, 1)]);
      const check = await service.check(db, SERVICE_DOC as any, serviceVersion([M1, M2]) as any);
      expect(check.ok).toBe(true);
      expect(check.methods.map((method) => method.problems)).toEqual([[], []]);
    });
  });

  describe('versionFor (rule 15)', () => {
    const versions = [
      methodVersion(M1, 1, {
        status: 'archived',
        title: 'v1',
        publishedAt: at('2026-10-02T00:00:00.000Z'),
        archivedAt: at('2026-10-05T00:00:00.000Z'),
      }),
      methodVersion(M1, 2, {
        status: 'published',
        title: 'v2',
        publishedAt: at('2026-10-05T00:00:00.000Z'),
      }),
      methodVersion(M1, 3, { status: 'draft', title: 'v3' }),
    ];
    const titleUnder = async (over: Record<string, unknown>) => {
      found(db, [methodDoc(M1)], versions);
      const check = await service.check(db, SERVICE_DOC as any, serviceVersion([M1], over) as any);
      return check.methods[0]?.title;
    };

    it('uses the latest method version for a draft service version', async () => {
      await expect(titleUnder({ status: 'draft' })).resolves.toBe('v3');
    });

    it('uses the published method version for a published service version', async () => {
      await expect(titleUnder({ status: 'published' })).resolves.toBe('v2');
    });

    it('uses the method version published at or before an archived service version was archived', async () => {
      await expect(
        titleUnder({ status: 'archived', archivedAt: at('2026-10-04T00:00:00.000Z') }),
      ).resolves.toBe('v1');
    });
  });

  describe('publishMethodsTx (rule 8)', () => {
    it('archives the published method version then publishes the draft, skipping already-published methods', async () => {
      found(
        tx,
        [methodDoc(M1), methodDoc(M2)],
        [
          methodVersion(M1, 1, { status: 'published' }),
          methodVersion(M1, 2, { status: 'draft' }),
          methodVersion(M2, 1, { status: 'published' }),
        ],
      );
      await service.publishMethodsTx(tx, SERVICE_DOC as any, serviceVersion([M1, M2]).content);

      expect(tx.update).toHaveBeenCalledTimes(2);
      expect(tx.update).toHaveBeenNthCalledWith(1, documentVersions);
      expect(tx.set.mock.calls[0][0]).toHaveProperty('archivedAt');
      expect(tx.set.mock.calls[1][0]).toHaveProperty('publishedAt');
      expect(tx.set.mock.calls[0][0]).not.toHaveProperty('publishedAt');
    });
  });

  describe('draftMethodsTx (rule 12)', () => {
    it('inserts a draft copying the latest non-draft version, pinned via templates.forDocument, and skips methods with a draft', async () => {
      const published = methodVersion(M1, 2, {
        status: 'published',
        content: methodContent('Published copy'),
      });
      found(
        tx,
        [methodDoc(M1), methodDoc(M2)],
        [methodVersion(M1, 1, { status: 'archived' }), published, methodVersion(M2, 1)],
      );
      await service.draftMethodsTx(tx, SERVICE_DOC as any, serviceVersion([M1, M2]).content);

      expect(templates.forDocument).toHaveBeenCalledTimes(1);
      expect(templates.forDocument).toHaveBeenCalledWith(`t-${M1}`);
      expect(tx.insert).toHaveBeenCalledTimes(1);
      expect(tx.values).toHaveBeenCalledWith({
        documentId: M1,
        templateId: 'tmpl',
        templateVersionId: 'tmpl-v9',
        versionNumber: 3,
        content: methodContent('Published copy'),
      });
    });
  });

  describe('discardMethodDraftsTx (rule 14)', () => {
    it('deletes a method draft only when an older version exists', async () => {
      found(
        tx,
        [methodDoc(M1), methodDoc(M2)],
        [
          methodVersion(M1, 1, { status: 'published' }),
          methodVersion(M1, 2, { status: 'draft' }),
          methodVersion(M2, 1, { status: 'draft' }),
        ],
      );
      await service.discardMethodDraftsTx(tx, SERVICE_DOC as any, serviceVersion([M1, M2]).content);

      expect(tx.delete).toHaveBeenCalledTimes(1);
      expect(tx.delete).toHaveBeenCalledWith(documentVersions);
    });
  });

  describe('methodFor (rule 16)', () => {
    it('returns the FormWithVersion shape for a referenced method with rule 15 version and pinned definition', async () => {
      db.select.mockReturnValueOnce(
        mockQuery([
          serviceVersion([M1], {
            status: 'published',
            publishedAt: at('2026-10-06T00:00:00.000Z'),
          }),
        ]),
      );
      found(
        db,
        [methodDoc(M1)],
        [
          methodVersion(M1, 1, {
            status: 'published',
            title: 'As published',
            templateVersionId: 'tv-1',
            publishedAt: at('2026-10-06T00:00:00.000Z'),
          }),
          methodVersion(M1, 2, { status: 'draft', title: 'Newer draft' }),
        ],
      );
      const result = await service.methodFor('user-1', 'service-1', 'sv-1', M1);

      expect(result.form).toMatchObject({ id: M1, title: 'As published', workspaceId: 'ws-1' });
      expect(result.version).toMatchObject({ versionNumber: 1, status: 'published' });
      expect(templates.contentForVersion).toHaveBeenCalledWith('tv-1');
      expect(result.definition?.variants['default']).toMatchObject({ label: 'Online template' });
    });

    it('throws NotFound for a method the service version does not reference', async () => {
      db.select.mockReturnValueOnce(mockQuery([serviceVersion([M2])]));
      await expect(service.methodFor('user-1', 'service-1', 'sv-1', M1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      // Never looked the method up.
      expect(db.select).toHaveBeenCalledTimes(1);
    });
  });

  // Doc 290 rule 6.
  describe('check — one service per method (doc 290 rule 6)', () => {
    it('reports Also used by <title> for a method another service links to', async () => {
      found(db, [methodDoc(M1), methodDoc(M2)], [methodVersion(M1, 1), methodVersion(M2, 1)]);
      vi.mocked(linkUsers).mockResolvedValueOnce(
        new Map([
          [
            M1,
            [
              { documentId: 'other-1', title: 'Parking permits' },
              { documentId: 'other-2', title: null },
            ],
          ],
        ]),
      );
      const check = await service.check(db, SERVICE_DOC as any, serviceVersion([M1, M2]) as any);

      expect(vi.mocked(linkUsers)).toHaveBeenCalledWith(db, [M1, M2], 'service-1');
      expect(check.methods[0]?.problems).toEqual(['Also used by Parking permits, Untitled']);
      expect(check.methods[1]?.problems).toEqual([]);
      expect(check.ok).toBe(false);
    });
  });
});
