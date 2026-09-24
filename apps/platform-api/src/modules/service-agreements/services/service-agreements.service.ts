import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type Database,
  type Document,
  type DocumentVersion,
  documentVersions,
  documents,
  workspaceMembers,
} from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { TemplateResolver } from '../../templates/services/template.resolver';
import { validateContent } from '../../templates/services/validate-content';
import {
  type CreateServiceAgreementInput,
  type ListServiceAgreementsPageQuery,
  type ListServiceAgreementsQuery,
  type ServiceAgreementDetail,
  type ServiceAgreementListPageResponse,
  type ServiceAgreementSummary,
  type ServiceAgreementVersionResponse,
  type ServiceAgreementWithVersion,
  type UpdateServiceAgreementInput,
  toAgreementDto,
  toAgreementVersionDto,
} from '../dtos/service-agreement.dtos';

const TYPE = 'service-agreement' as const;

/** The caller identity + whether they hold the global `admin` role. */
export interface Actor {
  id: string;
  isAdmin: boolean;
}

function summarizeStatus(
  versions: Array<{ status: 'draft' | 'published' | 'archived' }>,
): ServiceAgreementSummary['status'] {
  if (versions.some((v) => v.status === 'published')) return 'published';
  if (versions.some((v) => v.status === 'draft')) return 'draft';
  if (versions.length > 0) return 'archived';
  return 'none';
}

/**
 * The version an agreement is currently represented by: the published one if there is one, else
 * the newest. `versions` must be ordered oldest-first.
 */
function currentVersion<T extends { publishedAt: Date | null }>(versions: T[]): T | undefined {
  return versions.findLast((version) => version.publishedAt !== null) ?? versions.at(-1);
}

@Injectable()
export class ServiceAgreementsService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly templates: TemplateResolver,
  ) {}

  /** Create an agreement + its draft v1. workspaceId → staff (member); no workspaceId → admin (global). */
  async create(
    actor: Actor,
    input: CreateServiceAgreementInput,
  ): Promise<ServiceAgreementWithVersion> {
    let workspaceId: string | null;
    if (input.workspaceId !== undefined) {
      await this.requireMembership(actor.id, input.workspaceId);
      workspaceId = input.workspaceId;
    } else {
      if (!actor.isAdmin) {
        throw new ForbiddenException('Only an admin can create a global service agreement');
      }
      workspaceId = null;
    }
    const template = await this.templates.resolve(TYPE);
    return this.db.transaction(async (tx) => {
      const insertedDoc = await tx
        .insert(documents)
        .values({ type: TYPE, kind: 'document', workspaceId, templateId: template.templateId })
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
          // A copy of the template with the requested title stamped into the label the GENERATED
          // title column reads.
          content: {
            schema: template.schema,
            uischema: { ...template.uischema, label: input.title },
          },
        })
        .returning();
      const version = insertedVersion[0];
      if (version === undefined) {
        throw new Error('document version insert returned no row');
      }
      return { agreement: toAgreementDto(doc, version), version: toAgreementVersionDto(version) };
    });
  }

  /** List agreements: a workspace's own + global (staff), or global only (admin, no workspace). */
  async list(actor: Actor, query: ListServiceAgreementsQuery): Promise<ServiceAgreementSummary[]> {
    let scope;
    if (query.workspaceId !== undefined) {
      await this.requireMembership(actor.id, query.workspaceId);
      scope = or(eq(documents.workspaceId, query.workspaceId), isNull(documents.workspaceId));
    } else {
      if (!actor.isAdmin) {
        throw new ForbiddenException('Only an admin can list global service agreements');
      }
      scope = isNull(documents.workspaceId);
    }
    // Only surface agreements with a currently-published version — a draft-only agreement (e.g. one
    // created inline for a service but never published) shouldn't clutter the reusable catalog.
    const hasPublished = sql`exists (select 1 from ${documentVersions} dv where dv.document_id = ${documents.id} and dv.status = 'published')`;
    const docs = await this.db
      .select()
      .from(documents)
      .where(and(eq(documents.type, TYPE), eq(documents.kind, 'document'), scope, hasPublished))
      .orderBy(desc(documents.createdAt));
    return Promise.all(
      docs.map(async (doc) => {
        const versions = await this.versionsOf(doc.id);
        return Object.assign(toAgreementDto(doc, currentVersion(versions)), {
          status: summarizeStatus(versions),
          isGlobal: doc.workspaceId === null,
        });
      }),
    );
  }

  /**
   * Paginated, sortable, searchable agreements list (initiative `staff-list-query`). Workspace scope
   * lists the workspace's OWN published agreements only (globals excluded — feature 150); admin scope
   * lists global published agreements. Paging/sort/search run in SQL; the page's status is derived in
   * one batched follow-up query (not per-row).
   */
  async listPage(
    actor: Actor,
    query: ListServiceAgreementsPageQuery,
  ): Promise<ServiceAgreementListPageResponse> {
    let scope;
    if (query.workspaceId !== undefined) {
      await this.requireMembership(actor.id, query.workspaceId);
      // Workspace list = the workspace's OWN agreements; globals live on the admin surface and are
      // reachable when attaching/defaulting, not here (feature 150).
      scope = eq(documents.workspaceId, query.workspaceId);
    } else {
      if (!actor.isAdmin) {
        throw new ForbiddenException('Only an admin can list global service agreements');
      }
      scope = isNull(documents.workspaceId);
    }
    const hasPublished = sql`exists (select 1 from ${documentVersions} dv where dv.document_id = ${documents.id} and dv.status = 'published')`;
    const q = query.q?.trim();
    // Feature 217: title moved to the VERSION and became generated, so search and title-sort go
    // through a correlated subquery over the latest version.
    const latestTitle = sql<string>`(SELECT dv.title FROM ${documentVersions} dv
      WHERE dv.document_id = ${documents.id} ORDER BY dv.version_number DESC LIMIT 1)`;
    const search = q !== undefined && q !== '' ? ilike(latestTitle, `%${q}%`) : undefined;
    const where = and(
      eq(documents.type, TYPE),
      eq(documents.kind, 'document'),
      scope,
      hasPublished,
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
    const versionRows =
      docIds.length === 0
        ? []
        : await this.db
            .select({
              documentId: documentVersions.documentId,
              status: documentVersions.status,
              title: documentVersions.title,
              publishedAt: documentVersions.publishedAt,
            })
            .from(documentVersions)
            .where(inArray(documentVersions.documentId, docIds))
            .orderBy(asc(documentVersions.versionNumber));
    const statusByDoc = new Map<string, Array<(typeof versionRows)[number]>>();
    for (const row of versionRows) {
      const list = statusByDoc.get(row.documentId);
      if (list) list.push(row);
      else statusByDoc.set(row.documentId, [row]);
    }
    const items = docs.map((doc) =>
      Object.assign(toAgreementDto(doc, currentVersion(statusByDoc.get(doc.id) ?? [])), {
        status: summarizeStatus(statusByDoc.get(doc.id) ?? []),
        isGlobal: doc.workspaceId === null,
      }),
    );
    return { items, total: totals[0]?.count ?? 0, limit: query.limit, offset: query.offset };
  }

  /** An agreement + its versions + the template to render the editor. */
  async get(actor: Actor, id: string): Promise<ServiceAgreementDetail> {
    const doc = await this.requireAgreementForRead(actor, id);
    const template = await this.templates.resolve(TYPE);
    const versions = await this.versionsOf(id);
    return {
      agreement: toAgreementDto(doc, currentVersion(versions)),
      versions: versions.map(toAgreementVersionDto),
      definition: { schema: template.schema, uischema: template.uischema },
    };
  }

  /**
   * Edit a draft version's content. Drafts only.
   *
   * Feature 217 dropped the `requireServiceEditable` gate ("an attached agreement may only be
   * edited while its service is a draft"): it was derived from `document_references`, so an
   * agreement no longer knows which services use it.
   */
  async updateDraft(
    actor: Actor,
    id: string,
    versionId: string,
    input: UpdateServiceAgreementInput,
  ): Promise<ServiceAgreementVersionResponse> {
    const doc = await this.requireAgreementForWrite(actor, id);
    const version = await this.requireDraftVersion(id, versionId);
    const content = validateContent(doc, input.content);
    const updated = await this.db
      .update(documentVersions)
      .set({ content, revision: sql`${documentVersions.revision} + 1` })
      .where(eq(documentVersions.id, version.id))
      .returning();
    return toAgreementVersionDto(this.orThrow(updated[0]));
  }

  /** Add a new draft version, copying the latest version's content. */
  async addVersion(actor: Actor, id: string): Promise<ServiceAgreementVersionResponse> {
    await this.requireAgreementForWrite(actor, id);
    const template = await this.templates.resolve(TYPE);
    return this.db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, id))
        .orderBy(desc(documentVersions.versionNumber))
        .limit(1);
      const latest = existing[0];
      const next = (latest?.versionNumber ?? 0) + 1;
      const inserted = await tx
        .insert(documentVersions)
        .values({
          documentId: id,
          templateId: template.templateId,
          templateVersionId: template.templateVersionId,
          versionNumber: next,
          content: latest?.content ?? { schema: template.schema, uischema: template.uischema },
        })
        .returning();
      return toAgreementVersionDto(this.orThrow(inserted[0]));
    });
  }

  /** Validate the draft's content shape (400), then demote-then-promote. */
  async publish(
    actor: Actor,
    id: string,
    versionId: string,
  ): Promise<ServiceAgreementVersionResponse> {
    const doc = await this.requireAgreementForWrite(actor, id);
    const version = await this.requireDraftVersion(id, versionId);
    validateContent(doc, version.content);
    return this.db.transaction(async (tx) => {
      // Demote the currently-published version, then promote this draft (≤1 published per document).
      await tx
        .update(documentVersions)
        .set({ archivedAt: sql`now()` })
        .where(and(eq(documentVersions.documentId, id), eq(documentVersions.status, 'published')));
      const published = await tx
        .update(documentVersions)
        .set({ publishedAt: sql`now()` })
        .where(eq(documentVersions.id, versionId))
        .returning();
      return toAgreementVersionDto(this.orThrow(published[0]));
    });
  }

  // ── internals ─────────────────────────────────────────────────────────────────────────────────

  private async versionsOf(documentId: string): Promise<DocumentVersion[]> {
    return this.db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(asc(documentVersions.versionNumber));
  }

  private async requireDraftVersion(
    documentId: string,
    versionId: string,
  ): Promise<DocumentVersion> {
    const rows = await this.db
      .select()
      .from(documentVersions)
      .where(and(eq(documentVersions.id, versionId), eq(documentVersions.documentId, documentId)))
      .limit(1);
    const version = rows[0];
    if (version === undefined) {
      throw new NotFoundException('Service agreement version not found');
    }
    if (version.status !== 'draft') {
      throw new ConflictException('Only draft versions can be edited or published');
    }
    return version;
  }

  private orThrow(row: DocumentVersion | undefined): DocumentVersion {
    if (row === undefined) {
      throw new Error('document version mutation returned no row');
    }
    return row;
  }

  private async loadAgreement(id: string): Promise<Document> {
    const rows = await this.db
      .select()
      .from(documents)
      .where(
        and(eq(documents.id, id), and(eq(documents.type, TYPE), eq(documents.kind, 'document'))),
      )
      .limit(1);
    const doc = rows[0];
    if (doc === undefined) {
      throw new NotFoundException('Service agreement not found');
    }
    return doc;
  }

  /** Read authz: a global agreement is visible to any authenticated caller; a workspace one needs
   * membership (or admin). 404 (existence not leaked) when a workspace agreement is off-limits. */
  private async requireAgreementForRead(actor: Actor, id: string): Promise<Document> {
    const doc = await this.loadAgreement(id);
    if (
      doc.workspaceId !== null &&
      !actor.isAdmin &&
      !(await this.isMember(actor.id, doc.workspaceId))
    ) {
      throw new NotFoundException('Service agreement not found');
    }
    return doc;
  }

  /** Write authz: a global agreement is admin-only (403 — it's visible, so don't 404); a workspace
   * one needs membership (404 otherwise) — admins may write any. */
  private async requireAgreementForWrite(actor: Actor, id: string): Promise<Document> {
    const doc = await this.loadAgreement(id);
    if (doc.workspaceId === null) {
      if (!actor.isAdmin) {
        throw new ForbiddenException('Only an admin can edit a global service agreement');
      }
    } else if (!actor.isAdmin && !(await this.isMember(actor.id, doc.workspaceId))) {
      throw new NotFoundException('Service agreement not found');
    }
    return doc;
  }

  private async isMember(userId: string, workspaceId: string): Promise<boolean> {
    const rows = await this.db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)),
      )
      .limit(1);
    return rows[0] !== undefined;
  }

  /** The caller must be a member of the workspace; 404 otherwise (existence not leaked). */
  async requireMembership(userId: string, workspaceId: string): Promise<void> {
    if (!(await this.isMember(userId, workspaceId))) {
      throw new NotFoundException('Workspace not found');
    }
  }
}
