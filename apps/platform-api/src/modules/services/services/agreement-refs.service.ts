import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { type Database, documentReferences, documentVersions, documents } from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { AgreementRefResponse } from '../dtos/agreement-ref.dtos';
import { ServicesService } from './services.service';

const AGREEMENT_KIND = 'service-agreement';

interface ResolvedAgreement {
  documentId: string;
  versionId: string;
  title: string;
  isOptional: boolean;
  workspaceId: string | null;
}

/** Attach/detach/list service-agreement references on a service DRAFT version (feature 86). */
@Injectable()
export class AgreementRefsService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly services: ServicesService,
  ) {}

  /** Attach a published agreement (workspace or global) to a service draft version. */
  async attach(
    userId: string,
    serviceId: string,
    versionId: string,
    agreementDocumentId: string,
  ): Promise<AgreementRefResponse> {
    const service = await this.services.requireDocument(userId, serviceId);
    await this.requireDraftOwner(serviceId, versionId);
    const agreement = await this.resolvePublishedAgreement(agreementDocumentId);

    // Relaxed same-workspace rule: a global (workspace-NULL) agreement OR one in the owner's workspace.
    if (agreement.workspaceId !== null && agreement.workspaceId !== service.workspaceId) {
      throw new BadRequestException('Agreement is in a different workspace');
    }
    const already = await this.db
      .select({ id: documentReferences.id })
      .from(documentReferences)
      .where(
        and(
          eq(documentReferences.ownerVersionId, versionId),
          eq(documentReferences.targetDocumentId, agreementDocumentId),
        ),
      )
      .limit(1);
    if (already[0] !== undefined) {
      throw new ConflictException('Agreement is already attached to this service version');
    }

    const position = await this.nextPosition(versionId);
    const inserted = await this.db
      .insert(documentReferences)
      .values({
        ownerVersionId: versionId,
        ownerDocumentId: serviceId,
        ownerKind: 'service',
        // Document-only pointer: no version pin — the agreement resolves current-published at read time.
        targetVersionId: null,
        targetDocumentId: agreement.documentId,
        targetKind: AGREEMENT_KIND,
        workspaceId: service.workspaceId,
        // NULL for a global agreement; the owner's workspace for a scoped one.
        targetWorkspaceId: agreement.workspaceId,
        relation: 'service_agreement',
        position,
      })
      .returning();
    const row = inserted[0];
    if (row === undefined) {
      throw new Error('agreement reference insert returned no row');
    }
    return {
      id: row.id,
      agreementDocumentId: agreement.documentId,
      title: agreement.title,
      isOptional: agreement.isOptional,
      isGlobal: agreement.workspaceId === null,
      position: row.position,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /** Detach an agreement from a service draft version. If the agreement is a draft (never published)
   * with no remaining references, it was only ever created for this service — delete it too. */
  async detach(
    userId: string,
    serviceId: string,
    versionId: string,
    referenceId: string,
  ): Promise<void> {
    await this.services.requireDocument(userId, serviceId);
    await this.requireDraftOwner(serviceId, versionId);
    await this.db.transaction(async (tx) => {
      const deleted = await tx
        .delete(documentReferences)
        .where(
          and(
            eq(documentReferences.id, referenceId),
            eq(documentReferences.ownerVersionId, versionId),
            eq(documentReferences.relation, 'service_agreement'),
          ),
        )
        .returning({ agreementId: documentReferences.targetDocumentId });
      const row = deleted[0];
      if (row === undefined) {
        throw new NotFoundException('Agreement reference not found');
      }
      const remaining = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(documentReferences)
        .where(eq(documentReferences.targetDocumentId, row.agreementId));
      const published = await tx
        .select({ id: documentVersions.id })
        .from(documentVersions)
        .where(
          and(
            eq(documentVersions.documentId, row.agreementId),
            eq(documentVersions.status, 'published'),
          ),
        )
        .limit(1);
      if ((remaining[0]?.n ?? 0) === 0 && published[0] === undefined) {
        // Orphaned draft agreement (created for this service, never published) — remove it (cascades
        // its versions). Published or still-referenced agreements are kept.
        await tx.delete(documents).where(eq(documents.id, row.agreementId));
      }
    });
  }

  /** List the agreements attached to a service version, resolved to title/is-optional/scope. */
  async list(
    userId: string,
    serviceId: string,
    versionId: string,
  ): Promise<AgreementRefResponse[]> {
    await this.services.requireDocument(userId, serviceId);
    // A service_agreement reference is document-only; resolve each agreement's CURRENT published
    // version (by document id) for its title/is-optional — the same way the citizen gate resolves it.
    const rows = await this.db
      .select({
        id: documentReferences.id,
        agreementDocumentId: documentReferences.targetDocumentId,
        title: documents.title,
        data: documentVersions.data,
        targetWorkspaceId: documentReferences.targetWorkspaceId,
        position: documentReferences.position,
        createdAt: documentReferences.createdAt,
      })
      .from(documentReferences)
      .innerJoin(documents, eq(documents.id, documentReferences.targetDocumentId))
      .innerJoin(
        documentVersions,
        and(
          eq(documentVersions.documentId, documentReferences.targetDocumentId),
          eq(documentVersions.status, 'published'),
        ),
      )
      .where(
        and(
          eq(documentReferences.ownerVersionId, versionId),
          eq(documentReferences.relation, 'service_agreement'),
        ),
      )
      .orderBy(asc(documentReferences.position));
    return rows.map((row) => ({
      id: row.id,
      agreementDocumentId: row.agreementDocumentId,
      title: row.title,
      isOptional: row.data.isOptional === true,
      isGlobal: row.targetWorkspaceId === null,
      position: row.position,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  /** Resolve a service-agreement document's currently-published version (422 if none / not an agreement). */
  private async resolvePublishedAgreement(documentId: string): Promise<ResolvedAgreement> {
    const rows = await this.db
      .select({
        documentId: documents.id,
        title: documents.title,
        workspaceId: documents.workspaceId,
        versionId: documentVersions.id,
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
      .where(and(eq(documents.id, documentId), eq(documents.kind, AGREEMENT_KIND)))
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new UnprocessableEntityException(
        'Not a published service agreement (publish the agreement before attaching it)',
      );
    }
    return {
      documentId: row.documentId,
      versionId: row.versionId,
      title: row.title,
      isOptional: row.data.isOptional === true,
      workspaceId: row.workspaceId,
    };
  }

  /** The owner service version must exist and be a draft (attachments are edited on the draft). */
  private async requireDraftOwner(serviceId: string, versionId: string): Promise<void> {
    const rows = await this.db
      .select({ status: documentVersions.status })
      .from(documentVersions)
      .where(and(eq(documentVersions.id, versionId), eq(documentVersions.documentId, serviceId)))
      .limit(1);
    const version = rows[0];
    if (version === undefined) {
      throw new NotFoundException('Service version not found');
    }
    if (version.status !== 'draft') {
      throw new ConflictException('Agreements can only be attached to a draft version');
    }
  }

  private async nextPosition(versionId: string): Promise<number> {
    const rows = await this.db
      .select({ max: sql<number>`coalesce(max(${documentReferences.position}), -1)::int` })
      .from(documentReferences)
      .where(
        and(
          eq(documentReferences.ownerVersionId, versionId),
          eq(documentReferences.relation, 'service_agreement'),
        ),
      );
    return (rows[0]?.max ?? -1) + 1;
  }
}
