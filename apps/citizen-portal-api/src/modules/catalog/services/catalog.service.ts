import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type Database,
  documentReferences,
  documentVersions,
  documents,
  submissionVersions,
  submissions,
} from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import {
  type CatalogService as CatalogServiceDto,
  type CatalogServiceDetail,
  type CatalogServiceVersion,
  type ListServicesQuery,
  type MyApplication,
} from '../dtos/catalog.dtos';
import { applicationReference, applicationStatusLabel, serviceDataString } from '../util/format';

/**
 * Read-only, workspace-free view of the service catalog for citizens (feature 60). Services are
 * `documents` of kind `service`; a service is browsable once it has a published version. Nothing
 * here leaks the workspace a service lives in.
 */
@Injectable()
export class CatalogService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  /**
   * Free-text match across a service's published title/description (which live in the version
   * `data` JSONB), plus the document title as a fallback.
   */
  private searchFilter(q: string) {
    const term = `%${q}%`;
    return or(
      ilike(documents.title, term),
      ilike(sql`${documentVersions.data}->>'title'`, term),
      ilike(sql`${documentVersions.data}->>'description'`, term),
    );
  }

  /**
   * List published services across all workspaces, optionally filtered by free-text `q`. The inner
   * join on the published version (one per document) both restricts to published services and
   * surfaces the version `data` from which title/description are read.
   */
  async listServices(query: ListServicesQuery): Promise<CatalogServiceDto[]> {
    const filters = [eq(documents.kind, 'service')];
    if (query.q !== undefined && query.q.length > 0) {
      const match = this.searchFilter(query.q);
      if (match !== undefined) {
        filters.push(match);
      }
    }
    const rows = await this.db
      .select({
        id: documents.id,
        docTitle: documents.title,
        docDescription: documents.description,
        data: documentVersions.data,
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
      .orderBy(asc(documents.title))
      .limit(query.limit);
    return rows.map((row) => ({
      id: row.id,
      title: serviceDataString(row.data, 'title', row.docTitle),
      description: serviceDataString(row.data, 'description', row.docDescription),
    }));
  }

  /**
   * A single published service + its current published version (id/number/data), so the detail page
   * can render the content and link to the version permalink. 404 when not a published service.
   */
  async getService(id: string): Promise<CatalogServiceDetail> {
    const rows = await this.db
      .select({
        id: documents.id,
        docTitle: documents.title,
        docDescription: documents.description,
        versionId: documentVersions.id,
        version: documentVersions.version,
        publishedAt: documentVersions.publishedAt,
        data: documentVersions.data,
      })
      .from(documents)
      .innerJoin(
        documentVersions,
        and(
          eq(documentVersions.documentId, documents.id),
          eq(documentVersions.status, 'published'),
        ),
      )
      .where(and(eq(documents.id, id), eq(documents.kind, 'service')))
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new NotFoundException('Service not found');
    }
    return {
      id: row.id,
      title: serviceDataString(row.data, 'title', row.docTitle),
      description: serviceDataString(row.data, 'description', row.docDescription),
      publishedVersionId: row.versionId,
      version: row.version,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      data: row.data,
    };
  }

  /**
   * A specific service version — exposed ONLY when published or archived (drafts are staff-internal),
   * so an application can show the service exactly as it was. 404 otherwise.
   */
  async getServiceVersion(serviceId: string, versionId: string): Promise<CatalogServiceVersion> {
    const rows = await this.db
      .select({
        id: documentVersions.id,
        version: documentVersions.version,
        status: documentVersions.status,
        data: documentVersions.data,
        createdAt: documentVersions.createdAt,
        publishedAt: documentVersions.publishedAt,
        archivedAt: documentVersions.archivedAt,
        docTitle: documents.title,
      })
      .from(documentVersions)
      .innerJoin(documents, eq(documents.id, documentVersions.documentId))
      .where(
        and(
          eq(documentVersions.id, versionId),
          eq(documentVersions.documentId, serviceId),
          eq(documents.kind, 'service'),
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
      version: row.version,
      status: row.status,
      title: serviceDataString(row.data, 'title', row.docTitle),
      data: row.data,
      createdAt: row.createdAt.toISOString(),
      publishedAt: row.publishedAt?.toISOString() ?? null,
      archivedAt: row.archivedAt?.toISOString() ?? null,
    };
  }

  /**
   * The signed-in citizen's applications, newest first. A submission is against an application-form
   * version; the owning service (and its version) is resolved through `document_references`. The
   * status + last-updated come from the latest `submission_version`. Workspace-free.
   */
  async listMyApplications(userId: string): Promise<MyApplication[]> {
    const subs = await this.db
      .select()
      .from(submissions)
      .where(eq(submissions.userId, userId))
      .orderBy(desc(submissions.createdAt));
    const items = await Promise.all(subs.map((sub) => this.toApplication(sub)));
    return items.filter((item): item is MyApplication => item !== null);
  }

  /** Resolve one submission into a citizen-facing application row (or null if it has no owning service). */
  private async toApplication(sub: typeof submissions.$inferSelect): Promise<MyApplication | null> {
    const refRows = await this.db
      .select({
        serviceId: documentReferences.ownerDocumentId,
        serviceVersionId: documentReferences.ownerVersionId,
      })
      .from(documentReferences)
      .where(
        and(
          eq(documentReferences.targetVersionId, sub.documentVersionId),
          eq(documentReferences.relation, 'application_form'),
        ),
      )
      .limit(1);
    const ref = refRows[0];
    if (ref === undefined) {
      return null;
    }
    const [svc] = await this.db
      .select({ title: documents.title })
      .from(documents)
      .where(eq(documents.id, ref.serviceId))
      .limit(1);
    const [ver] = await this.db
      .select({ status: submissionVersions.status, updatedAt: submissionVersions.updatedAt })
      .from(submissionVersions)
      .where(eq(submissionVersions.submissionId, sub.id))
      .orderBy(desc(submissionVersions.version))
      .limit(1);
    const status = ver?.status ?? 'draft';
    return {
      id: sub.id,
      serviceId: ref.serviceId,
      serviceVersionId: ref.serviceVersionId,
      serviceTitle: svc?.title ?? 'Service',
      reference: applicationReference(sub.id, sub.createdAt),
      status,
      statusLabel: applicationStatusLabel(status),
      lastUpdated: (ver?.updatedAt ?? sub.updatedAt).toISOString(),
    };
  }
}
