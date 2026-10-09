import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type Database,
  type Document,
  type DocumentVersion,
  documentVersions,
  documents,
  submissions,
  workspaceMembers,
  DOCUMENT_TYPE,
} from '@repo/database';
import { withTitle } from '@repo/documents/content';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { deletableFor, SERVICE_HAS_SUBMISSIONS } from './service-deletable';
import { TemplateResolver, type TemplateContent } from '../../templates/services/template.resolver';
import {
  type CreateServiceInput,
  type ListServicesPageQuery,
  type ServiceDetail,
  type ServiceListResponse,
  type ServiceSummary,
  type ServiceWithVersions,
  toServiceDto,
  toServiceVersionDto,
} from '../dtos/service.dtos';
import { rebuildLinksTx } from '../util/document-links';
import { reactivateServiceTx } from '../util/version-copy';
import { ServiceMethodLifecycle } from './service-method-lifecycle.service';

function summarizeStatus(
  versions: Array<{ status: 'draft' | 'published' | 'archived' }>,
): ServiceSummary['status'] {
  if (versions.some((v) => v.status === 'published')) return 'published';
  if (versions.some((v) => v.status === 'draft')) return 'draft';
  if (versions.length > 0) return 'archived';
  return 'none';
}

/**
 * The version a service is currently represented by: the published one if there is one, else the
 * newest. `versions` must be ordered oldest-first.
 */
function currentVersion<T extends { publishedAt: Date | null }>(versions: T[]): T | undefined {
  return versions.findLast((version) => version.publishedAt !== null) ?? versions.at(-1);
}

@Injectable()
export class ServicesService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly templates: TemplateResolver,
    private readonly lifecycle: ServiceMethodLifecycle,
  ) {}

  /**
   * Create a service: the document + its draft v1, in one transaction. The draft's `content` is a
   * COPY of the published Service template's schema and variants with the default variant's `label` set to the
   * requested title (doc 275) — the GENERATED `document_versions.title` reads exactly that path, so there is no title column to
   * keep in sync.
   */
  async create(userId: string, input: CreateServiceInput): Promise<ServiceWithVersions> {
    await this.requireMembership(userId, input.workspaceId);
    const template = await this.templates.forCreate(DOCUMENT_TYPE.service, input.templateId);
    return this.db.transaction(async (tx) => {
      const insertedDoc = await tx
        .insert(documents)
        .values({
          type: DOCUMENT_TYPE.service,
          kind: 'document',
          workspaceId: input.workspaceId,
          templateId: template.templateId,
        })
        .returning();
      const doc = insertedDoc[0];
      if (doc === undefined) {
        throw new Error('document insert returned no row');
      }
      const insertedVersion = await tx
        .insert(documentVersions)
        .values({
          documentId: doc.id,
          templateId: template.templateId,
          templateVersionId: template.templateVersionId,
          versionNumber: 1,
          // The template's schema and variants, the title on every variant (the title column reads default's).
          content: withTitle({ schema: template.schema, variants: template.variants }, input.title),
        })
        .returning();
      const version = insertedVersion[0];
      if (version === undefined) {
        throw new Error('document version insert returned no row');
      }
      // Doc 290 rule 2: every content write rebuilds its links (a template's content references nothing yet).
      await rebuildLinksTx(tx, version);
      return {
        service: toServiceDto(doc, version),
        versions: [toServiceVersionDto(version)],
      };
    });
  }

  /** A published Service template's `{ schema, variants }` — for the create editor (docs 228, 275). */
  async getServiceDefinition(templateId?: string): Promise<{
    schema: Record<string, unknown>;
    variants: TemplateContent['variants'];
  }> {
    const template = await this.templates.forCreate(DOCUMENT_TYPE.service, templateId);
    return { schema: template.schema, variants: template.variants };
  }

  /**
   * List a workspace's services — paginated, sortable, searchable (initiative `staff-list-query`).
   * Paging/sort/search run in SQL; the page's derived fields (status, version count, submissions)
   * are computed in two batched follow-up queries (not per-row), so cost is bounded by the page
   * size.
   *
   * Feature 217: `title` / `description` moved to the VERSION and became generated, so search and
   * title-sort go through a correlated subquery over the latest version rather than reading a
   * column on `documents`.
   */
  async list(userId: string, query: ListServicesPageQuery): Promise<ServiceListResponse> {
    await this.requireMembership(userId, query.workspaceId);
    const q = query.q?.trim();
    // The latest version's generated title/description — the row's current identity.
    const latestTitle = sql<string>`(SELECT dv.title FROM ${documentVersions} dv
      WHERE dv.document_id = ${documents.id} ORDER BY dv.version_number DESC LIMIT 1)`;
    const latestDescription = sql<string>`(SELECT dv.description FROM ${documentVersions} dv
      WHERE dv.document_id = ${documents.id} ORDER BY dv.version_number DESC LIMIT 1)`;
    const search =
      q !== undefined && q !== ''
        ? or(ilike(latestTitle, `%${q}%`), ilike(latestDescription, `%${q}%`))
        : undefined;
    const where = and(
      eq(documents.workspaceId, query.workspaceId),
      eq(documents.type, DOCUMENT_TYPE.service),
      eq(documents.kind, 'document'),
      search,
    );
    // Derived status precedence for `sort: 'status'` — published(0) → draft(1) → archived(2) → none(3).
    const statusRank = sql`(CASE
      WHEN EXISTS (SELECT 1 FROM ${documentVersions} dv WHERE dv.document_id = ${documents.id} AND dv.status = 'published') THEN 0
      WHEN EXISTS (SELECT 1 FROM ${documentVersions} dv WHERE dv.document_id = ${documents.id} AND dv.status = 'draft') THEN 1
      WHEN EXISTS (SELECT 1 FROM ${documentVersions} dv WHERE dv.document_id = ${documents.id}) THEN 2
      ELSE 3 END)`;
    const sortExpr =
      query.sort === 'title'
        ? latestTitle
        : query.sort === 'status'
          ? statusRank
          : documents.updatedAt;
    const direction = query.order === 'asc' ? asc : desc;
    const [docs, totals] = await Promise.all([
      this.db
        .select()
        .from(documents)
        .where(where)
        .orderBy(direction(sortExpr), desc(documents.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(documents)
        .where(where),
    ]);
    const docIds = docs.map((doc) => doc.id);
    const [versionRows, submissionRows] = await Promise.all([
      docIds.length === 0
        ? []
        : this.db
            .select({
              documentId: documentVersions.documentId,
              versionNumber: documentVersions.versionNumber,
              status: documentVersions.status,
              title: documentVersions.title,
              description: documentVersions.description,
              publishedAt: documentVersions.publishedAt,
            })
            .from(documentVersions)
            .where(inArray(documentVersions.documentId, docIds))
            .orderBy(asc(documentVersions.versionNumber)),
      docIds.length === 0
        ? []
        : this.db
            .select({ documentId: submissions.documentId, n: sql<number>`count(*)::int` })
            .from(submissions)
            .where(inArray(submissions.documentId, docIds))
            .groupBy(submissions.documentId),
    ]);
    const versionsByDoc = new Map<string, Array<(typeof versionRows)[number]>>();
    for (const row of versionRows) {
      const list = versionsByDoc.get(row.documentId);
      if (list) list.push(row);
      else versionsByDoc.set(row.documentId, [row]);
    }
    const submissionDocIds = new Set(submissionRows.map((row) => row.documentId));
    const items = docs.map((doc) => {
      const versions = versionsByDoc.get(doc.id) ?? [];
      // versions are ordered asc by version_number, so the last row is the latest version.
      const latest = versions[versions.length - 1];
      // Object.assign onto the fresh DTO (not a spread) keeps oxlint's no-map-spread happy.
      return Object.assign(toServiceDto(doc, currentVersion(versions)), {
        status: summarizeStatus(versions),
        versionCount: versions.length,
        hasSubmissions: submissionDocIds.has(doc.id),
        latestPublished: latest?.publishedAt != null,
      });
    });
    return { items, total: totals[0]?.count ?? 0, limit: query.limit, offset: query.offset };
  }

  /**
   * A service + its versions + the template(s) to render.
   *
   * Feature 174 (carried forward): the template is resolved **per version** via
   * `document_versions.template_version_id`, NOT via `templates.forCreate()` (the currently-published
   * template version). A service authored before a template reshape stays pinned to the old
   * version and must keep rendering against the template it was authored under.
   */
  async get(userId: string, id: string): Promise<ServiceDetail> {
    const doc = await this.requireDocument(userId, id);
    const versions = await this.versionsOf(id);
    const definitions = await this.templates.contentsForVersions(
      versions
        .map((version) => version.templateVersionId)
        .filter((versionId): versionId is string => versionId !== null),
    );
    const current = currentVersion(versions);
    const currentDefinition =
      current?.templateVersionId == null ? undefined : definitions[current.templateVersionId];
    const hasSubmissions = await this.hasSubmissions(id);
    return {
      service: toServiceDto(doc, current),
      versions: versions.map(toServiceVersionDto),
      definition: currentDefinition ?? { schema: {}, variants: { default: {} } },
      definitions,
      hasSubmissions,
      deletable: deletableFor(versions, hasSubmissions),
    };
  }

  /**
   * Whether the service document has submissions — gates delete vs archive.
   *
   * Feature 217: this used to count submissions against the service's referenced application
   * forms. With `document_references` gone a service knows nothing about its ways to apply, so
   * this now answers the narrower question the RESTRICT FK on `submissions` actually enforces.
   */
  private async hasSubmissions(serviceId: string): Promise<boolean> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(submissions)
      .where(eq(submissions.documentId, serviceId));
    return (rows[0]?.n ?? 0) > 0;
  }

  /**
   * Delete a service with no submissions; refuses (409) otherwise — archive instead, to preserve
   * the submitted data. Deleting the document cascades its versions.
   */
  async remove(userId: string, id: string): Promise<void> {
    const service = await this.requireDocument(userId, id);
    if (await this.hasSubmissions(id)) {
      throw new ConflictException(SERVICE_HAS_SUBMISSIONS);
    }
    await this.db.transaction(async (tx) => {
      // Doc 290 rule 11: first the methods only this service uses — its links go with it.
      await this.lifecycle.deleteMethodsTx(tx, service);
      await tx.delete(documents).where(eq(documents.id, id));
    });
  }

  /** Archive a service: archive every non-archived version → status derives to 'archived'; its methods too (doc 290). */
  async archive(userId: string, id: string): Promise<void> {
    const service = await this.requireDocument(userId, id);
    // Doc 290 rules 9-10: ONE timestamp for the service and its methods — reactivate matches on it.
    const at = new Date();
    await this.db.transaction(async (tx) => {
      await tx
        .update(documentVersions)
        .set({ archivedAt: at })
        .where(
          and(eq(documentVersions.documentId, id), sql`${documentVersions.archivedAt} is null`),
        );
      await this.lifecycle.archiveMethodsTx(tx, service, at);
    });
  }

  /** Reactivate an archived service: clear `archived_at` on the LATEST version. */
  async reactivate(userId: string, id: string): Promise<void> {
    const service = await this.requireDocument(userId, id);
    await this.db.transaction(async (tx) => {
      const archived = await reactivateServiceTx(tx, id);
      await this.lifecycle.reactivateMethodsTx(tx, service, archived);
    });
  }

  private async versionsOf(documentId: string): Promise<DocumentVersion[]> {
    return this.db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(asc(documentVersions.versionNumber));
  }

  /** The caller must be a member of the workspace; 404 otherwise (existence not leaked). */
  async requireMembership(userId: string, workspaceId: string): Promise<void> {
    const rows = await this.db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)),
      )
      .limit(1);
    if (rows[0] === undefined) {
      throw new NotFoundException('Workspace not found');
    }
  }

  /** The document must exist AND the caller be a member of its workspace; 404 otherwise. The
   * membership inner-join can only match a workspace-scoped document (a global, workspace-NULL
   * document has no workspace_id to join on), so the returned document's workspace is non-null. */
  async requireDocument(userId: string, id: string): Promise<Document & { workspaceId: string }> {
    const rows = await this.db
      .select({ doc: documents })
      .from(documents)
      .innerJoin(
        workspaceMembers,
        and(
          eq(workspaceMembers.workspaceId, documents.workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      )
      .where(eq(documents.id, id))
      .limit(1);
    const row = rows[0];
    if (row === undefined || row.doc.workspaceId === null) {
      throw new NotFoundException('Service not found');
    }
    return { ...row.doc, workspaceId: row.doc.workspaceId };
  }
}
