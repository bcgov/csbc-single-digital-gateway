import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  type Database,
  documentReferences,
  documentTypeVersions,
  documentTypes,
  documentVersions,
  documents,
} from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { AgreementRefResponse } from '../dtos/agreement-ref.dtos';
import { ServicesService } from './services.service';

const AGREEMENT_KIND = 'service-agreement';

/** Default authored data for a newly-created draft agreement (mirrors the type definition defaults). */
const DEFAULT_AGREEMENT_DATA = {
  title: 'Untitled service agreement',
  description: '',
  content: {},
  isOptional: false,
  approveLabel: 'Approve',
  rejectLabel: 'Reject',
};

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
        targetVersionId: agreement.versionId,
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
      agreementVersionId: agreement.versionId,
      title: agreement.title,
      isOptional: agreement.isOptional,
      isGlobal: agreement.workspaceId === null,
      position: row.position,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /** Create a NEW draft workspace agreement (in the service's workspace) and attach it, atomically.
   * Mirrors createForm for application methods — the agreement is authored/published afterwards, and
   * the service publish gate requires it published. */
  async createAndAttach(
    userId: string,
    serviceId: string,
    versionId: string,
  ): Promise<AgreementRefResponse> {
    const service = await this.services.requireDocument(userId, serviceId);
    await this.requireDraftOwner(serviceId, versionId);
    const type = await this.resolveAgreementType();
    return this.db.transaction(async (tx) => {
      const docRows = await tx
        .insert(documents)
        .values({
          typeId: type.typeId,
          workspaceId: service.workspaceId,
          kind: AGREEMENT_KIND,
          title: DEFAULT_AGREEMENT_DATA.title,
        })
        .returning();
      const doc = docRows[0];
      if (doc === undefined) {
        throw new Error('agreement document insert returned no row');
      }
      const verRows = await tx
        .insert(documentVersions)
        .values({
          documentId: doc.id,
          typeId: type.typeId,
          typeVersionId: type.typeVersionId,
          version: 1,
          data: DEFAULT_AGREEMENT_DATA,
        })
        .returning();
      const ver = verRows[0];
      if (ver === undefined) {
        throw new Error('agreement version insert returned no row');
      }
      const position = await this.nextPosition(versionId);
      const refRows = await tx
        .insert(documentReferences)
        .values({
          ownerVersionId: versionId,
          ownerDocumentId: serviceId,
          ownerKind: 'service',
          targetVersionId: ver.id,
          targetDocumentId: doc.id,
          targetKind: AGREEMENT_KIND,
          workspaceId: service.workspaceId,
          targetWorkspaceId: service.workspaceId,
          relation: 'service_agreement',
          position,
        })
        .returning();
      const ref = refRows[0];
      if (ref === undefined) {
        throw new Error('agreement reference insert returned no row');
      }
      return {
        id: ref.id,
        agreementDocumentId: doc.id,
        agreementVersionId: ver.id,
        title: doc.title,
        isOptional: DEFAULT_AGREEMENT_DATA.isOptional,
        isGlobal: false,
        position: ref.position,
        createdAt: ref.createdAt.toISOString(),
      };
    });
  }

  /** Detach an agreement from a service draft version. */
  async detach(
    userId: string,
    serviceId: string,
    versionId: string,
    referenceId: string,
  ): Promise<void> {
    await this.services.requireDocument(userId, serviceId);
    await this.requireDraftOwner(serviceId, versionId);
    const deleted = await this.db
      .delete(documentReferences)
      .where(
        and(
          eq(documentReferences.id, referenceId),
          eq(documentReferences.ownerVersionId, versionId),
          eq(documentReferences.relation, 'service_agreement'),
        ),
      )
      .returning({ id: documentReferences.id });
    if (deleted[0] === undefined) {
      throw new NotFoundException('Agreement reference not found');
    }
  }

  /** List the agreements attached to a service version, resolved to title/is-optional/scope. */
  async list(
    userId: string,
    serviceId: string,
    versionId: string,
  ): Promise<AgreementRefResponse[]> {
    await this.services.requireDocument(userId, serviceId);
    const rows = await this.db
      .select({
        id: documentReferences.id,
        agreementDocumentId: documentReferences.targetDocumentId,
        agreementVersionId: documentReferences.targetVersionId,
        title: documents.title,
        data: documentVersions.data,
        targetWorkspaceId: documentReferences.targetWorkspaceId,
        position: documentReferences.position,
        createdAt: documentReferences.createdAt,
      })
      .from(documentReferences)
      .innerJoin(documents, eq(documents.id, documentReferences.targetDocumentId))
      .innerJoin(documentVersions, eq(documentVersions.id, documentReferences.targetVersionId))
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
      agreementVersionId: row.agreementVersionId,
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

  /** The seeded Service Agreement type + its published type-version (new drafts bind to it). */
  private async resolveAgreementType(): Promise<{ typeId: string; typeVersionId: string }> {
    const rows = await this.db
      .select({ typeId: documentTypes.id, typeVersionId: documentTypeVersions.id })
      .from(documentTypes)
      .innerJoin(
        documentTypeVersions,
        and(
          eq(documentTypeVersions.typeId, documentTypes.id),
          eq(documentTypeVersions.status, 'published'),
        ),
      )
      .where(eq(documentTypes.kind, AGREEMENT_KIND))
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new Error('Service Agreement type is not seeded or has no published version');
    }
    return { typeId: row.typeId, typeVersionId: row.typeVersionId };
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
