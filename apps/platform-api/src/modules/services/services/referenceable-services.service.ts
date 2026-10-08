import { Injectable } from '@nestjs/common';
import {
  type Database,
  DOCUMENT_TYPE,
  documentVersions,
  documents,
  workspaces,
} from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { type SQL, and, asc, eq, ilike, isNotNull, ne, or, sql } from 'drizzle-orm';
import type {
  ReferenceableService,
  ReferenceableServiceList,
  ReferenceableServicesQuery,
} from '../dtos/service.dtos';
import { ServicesService } from './services.service';

/**
 * The version each candidate row is represented by (doc 287 rule 17):
 * - a service in the caller's workspace → its CURRENT version, exactly `currentVersion()` in
 *   services.service.ts: the newest ever-published one, else the newest;
 * - a service in any other workspace → its newest PUBLISHED version, so another workspace's drafts
 *   (and their titles) never leak. NULL when it has none, which the WHERE then drops.
 */
function chosenVersionId(workspaceId: string): SQL {
  return sql`(CASE WHEN ${documents.workspaceId} = ${workspaceId}
    THEN (SELECT dv.id FROM ${documentVersions} dv WHERE dv.document_id = ${documents.id}
      ORDER BY (dv.published_at IS NOT NULL) DESC, dv.version_number DESC LIMIT 1)
    ELSE (SELECT dv.id FROM ${documentVersions} dv WHERE dv.document_id = ${documents.id}
      AND dv.status = 'published' ORDER BY dv.version_number DESC LIMIT 1)
    END)`;
}

/** The list endpoint's derived status (`summarizeStatus`), in SQL: published → draft → archived → none. */
const derivedStatus = sql<ReferenceableService['status']>`(CASE
  WHEN EXISTS (SELECT 1 FROM ${documentVersions} dv WHERE dv.document_id = ${documents.id} AND dv.status = 'published') THEN 'published'
  WHEN EXISTS (SELECT 1 FROM ${documentVersions} dv WHERE dv.document_id = ${documents.id} AND dv.status = 'draft') THEN 'draft'
  WHEN EXISTS (SELECT 1 FROM ${documentVersions} dv WHERE dv.document_id = ${documents.id}) THEN 'archived'
  ELSE 'none' END)`;

/**
 * Doc 287: the services a document-reference control can link to. Own-workspace services in every
 * status (staff link sibling drafts) UNION other workspaces' services that have a published version.
 * One query: the "union" is a single scan of `services.service` documents whose chosen version is
 * resolved per row, so paging and the total stay consistent.
 */
@Injectable()
export class ReferenceableServicesService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly services: ServicesService,
  ) {}

  async list(userId: string, query: ReferenceableServicesQuery): Promise<ReferenceableServiceList> {
    await this.services.requireMembership(userId, query.workspaceId);
    const where = this.whereFor(query);
    const joinOn = eq(documentVersions.id, chosenVersionId(query.workspaceId));
    const [rows, totals] = await Promise.all([
      this.db
        .select({
          id: documents.id,
          workspaceId: workspaces.id,
          workspaceName: workspaces.name,
          title: documentVersions.title,
          description: documentVersions.description,
          status: derivedStatus,
        })
        .from(documents)
        .innerJoin(workspaces, eq(workspaces.id, documents.workspaceId))
        .leftJoin(documentVersions, joinOn)
        .where(where)
        .orderBy(asc(documentVersions.title), asc(documents.id))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(documents)
        .innerJoin(workspaces, eq(workspaces.id, documents.workspaceId))
        .leftJoin(documentVersions, joinOn)
        .where(where),
    ]);
    const items = rows.map(
      (row): ReferenceableService => ({
        id: row.id,
        workspaceId: row.workspaceId,
        workspaceName: row.workspaceName,
        title: row.title ?? null,
        description: row.description ?? null,
        status: row.status,
      }),
    );
    return { items, total: totals[0]?.count ?? 0, limit: query.limit, offset: query.offset };
  }

  private whereFor(query: ReferenceableServicesQuery): SQL | undefined {
    const q = query.q?.trim();
    return and(
      eq(documents.type, DOCUMENT_TYPE.service),
      eq(documents.kind, 'document'),
      // Own workspace: every row, even one with no version. Elsewhere: only a published version joins.
      or(eq(documents.workspaceId, query.workspaceId), isNotNull(documentVersions.id)),
      query.excludeId === undefined ? undefined : ne(documents.id, query.excludeId),
      q === undefined || q === '' ? undefined : ilike(documentVersions.title, `%${q}%`),
    );
  }
}
