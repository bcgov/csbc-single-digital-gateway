import { Injectable, NotFoundException } from '@nestjs/common';
import { type Database, documentVersions, documents } from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import type {
  CatalogService as CatalogServiceDto,
  CatalogServiceDetail,
  CatalogServiceVersion,
  ListServicesQuery,
} from '../dtos/catalog.dtos';
import { contentSchemas } from '../util/format';

/**
 * Read-only, workspace-free view of the service catalog for citizens (feature 60). Services are
 * `documents` with `type = 'service'`; a service is browsable once it has a published version.
 * Nothing here leaks the workspace a service lives in.
 *
 * Feature 217: a service is an AUTHORED document. Title and description are GENERATED columns on
 * its version, and the version's own `content` is what renders — there is no type template to
 * resolve and no `data` to fill into it. The "ways to apply" list is gone with
 * `document_references`.
 */
@Injectable()
export class CatalogService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  /** Free-text match across the published version's generated title/description. */
  private searchFilter(q: string) {
    const term = `%${q}%`;
    return or(ilike(documentVersions.title, term), ilike(documentVersions.description, term));
  }

  /**
   * List published services across all workspaces, optionally filtered by free-text `q`. The inner
   * join on the published version (one per document) both restricts to published services and
   * surfaces the generated title/description.
   */
  async listServices(query: ListServicesQuery): Promise<CatalogServiceDto[]> {
    const filters = [eq(documents.type, 'service'), eq(documents.kind, 'document')];
    if (query.q !== undefined && query.q.length > 0) {
      const match = this.searchFilter(query.q);
      if (match !== undefined) {
        filters.push(match);
      }
    }
    const rows = await this.db
      .select({
        id: documents.id,
        title: documentVersions.title,
        description: documentVersions.description,
      })
      .from(documents)
      .innerJoin(
        documentVersions,
        and(
          eq(documentVersions.documentId, documents.id),
          eq(documentVersions.status, 'published'),
        ),
      )
      .where(and(...filters))
      // A NULL title sorts last rather than first, so an unlabelled service doesn't head the list.
      // Written as ONE raw expression: wrapping it in drizzle's `asc()` appends the direction AFTER
      // the null ordering (`… nulls last asc`), which Postgres rejects.
      .orderBy(sql`${documentVersions.title} asc nulls last`)
      .limit(query.limit);
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
    }));
  }

  /**
   * A single published service + its current published version, so the detail page can render the
   * content and link to the version permalink. 404 when not a published service.
   */
  async getService(id: string): Promise<CatalogServiceDetail> {
    const rows = await this.db
      .select({
        id: documents.id,
        title: documentVersions.title,
        description: documentVersions.description,
        versionId: documentVersions.id,
        versionNumber: documentVersions.versionNumber,
        publishedAt: documentVersions.publishedAt,
        content: documentVersions.content,
      })
      .from(documents)
      .innerJoin(
        documentVersions,
        and(
          eq(documentVersions.documentId, documents.id),
          eq(documentVersions.status, 'published'),
        ),
      )
      .where(
        and(eq(documents.id, id), eq(documents.type, 'service'), eq(documents.kind, 'document')),
      )
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new NotFoundException('Service not found');
    }
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      publishedVersionId: row.versionId,
      versionNumber: row.versionNumber,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      ...contentSchemas(row.content),
    };
  }

  /**
   * A specific service version — exposed ONLY when published or archived (drafts are
   * staff-internal), so an application can show the service exactly as it was. 404 otherwise.
   */
  async getServiceVersion(serviceId: string, versionId: string): Promise<CatalogServiceVersion> {
    const rows = await this.db
      .select({
        id: documentVersions.id,
        versionNumber: documentVersions.versionNumber,
        status: documentVersions.status,
        title: documentVersions.title,
        content: documentVersions.content,
        createdAt: documentVersions.createdAt,
        publishedAt: documentVersions.publishedAt,
        archivedAt: documentVersions.archivedAt,
      })
      .from(documentVersions)
      .innerJoin(documents, eq(documents.id, documentVersions.documentId))
      .where(
        and(
          eq(documentVersions.id, versionId),
          eq(documentVersions.documentId, serviceId),
          eq(documents.type, 'service'),
          eq(documents.kind, 'document'),
          inArray(documentVersions.status, ['published', 'archived']),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (row === undefined || (row.status !== 'published' && row.status !== 'archived')) {
      throw new NotFoundException('Service version not found');
    }
    return {
      id: row.id,
      serviceId,
      versionNumber: row.versionNumber,
      status: row.status,
      title: row.title,
      ...contentSchemas(row.content),
      createdAt: row.createdAt.toISOString(),
      publishedAt: row.publishedAt?.toISOString() ?? null,
      archivedAt: row.archivedAt?.toISOString() ?? null,
    };
  }
}
