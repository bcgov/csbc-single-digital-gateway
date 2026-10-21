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
  serviceAgreementConsents,
  workspaceDefaultAgreements,
  workspaceMembers,
  workspaces,
  DOCUMENT_TYPE,
} from '@repo/database';
import { withTitle } from '@repo/documents/content';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { TemplateResolver } from '../../templates/services/template.resolver';
import { assertPublishable, validateContent } from '../../templates/services/validate-content';
import { assertWithinCapabilities } from '../../templates/services/capability-guard';
import {
  type CreateServiceAgreementInput,
  type ServiceAgreementDeletable,
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

const TYPE = DOCUMENT_TYPE.serviceAgreement;

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
    const template = await this.templates.forCreate(TYPE, input.templateId);
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
          // A copy of the template with the requested title on EVERY variant; the GENERATED title column
          // reads the default variant's.
          content: withTitle({ schema: template.schema, variants: template.variants }, input.title),
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
   * lists the workspace's OWN agreements (globals excluded — feature 150); admin scope lists global
   * ones. Paging/sort/search run in SQL; the page's status is derived in one batched follow-up query
   * (not per-row).
   *
   * EVERY status, published or not (doc 83 B1). This is the MANAGEMENT list — the page an agreement is
   * created from — so a draft must appear here or it is written to the database and then invisible.
   * `list` above is the other thing: a picker of agreements to attach, where published-only is right
   * and stays. The two were once the same query, and that is how the picker's rule reached this one.
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
    const q = query.q?.trim();
    // Feature 217: title moved to the VERSION and became generated, so search and title-sort go
    // through a correlated subquery over the latest version.
    const latestTitle = sql<string>`(SELECT dv.title FROM ${documentVersions} dv
      WHERE dv.document_id = ${documents.id} ORDER BY dv.version_number DESC LIMIT 1)`;
    const search = q !== undefined && q !== '' ? ilike(latestTitle, `%${q}%`) : undefined;
    const where = and(eq(documents.type, TYPE), eq(documents.kind, 'document'), scope, search);
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

  /**
   * An agreement + its versions + the template each version renders against.
   *
   * Doc 221: resolved by the PINNED template version, never `forCreate()`. `forCreate()` returns whichever
   * template version is published NOW, which the resolver's own comment (`template.resolver.ts:76-87`)
   * warns makes a version authored before a template reshape render every field empty — and, since
   * doc 220, would let a template author retroactively re-govern documents already built from an
   * earlier version. `forCreate()` remains correct for the CREATE path only.
   */
  async get(actor: Actor, id: string): Promise<ServiceAgreementDetail> {
    const doc = await this.requireAgreementForRead(actor, id);
    const versions = await this.versionsOf(id);
    const definitions = await this.templates.contentsForVersions(
      versions.flatMap((version) => (version.templateVersionId ? [version.templateVersionId] : [])),
    );
    return {
      agreement: toAgreementDto(doc, currentVersion(versions)),
      versions: versions.map(toAgreementVersionDto),
      definitions,
      // Doc 225 rule 7: the console renders its delete control from this, never from its own count.
      deletable: await this.deletableFor(id, versions),
    };
  }

  /**
   * Doc 225 rule 1: the version ids that have recorded consents.
   *
   * CONSENT is what "someone has used this" means for an agreement (doc 225). Nothing links an
   * agreement to a submission — `submissions.document_id` is the FORM, and feature 217 removed
   * `document_references` — while a consent names the exact version a citizen agreed to.
   */
  private async consentedVersionIds(documentId: string): Promise<Set<string>> {
    const rows = await this.db
      .selectDistinct({ versionId: serviceAgreementConsents.agreementVersionId })
      .from(serviceAgreementConsents)
      .where(eq(serviceAgreementConsents.agreementDocumentId, documentId));
    return new Set(rows.map((row) => row.versionId));
  }

  /** Doc 225 rule 3: the workspaces that default to this agreement, by name, for the refusal. */
  private async defaultingWorkspaces(documentId: string): Promise<string[]> {
    const rows = await this.db
      .select({ name: workspaces.name })
      .from(workspaceDefaultAgreements)
      .innerJoin(workspaces, eq(workspaceDefaultAgreements.workspaceId, workspaces.id))
      .where(eq(workspaceDefaultAgreements.agreementDocumentId, documentId));
    return rows.map((row) => row.name);
  }

  /**
   * Doc 225 rule 7: what may be deleted and why not, so the console renders from the API's answer
   * instead of deciding for itself from the versions it happens to hold.
   */
  private async deletableFor(
    documentId: string,
    versions: DocumentVersion[],
  ): Promise<ServiceAgreementDeletable> {
    const [consented, defaulting] = await Promise.all([
      this.consentedVersionIds(documentId),
      this.defaultingWorkspaces(documentId),
    ]);
    // Rule 4: the last version is never deleted on its own — that is deleting the agreement.
    const versionIds =
      versions.length > 1 ? versions.filter((v) => !consented.has(v.id)).map((v) => v.id) : [];
    const reason = this.deletionBlockedBy(consented.size > 0, defaulting);
    return {
      agreement: reason === undefined,
      versionIds,
      ...(reason === undefined ? {} : { reason }),
    };
  }

  /** The one wording for both guards, so the API and the console never disagree about why. */
  private deletionBlockedBy(consented: boolean, defaulting: string[]): string | undefined {
    if (consented)
      return 'Someone has already consented to this agreement, so it can no longer be deleted.';
    if (defaulting.length > 0)
      return `This agreement is a default for ${defaulting.join(', ')}. Remove it there first.`;
    return undefined;
  }

  /**
   * Doc 225 rules 1-5: deletes the whole agreement, cascading its versions, their history and its
   * members (the schema already does that).
   *
   * Refused HERE, with what is in the way — the FK `RESTRICT`s behind this are a backstop, and a
   * constraint violation is a correct refusal with a useless message.
   */
  async remove(actor: Actor, id: string): Promise<void> {
    await this.requireAgreementForWrite(actor, id);
    const [consented, defaulting] = await Promise.all([
      this.consentedVersionIds(id),
      this.defaultingWorkspaces(id),
    ]);
    const reason = this.deletionBlockedBy(consented.size > 0, defaulting);
    if (reason !== undefined) throw new ConflictException(reason);
    await this.db.delete(documents).where(eq(documents.id, id));
  }

  /** Doc 225 rules 1, 4: deletes ONE version, never the last one and never a consented one. */
  async removeVersion(actor: Actor, id: string, versionId: string): Promise<void> {
    await this.requireAgreementForWrite(actor, id);
    const versions = await this.versionsOf(id);
    const version = versions.find((candidate) => candidate.id === versionId);
    if (!version) throw new NotFoundException('Service agreement version not found');
    if (versions.length <= 1)
      throw new ConflictException(
        'This is the only version. Delete the service agreement instead.',
      );
    const consented = await this.consentedVersionIds(id);
    if (consented.has(versionId))
      throw new ConflictException(
        'Someone has already consented to this version, so it can no longer be deleted.',
      );
    await this.db.delete(documentVersions).where(eq(documentVersions.id, versionId));
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
    // Doc 222: the governing template has the final say — the studio's gates are UX, and both the
    // uischema code panel and this endpoint bypass them.
    assertWithinCapabilities(
      version.content,
      content,
      await this.templates.capabilitiesForVersion(version.templateVersionId),
    );
    const updated = await this.db
      .update(documentVersions)
      .set({ content, revision: sql`${documentVersions.revision} + 1` })
      .where(eq(documentVersions.id, version.id))
      .returning();
    return toAgreementVersionDto(this.orThrow(updated[0]));
  }

  /** Add a new draft version, copying the latest version's content. */
  async addVersion(actor: Actor, id: string): Promise<ServiceAgreementVersionResponse> {
    const agreement = await this.requireAgreementForWrite(actor, id);
    // Doc 228: the document's OWN template — the version FK requires the same template_id.
    const template = await this.templates.forDocument(agreement.templateId);
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
          content: latest?.content ?? { schema: template.schema, variants: template.variants },
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
    assertPublishable(validateContent(doc, version.content));
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
