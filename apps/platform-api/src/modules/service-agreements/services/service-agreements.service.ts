import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  type Database,
  type Document,
  type DocumentVersion,
  documentReferences,
  documentVersions,
  documents,
  workspaceMembers,
  workspaces,
} from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import {
  type AssociatedService,
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
import { validateData } from '../util/validate-data';
import { ServiceAgreementTypeResolver } from './service-agreement-type.resolver';

const KIND = 'service-agreement';

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

function titleFromData(data: Record<string, unknown>): string {
  return typeof data.title === 'string' && data.title.trim() !== ''
    ? data.title
    : 'Untitled service agreement';
}

@Injectable()
export class ServiceAgreementsService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly agreementType: ServiceAgreementTypeResolver,
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
    const type = await this.agreementType.resolve();
    return this.db.transaction(async (tx) => {
      const insertedDoc = await tx
        .insert(documents)
        .values({ typeId: type.typeId, workspaceId, kind: KIND, title: titleFromData(input.data) })
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
          data: input.data,
        })
        .returning();
      const version = insertedVersion[0];
      if (version === undefined) {
        throw new Error('document version insert returned no row');
      }
      return { agreement: toAgreementDto(doc), version: toAgreementVersionDto(version) };
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
      .where(and(eq(documents.kind, KIND), scope, hasPublished))
      .orderBy(desc(documents.createdAt));
    return Promise.all(
      docs.map(async (doc) => {
        const versions = await this.versionsOf(doc.id);
        return Object.assign(toAgreementDto(doc), {
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
    const search = q !== undefined && q !== '' ? ilike(documents.title, `%${q}%`) : undefined;
    const where = and(eq(documents.kind, KIND), scope, hasPublished, search);
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
    const versionRows =
      docIds.length === 0
        ? []
        : await this.db
            .select({ documentId: documentVersions.documentId, status: documentVersions.status })
            .from(documentVersions)
            .where(inArray(documentVersions.documentId, docIds));
    const statusByDoc = new Map<string, Array<{ status: 'draft' | 'published' | 'archived' }>>();
    for (const row of versionRows) {
      const list = statusByDoc.get(row.documentId);
      if (list) list.push(row);
      else statusByDoc.set(row.documentId, [row]);
    }
    const items = docs.map((doc) =>
      Object.assign(toAgreementDto(doc), {
        status: summarizeStatus(statusByDoc.get(doc.id) ?? []),
        isGlobal: doc.workspaceId === null,
      }),
    );
    return { items, total: totals[0]?.count ?? 0, limit: query.limit, offset: query.offset };
  }

  /** An agreement + its versions + the type definition to render the editor. */
  async get(actor: Actor, id: string): Promise<ServiceAgreementDetail> {
    const doc = await this.requireAgreementForRead(actor, id);
    const type = await this.agreementType.resolve();
    const versions = await this.versionsOf(id);
    return {
      agreement: toAgreementDto(doc),
      versions: versions.map(toAgreementVersionDto),
      definition: { schema: type.schema, uischema: type.uischema },
      services: await this.associatedServices(actor, id),
    };
  }

  /** The distinct services this agreement is attached to. Non-admins only see services in a
   * workspace they belong to (so a global agreement never leaks cross-workspace service titles). */
  private async associatedServices(
    actor: Actor,
    agreementId: string,
  ): Promise<AssociatedService[]> {
    const memberScoped = actor.isAdmin
      ? undefined
      : sql`exists (select 1 from ${workspaceMembers} wm where wm.workspace_id = ${documents.workspaceId} and wm.user_id = ${actor.id})`;
    return this.db
      .selectDistinct({
        id: documents.id,
        title: documents.title,
        workspaceSlug: workspaces.slug,
      })
      .from(documentReferences)
      .innerJoin(
        documents,
        and(eq(documents.id, documentReferences.ownerDocumentId), eq(documents.kind, 'service')),
      )
      .innerJoin(workspaces, eq(workspaces.id, documents.workspaceId))
      .where(
        and(
          eq(documentReferences.targetDocumentId, agreementId),
          eq(documentReferences.relation, 'service_agreement'),
          ...(memberScoped ? [memberScoped] : []),
        ),
      )
      .orderBy(asc(documents.title));
  }

  /** Edit a draft version's authored data (+ optional title sync). Drafts only. */
  async updateDraft(
    actor: Actor,
    id: string,
    versionId: string,
    input: UpdateServiceAgreementInput,
  ): Promise<ServiceAgreementVersionResponse> {
    await this.requireAgreementForWrite(actor, id);
    const version = await this.requireDraftVersion(id, versionId);
    await this.requireServiceEditable(version.id);
    const updated = await this.db
      .update(documentVersions)
      .set({ data: input.data })
      .where(eq(documentVersions.id, version.id))
      .returning();
    const title = input.title ?? titleFromData(input.data);
    await this.db.update(documents).set({ title }).where(eq(documents.id, id));
    return toAgreementVersionDto(this.orThrow(updated[0]));
  }

  /** Add a new draft version, copying the latest version's data. */
  async addVersion(actor: Actor, id: string): Promise<ServiceAgreementVersionResponse> {
    await this.requireAgreementForWrite(actor, id);
    const type = await this.agreementType.resolve();
    return this.db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, id))
        .orderBy(desc(documentVersions.version))
        .limit(1);
      const latest = existing[0];
      const next = (latest?.version ?? 0) + 1;
      const inserted = await tx
        .insert(documentVersions)
        .values({
          documentId: id,
          typeId: type.typeId,
          typeVersionId: type.typeVersionId,
          version: next,
          data: latest?.data ?? {},
        })
        .returning();
      return toAgreementVersionDto(this.orThrow(inserted[0]));
    });
  }

  /** Validate the draft's data against the type schema (422), then demote-then-promote. */
  async publish(
    actor: Actor,
    id: string,
    versionId: string,
  ): Promise<ServiceAgreementVersionResponse> {
    await this.requireAgreementForWrite(actor, id);
    const version = await this.requireDraftVersion(id, versionId);
    const schema = await this.agreementType.schemaForVersion(version.typeVersionId);
    const result = validateData(schema, version.data);
    if (!result.valid) {
      throw new UnprocessableEntityException({
        message: 'Service agreement data failed validation',
        errors: result.errors,
      });
    }
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
      .orderBy(asc(documentVersions.version));
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

  /** When an agreement version is referenced by a service version, it may only be edited while that
   * service version is a draft (the agreement follows the service's lifecycle). Standalone agreements
   * (no service owner) are unaffected. */
  private async requireServiceEditable(agreementVersionId: string): Promise<void> {
    const rows = await this.db
      .select({ status: documentVersions.status })
      .from(documentReferences)
      .innerJoin(documentVersions, eq(documentVersions.id, documentReferences.ownerVersionId))
      .where(
        and(
          eq(documentReferences.targetVersionId, agreementVersionId),
          eq(documentReferences.relation, 'service_agreement'),
        ),
      )
      .limit(1);
    const owner = rows[0];
    if (owner !== undefined && owner.status !== 'draft') {
      throw new ConflictException(
        'This agreement can only be edited while its service is in draft',
      );
    }
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
      .where(and(eq(documents.id, id), eq(documents.kind, KIND)))
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
