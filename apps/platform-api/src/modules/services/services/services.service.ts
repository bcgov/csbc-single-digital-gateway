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
import { and, asc, eq, sql } from 'drizzle-orm';
import { deletableFor, SERVICE_HAS_SUBMISSIONS } from './service-deletable';
import { TemplateResolver, type TemplateContent } from '../../templates/services/template.resolver';
import {
  type CreateServiceInput,
  type ListServicesPageQuery,
  type ServiceDetail,
  type ServiceListResponse,
  type ServiceWithVersions,
  toServiceDto,
  toServiceVersionDto,
} from '../dtos/service.dtos';
import { rebuildLinksTx } from '../util/document-links';
import { currentVersion, listServicesPage } from '../util/services-list';
import { reactivateServiceTx } from '../util/version-copy';
import { ServiceMethodLifecycle } from './service-method-lifecycle.service';

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

  /** A workspace's services, paginated / sorted / searched (`util/services-list.ts`). Members only. */
  async list(userId: string, query: ListServicesPageQuery): Promise<ServiceListResponse> {
    await this.requireMembership(userId, query.workspaceId);
    return listServicesPage(this.db, query);
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
