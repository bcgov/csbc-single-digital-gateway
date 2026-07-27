import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type Database,
  documentReferences,
  documentTypeVersions,
  documentVersions,
  documents,
} from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, asc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import {
  type ApplicationForm,
  type CatalogService as CatalogServiceDto,
  type CatalogServiceDetail,
  type CatalogServiceVersion,
  type ListServicesQuery,
} from '../dtos/catalog.dtos';
import { definitionSchemas, serviceDataString } from '../util/format';

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
        definition: documentTypeVersions.definition,
      })
      .from(documents)
      .innerJoin(
        documentVersions,
        and(
          eq(documentVersions.documentId, documents.id),
          eq(documentVersions.status, 'published'),
        ),
      )
      .innerJoin(documentTypeVersions, eq(documentTypeVersions.id, documentVersions.typeVersionId))
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
      ...definitionSchemas(row.definition),
      applications: await this.applicationFormsFor(row.versionId),
    };
  }

  /** The application methods a service version offers — in-portal forms (`application_form`) AND
   * external links (`external_application`, feature 131). For an external method the `https`
   * destination is read from its target version `data.url`; forms carry `url: null`. */
  private async applicationFormsFor(versionId: string): Promise<ApplicationForm[]> {
    const rows = await this.db
      .select({
        id: documentReferences.id,
        label: documentReferences.label,
        title: documents.title,
        formId: documentReferences.targetDocumentId,
        formVersionId: documentReferences.targetVersionId,
        kind: documentReferences.targetKind,
        targetData: documentVersions.data,
      })
      .from(documentReferences)
      .innerJoin(documents, eq(documents.id, documentReferences.targetDocumentId))
      .innerJoin(documentVersions, eq(documentVersions.id, documentReferences.targetVersionId))
      .where(
        and(
          eq(documentReferences.ownerVersionId, versionId),
          inArray(documentReferences.relation, ['application_form', 'external_application']),
        ),
      )
      .orderBy(asc(documentReferences.position));
    // An application-method reference always pins a version; the narrowing drops any malformed null.
    return rows
      .filter((row) => row.formVersionId !== null)
      .map((row) => {
        const rawUrl = (row.targetData as { url?: unknown }).url;
        const url =
          row.kind === 'external-application' && typeof rawUrl === 'string' ? rawUrl : null;
        return {
          id: row.id,
          label: row.label,
          title: row.title,
          formId: row.formId,
          formVersionId: row.formVersionId as string,
          kind: row.kind,
          url,
        } satisfies ApplicationForm;
      });
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
        definition: documentTypeVersions.definition,
      })
      .from(documentVersions)
      .innerJoin(documents, eq(documents.id, documentVersions.documentId))
      .innerJoin(documentTypeVersions, eq(documentTypeVersions.id, documentVersions.typeVersionId))
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
      ...definitionSchemas(row.definition),
      createdAt: row.createdAt.toISOString(),
      publishedAt: row.publishedAt?.toISOString() ?? null,
      archivedAt: row.archivedAt?.toISOString() ?? null,
    };
  }
}
