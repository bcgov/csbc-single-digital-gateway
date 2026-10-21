import { NotFoundException } from '@nestjs/common';
import { documents, workspaces } from '@repo/database';
import { type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { referenceableServicesQuerySchema } from '../../../../../src/modules/services/dtos/service.dtos';
import { ReferenceableServicesService } from '../../../../../src/modules/services/services/referenceable-services.service';

const WS = 'e6005cbb-84f9-467a-bb48-e8cbffc9c991';
const OTHER = '6f1c0d0a-1111-4c2b-9c8e-000000000002';
const SELF = '0b6a1f8e-2222-4f6d-8e1a-000000000003';

const dialect = new PgDialect();
const render = (fragment: SQL) => dialect.sqlToQuery(fragment);

/** A hand-mocked Drizzle select chain that records every builder call and resolves to `rows`. */
const mockQuery = (rows: unknown) => {
  const qb = Promise.resolve(rows);
  return Object.assign(qb, {
    from: vi.fn().mockReturnValue(qb),
    innerJoin: vi.fn().mockReturnValue(qb),
    leftJoin: vi.fn().mockReturnValue(qb),
    where: vi.fn().mockReturnValue(qb),
    orderBy: vi.fn().mockReturnValue(qb),
    limit: vi.fn().mockReturnValue(qb),
    offset: vi.fn().mockReturnValue(qb),
  });
};

describe('ReferenceableServicesService', () => {
  let dbMock: { select: ReturnType<typeof vi.fn> };
  let servicesMock: { requireMembership: ReturnType<typeof vi.fn> };
  let service: ReferenceableServicesService;
  let pageQuery: ReturnType<typeof mockQuery>;
  let countQuery: ReturnType<typeof mockQuery>;

  const query = (extra: Record<string, unknown> = {}) =>
    referenceableServicesQuerySchema.parse({ workspaceId: WS, ...extra });

  const arrange = (rows: unknown[], total: number) => {
    pageQuery = mockQuery(rows);
    countQuery = mockQuery([{ count: total }]);
    dbMock.select.mockReturnValueOnce(pageQuery).mockReturnValueOnce(countQuery);
  };

  const whereSql = () => render(pageQuery.where.mock.calls[0]![0] as SQL);
  const joinSql = () => render(pageQuery.leftJoin.mock.calls[0]![1] as SQL);

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = { select: vi.fn() };
    servicesMock = { requireMembership: vi.fn().mockResolvedValue(undefined) };
    service = new ReferenceableServicesService(dbMock as never, servicesMock as never);
  });

  describe('list', () => {
    it('requires membership of workspaceId and 404s otherwise', async () => {
      servicesMock.requireMembership.mockRejectedValueOnce(
        new NotFoundException('Workspace not found'),
      );
      await expect(service.list('user-1', query())).rejects.toBeInstanceOf(NotFoundException);
      expect(servicesMock.requireMembership).toHaveBeenCalledWith('user-1', WS);
      expect(dbMock.select).not.toHaveBeenCalled();
    });

    it('returns own-workspace services in every status with the current version title', async () => {
      arrange(
        [
          {
            id: SELF,
            workspaceId: WS,
            workspaceName: 'Mine',
            title: 'Draft sibling',
            description: null,
            status: 'draft',
          },
        ],
        1,
      );
      const result = await service.list('user-1', query());
      expect(result.items[0]).toMatchObject({ title: 'Draft sibling', status: 'draft' });
      // Own workspace: the current version — newest ever-published, else newest (`currentVersion`).
      const join = joinSql();
      expect(join.sql).toContain(
        'ORDER BY (dv.published_at IS NOT NULL) DESC, dv.version_number DESC',
      );
      expect(join.params[0]).toBe(WS);
      // The WHERE admits every own-workspace row (no status filter) and restricts the type and kind.
      const where = whereSql();
      expect(where.sql).toContain('"documents"."workspace_id" = $');
      expect(where.sql).toContain('or "document_versions"."id" is not null');
      expect(where.params).toEqual(expect.arrayContaining(['services.service', 'document', WS]));
      expect(pageQuery.innerJoin).toHaveBeenCalledWith(workspaces, expect.anything());
    });

    it('returns other-workspace services only when they have a published version, with the published title', async () => {
      arrange(
        [
          {
            id: OTHER,
            workspaceId: OTHER,
            workspaceName: 'Theirs',
            title: 'Published elsewhere',
            description: 'Public summary',
            status: 'published',
          },
        ],
        1,
      );
      const result = await service.list('user-1', query());
      expect(result.items[0]).toMatchObject({ title: 'Published elsewhere', status: 'published' });
      // Elsewhere: only a PUBLISHED version is joined, so a draft-only service joins nothing and the
      // WHERE's `document_versions.id is not null` drops it — drafts never leak.
      expect(joinSql().sql).toMatch(
        /ELSE \(SELECT dv\.id FROM "document_versions" dv WHERE dv\.document_id = "documents"\."id"\s+AND dv\.status = 'published'/,
      );
    });

    it('excludes excludeId and filters by q on the version title', async () => {
      arrange([], 0);
      await service.list('user-1', query({ q: '  permit  ', excludeId: SELF }));
      const where = whereSql();
      expect(where.sql).toContain('"documents"."id" <> $');
      expect(where.sql).toContain('"document_versions"."title" ilike $');
      expect(where.params).toEqual(expect.arrayContaining([SELF, '%permit%']));
      // The total counts the same rows as the page.
      expect(countQuery.where).toHaveBeenCalledWith(pageQuery.where.mock.calls[0]![0]);

      arrange([], 0);
      await service.list('user-1', query({ q: '   ' }));
      expect(whereSql().sql).not.toContain('ilike');
      expect(whereSql().sql).not.toContain('<>');
    });

    it('returns items with id, workspaceId, workspaceName, title, description, status and total/limit/offset', async () => {
      const row = {
        id: SELF,
        workspaceId: WS,
        workspaceName: 'Mine',
        title: null,
        description: null,
        status: 'none',
      };
      arrange([row], 41);
      const result = await service.list('user-1', query({ limit: '10', offset: '20' }));
      expect(result).toEqual({ items: [row], total: 41, limit: 10, offset: 20 });
      expect(pageQuery.limit).toHaveBeenCalledWith(10);
      expect(pageQuery.offset).toHaveBeenCalledWith(20);
      // Ordered by the chosen version's title, then id.
      const order = pageQuery.orderBy.mock.calls[0]!.map((part: SQL) => render(part).sql);
      expect(order).toEqual(['"document_versions"."title" asc', '"documents"."id" asc']);
      expect(pageQuery.from).toHaveBeenCalledWith(documents);
    });
  });

  describe('dto', () => {
    it('rejects a non-uuid workspaceId, a q over 200 characters and a limit over 100', () => {
      expect(referenceableServicesQuerySchema.safeParse({ workspaceId: 'nope' }).success).toBe(
        false,
      );
      expect(
        referenceableServicesQuerySchema.safeParse({ workspaceId: WS, q: 'x'.repeat(201) }).success,
      ).toBe(false);
      expect(
        referenceableServicesQuerySchema.safeParse({ workspaceId: WS, limit: '101' }).success,
      ).toBe(false);
      expect(
        referenceableServicesQuerySchema.safeParse({ workspaceId: WS, excludeId: 'x' }).success,
      ).toBe(false);
      expect(
        referenceableServicesQuerySchema.safeParse({ workspaceId: WS, offset: '-1' }).success,
      ).toBe(false);
      expect(
        referenceableServicesQuerySchema.parse({ workspaceId: WS, q: 'x'.repeat(200) }),
      ).toEqual({ workspaceId: WS, q: 'x'.repeat(200), limit: 25, offset: 0 });
    });
  });
});
