import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type Database,
  type Document,
  documentReferences,
  documentVersions,
  documents,
  submissions,
  workspaceMembers,
} from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import {
  type CreateServiceInput,
  type FormCatalogEntry,
  type ListServicesPageQuery,
  type ServiceDetail,
  type ServiceListResponse,
  type ServiceSummary,
  type ServiceWithVersions,
  toServiceDto,
  toServiceVersionDto,
} from '../dtos/service.dtos';
import { insertApplication, resolveApplications } from '../util/applications';
import { reactivateServiceTx } from '../util/version-copy';
import { ServiceTypeResolver } from './service-type.resolver';

function summarizeStatus(
  versions: Array<{ status: 'draft' | 'published' | 'archived' }>,
): ServiceSummary['status'] {
  if (versions.some((v) => v.status === 'published')) return 'published';
  if (versions.some((v) => v.status === 'draft')) return 'draft';
  if (versions.length > 0) return 'archived';
  return 'none';
}

@Injectable()
export class ServicesService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly serviceType: ServiceTypeResolver,
  ) {}

  /**
   * Composite create: the service document + its draft v1 (data) + any inline forms + application
   * references, all in ONE transaction. Applications are pre-validated before the write opens.
   */
  async create(userId: string, input: CreateServiceInput): Promise<ServiceWithVersions> {
    await this.requireMembership(userId, input.workspaceId);
    const type = await this.serviceType.resolve();
    // A new service can't be a reference target yet, so pass '' as the (non-matching) service id.
    const resolved = await resolveApplications(this.db, '', input.workspaceId, input.applications);
    return this.db.transaction(async (tx) => {
      const insertedDoc = await tx
        .insert(documents)
        .values({
          typeId: type.typeId,
          workspaceId: input.workspaceId,
          kind: 'service',
          title: input.title,
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
          typeId: type.typeId,
          typeVersionId: type.typeVersionId,
          version: 1,
          data: { ...input.data, title: input.title },
        })
        .returning();
      const version = insertedVersion[0];
      if (version === undefined) {
        throw new Error('document version insert returned no row');
      }
      const owner = {
        ownerVersionId: version.id,
        ownerDocumentId: doc.id,
        workspaceId: input.workspaceId,
      };
      for (const app of resolved) {
        // Sequential by necessity — these writes share one transaction connection.
        // eslint-disable-next-line no-await-in-loop
        await insertApplication(tx, owner, app);
      }
      return { service: toServiceDto(doc), versions: [toServiceVersionDto(version)] };
    });
  }

  /** The Service type's published form definition (schema/uischema) — for the create editor. */
  async getServiceDefinition(): Promise<{
    schema: Record<string, unknown>;
    uischema: Record<string, unknown>;
  }> {
    const type = await this.serviceType.resolve();
    return { schema: type.schema, uischema: type.uischema };
  }

  /** The workspace's form documents (basic-form / multi-stage-form) + a version to reference. */
  async listForms(userId: string, workspaceId: string): Promise<FormCatalogEntry[]> {
    await this.requireMembership(userId, workspaceId);
    const docs = await this.db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.workspaceId, workspaceId),
          inArray(documents.kind, ['basic-form', 'multi-stage-form']),
        ),
      )
      .orderBy(desc(documents.createdAt));
    const entries = await Promise.all(
      docs.map(async (doc) => {
        const versions = await this.db
          .select({ id: documentVersions.id, status: documentVersions.status })
          .from(documentVersions)
          .where(eq(documentVersions.documentId, doc.id))
          .orderBy(desc(documentVersions.version));
        const chosen = versions.find((v) => v.status === 'published') ?? versions[0];
        return chosen
          ? { documentId: doc.id, versionId: chosen.id, title: doc.title, kind: doc.kind }
          : null;
      }),
    );
    return entries.filter((entry): entry is FormCatalogEntry => entry !== null);
  }

  /**
   * List a workspace's services — paginated, sortable, searchable (initiative `staff-list-query`).
   * Paging/sort/search run in SQL; the page's derived fields (status, version count, submissions) are
   * computed in two batched follow-up queries (not per-row), so cost is bounded by the page size.
   */
  async list(userId: string, query: ListServicesPageQuery): Promise<ServiceListResponse> {
    await this.requireMembership(userId, query.workspaceId);
    const type = await this.serviceType.resolve();
    const q = query.q?.trim();
    const search =
      q !== undefined && q !== ''
        ? or(ilike(documents.title, `%${q}%`), ilike(documents.description, `%${q}%`))
        : undefined;
    const where = and(
      eq(documents.workspaceId, query.workspaceId),
      eq(documents.typeId, type.typeId),
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
        ? documents.title
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
              version: documentVersions.version,
              status: documentVersions.status,
              publishedAt: documentVersions.publishedAt,
            })
            .from(documentVersions)
            .where(inArray(documentVersions.documentId, docIds))
            .orderBy(asc(documentVersions.version)),
      docIds.length === 0
        ? []
        : this.db
            .select({
              ownerDocumentId: documentReferences.ownerDocumentId,
              n: sql<number>`count(*)::int`,
            })
            .from(documentReferences)
            .innerJoin(submissions, eq(submissions.documentId, documentReferences.targetDocumentId))
            .where(
              and(
                inArray(documentReferences.ownerDocumentId, docIds),
                eq(documentReferences.relation, 'application_form'),
              ),
            )
            .groupBy(documentReferences.ownerDocumentId),
    ]);
    const versionsByDoc = new Map<string, Array<(typeof versionRows)[number]>>();
    for (const row of versionRows) {
      const list = versionsByDoc.get(row.documentId);
      if (list) list.push(row);
      else versionsByDoc.set(row.documentId, [row]);
    }
    const submissionDocIds = new Set(submissionRows.map((row) => row.ownerDocumentId));
    const items = docs.map((doc) => {
      const versions = versionsByDoc.get(doc.id) ?? [];
      // versions are ordered asc by version, so the last row is the latest version.
      const latest = versions[versions.length - 1];
      // Object.assign onto the fresh DTO (not a spread) keeps oxlint's no-map-spread happy.
      return Object.assign(toServiceDto(doc), {
        status: summarizeStatus(versions),
        versionCount: versions.length,
        hasSubmissions: submissionDocIds.has(doc.id),
        latestPublished: latest?.publishedAt != null,
      });
    });
    return { items, total: totals[0]?.count ?? 0, limit: query.limit, offset: query.offset };
  }

  /** A service + its versions + the Service form definition to render. */
  async get(userId: string, id: string): Promise<ServiceDetail> {
    const doc = await this.requireDocument(userId, id);
    const type = await this.serviceType.resolve();
    const versions = await this.versionsOf(id);
    return {
      service: toServiceDto(doc),
      versions: versions.map(toServiceVersionDto),
      definition: { schema: type.schema, uischema: type.uischema },
      hasSubmissions: await this.hasSubmissions(id),
    };
  }

  /** Whether ANY of the service's application-method forms has submissions (gates delete vs archive). */
  private async hasSubmissions(serviceId: string): Promise<boolean> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(documentReferences)
      .innerJoin(submissions, eq(submissions.documentId, documentReferences.targetDocumentId))
      .where(
        and(
          eq(documentReferences.ownerDocumentId, serviceId),
          eq(documentReferences.relation, 'application_form'),
        ),
      );
    return (rows[0]?.n ?? 0) > 0;
  }

  /** The application-method form document ids referenced by this service. */
  private async applicationFormIds(serviceId: string): Promise<string[]> {
    const rows = await this.db
      .select({ formId: documentReferences.targetDocumentId })
      .from(documentReferences)
      .where(
        and(
          eq(documentReferences.ownerDocumentId, serviceId),
          eq(documentReferences.relation, 'application_form'),
        ),
      );
    return [...new Set(rows.map((r) => r.formId))];
  }

  /** The application-method target document ids referenced by this service — forms AND external
   * links (feature 131). Used to clean up orphaned method documents when the service is deleted. */
  private async applicationMethodTargetIds(serviceId: string): Promise<string[]> {
    const rows = await this.db
      .select({ targetId: documentReferences.targetDocumentId })
      .from(documentReferences)
      .where(
        and(
          eq(documentReferences.ownerDocumentId, serviceId),
          inArray(documentReferences.relation, ['application_form', 'external_application']),
        ),
      );
    return [...new Set(rows.map((r) => r.targetId))];
  }

  /** Delete a service when none of its application forms has submissions — the service (cascading its
   * versions + owned references) AND those now-unreferenced forms are removed. Refuses (409) when any
   * form has submissions: archive instead to preserve the submitted data. */
  async remove(userId: string, id: string): Promise<void> {
    await this.requireDocument(userId, id);
    if (await this.hasSubmissions(id)) {
      throw new ConflictException(
        'An application of this service has submissions — archive it instead of deleting it',
      );
    }
    const formIds = await this.applicationMethodTargetIds(id);
    await this.db.transaction(async (tx) => {
      // Deleting the service cascades its versions + the references it owns; the (submission-free)
      // application methods (forms + external links) are then orphaned — delete each one that no
      // other service still references.
      await tx.delete(documents).where(eq(documents.id, id));
      for (const formId of formIds) {
        // Sequential by necessity — these reads/writes share one transaction connection.
        // eslint-disable-next-line no-await-in-loop
        const remaining = await tx
          .select({ n: sql<number>`count(*)::int` })
          .from(documentReferences)
          .where(eq(documentReferences.targetDocumentId, formId));
        if ((remaining[0]?.n ?? 0) === 0) {
          // eslint-disable-next-line no-await-in-loop
          await tx.delete(documents).where(eq(documents.id, formId));
        }
      }
    });
  }

  /** Archive a service (archive every non-archived version → status derives to 'archived'). Archiving a
   * service also archives its application forms. */
  async archive(userId: string, id: string): Promise<void> {
    await this.requireDocument(userId, id);
    const formIds = await this.applicationFormIds(id);
    const docIds = [id, ...formIds];
    await this.db
      .update(documentVersions)
      .set({ archivedAt: new Date() })
      .where(
        and(
          inArray(documentVersions.documentId, docIds),
          sql`${documentVersions.archivedAt} is null`,
        ),
      );
  }

  /** Reactivate an archived service: clear `archived_at` on the LATEST version (→ its prior published/
   * draft state) and the application forms it references. Older versions stay archived as history. */
  async reactivate(userId: string, id: string): Promise<void> {
    await this.requireDocument(userId, id);
    await this.db.transaction((tx) => reactivateServiceTx(tx, id));
  }

  private async versionsOf(documentId: string) {
    return this.db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(asc(documentVersions.version));
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
