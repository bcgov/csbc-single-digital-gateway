import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  type Database,
  type DocumentReference,
  documentReferences,
  documentTypeVersions,
  documentTypes,
  documentVersions,
  documents,
} from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, asc, eq, sql } from 'drizzle-orm';
import {
  type AddReferenceInput,
  type CreateReferencedFormInput,
  type ReferenceRelation,
  type ReferenceResponse,
} from '../dtos/reference.dtos';
import { ServicesService } from './services.service';

const FORM_KINDS = new Set(['basic-form', 'multi-stage-form']);

function pgCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null) {
    const e = error as { code?: unknown; cause?: { code?: unknown } };
    if (typeof e.code === 'string') return e.code;
    if (e.cause && typeof e.cause.code === 'string') return e.cause.code;
  }
  return undefined;
}

function toDto(
  row: DocumentReference,
  targetTitle: string,
  targetVersion: number,
): ReferenceResponse {
  return {
    id: row.id,
    relation: row.relation,
    position: row.position,
    label: row.label,
    targetDocumentId: row.targetDocumentId,
    targetVersionId: row.targetVersionId,
    targetKind: row.targetKind,
    targetTitle,
    targetVersion,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class ReferencesService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly services: ServicesService,
  ) {}

  /** A service version's references, each resolved to the target's title + version number. */
  async list(userId: string, serviceId: string, versionId: string): Promise<ReferenceResponse[]> {
    await this.services.requireDocument(userId, serviceId);
    await this.requireOwnerVersion(serviceId, versionId);
    const rows = await this.db
      .select({
        ref: documentReferences,
        targetTitle: documents.title,
        targetVersion: documentVersions.version,
      })
      .from(documentReferences)
      .innerJoin(documents, eq(documents.id, documentReferences.targetDocumentId))
      .innerJoin(documentVersions, eq(documentVersions.id, documentReferences.targetVersionId))
      .where(eq(documentReferences.ownerVersionId, versionId))
      .orderBy(asc(documentReferences.relation), asc(documentReferences.position));
    return rows.map((row) => toDto(row.ref, row.targetTitle, row.targetVersion));
  }

  /** Add a reference (owner must be a DRAFT service version). DB enforces kind/workspace/no-dup/no-self. */
  async add(
    userId: string,
    serviceId: string,
    versionId: string,
    input: AddReferenceInput,
  ): Promise<ReferenceResponse> {
    const service = await this.services.requireDocument(userId, serviceId);
    await this.requireDraftOwner(serviceId, versionId);
    const target = await this.loadTargetVersion(input.targetVersionId);

    if (target.workspaceId !== service.workspaceId) {
      throw new BadRequestException('Target document is in a different workspace');
    }
    if (target.documentId === serviceId) {
      throw new BadRequestException('A service cannot reference itself');
    }
    this.assertRelationMatchesKind(input.relation, target.kind);

    try {
      const inserted = await this.db
        .insert(documentReferences)
        .values({
          ownerVersionId: versionId,
          ownerDocumentId: serviceId,
          ownerKind: 'service',
          targetVersionId: input.targetVersionId,
          targetDocumentId: target.documentId,
          targetKind: target.kind,
          workspaceId: service.workspaceId,
          relation: input.relation,
          label: input.label ?? null,
        })
        .returning();
      const row = inserted[0];
      if (row === undefined) {
        throw new Error('reference insert returned no row');
      }
      return toDto(row, target.title, target.version);
    } catch (error) {
      if (pgCode(error) === '23505') {
        throw new ConflictException('This document is already referenced by the service version');
      }
      throw error;
    }
  }

  /** Remove a reference; a form's LAST reference can't be removed (a form must be referenced by ≥1 service). */
  async remove(
    userId: string,
    serviceId: string,
    versionId: string,
    referenceId: string,
  ): Promise<void> {
    await this.services.requireDocument(userId, serviceId);
    await this.requireDraftOwner(serviceId, versionId);
    const ref = await this.requireReference(versionId, referenceId);
    if (ref.relation === 'application_form') {
      const counts = await this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(documentReferences)
        .where(eq(documentReferences.targetDocumentId, ref.targetDocumentId));
      if ((counts[0]?.n ?? 0) <= 1) {
        throw new ConflictException('A form must be referenced by at least one service');
      }
    }
    await this.db.delete(documentReferences).where(eq(documentReferences.id, referenceId));
  }

  /** Create a form document + draft v1 and reference it from this service version (atomic ⇒ form born ≥1). */
  async createForm(
    userId: string,
    serviceId: string,
    versionId: string,
    input: CreateReferencedFormInput,
  ): Promise<ReferenceResponse> {
    const service = await this.services.requireDocument(userId, serviceId);
    await this.requireDraftOwner(serviceId, versionId);
    const type = await this.loadFormType(input.typeId);

    return this.db.transaction(async (tx) => {
      const insertedDoc = await tx
        .insert(documents)
        .values({
          typeId: input.typeId,
          workspaceId: service.workspaceId,
          kind: type.kind,
          title: input.title,
        })
        .returning();
      const formDoc = insertedDoc[0];
      if (formDoc === undefined) {
        throw new Error('form document insert returned no row');
      }
      const insertedVersion = await tx
        .insert(documentVersions)
        .values({
          documentId: formDoc.id,
          typeId: input.typeId,
          typeVersionId: type.typeVersionId,
          version: 1,
        })
        .returning();
      const formVersion = insertedVersion[0];
      if (formVersion === undefined) {
        throw new Error('form version insert returned no row');
      }
      const insertedRef = await tx
        .insert(documentReferences)
        .values({
          ownerVersionId: versionId,
          ownerDocumentId: serviceId,
          ownerKind: 'service',
          targetVersionId: formVersion.id,
          targetDocumentId: formDoc.id,
          targetKind: type.kind,
          workspaceId: service.workspaceId,
          relation: 'application_form',
          label: input.label ?? null,
        })
        .returning();
      const ref = insertedRef[0];
      if (ref === undefined) {
        throw new Error('reference insert returned no row');
      }
      return toDto(ref, input.title, formVersion.version);
    });
  }

  private assertRelationMatchesKind(relation: ReferenceRelation, kind: string): void {
    const ok = relation === 'related_service' ? kind === 'service' : FORM_KINDS.has(kind);
    if (!ok) {
      throw new BadRequestException(`A ${relation} reference cannot target a ${kind} document`);
    }
  }

  private async requireOwnerVersion(
    serviceId: string,
    versionId: string,
  ): Promise<{ status: string }> {
    const rows = await this.db
      .select({ status: documentVersions.status })
      .from(documentVersions)
      .where(and(eq(documentVersions.id, versionId), eq(documentVersions.documentId, serviceId)))
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new NotFoundException('Service version not found');
    }
    return row;
  }

  private async requireDraftOwner(serviceId: string, versionId: string): Promise<void> {
    const owner = await this.requireOwnerVersion(serviceId, versionId);
    if (owner.status !== 'draft') {
      throw new ConflictException('References can only be changed on a draft service version');
    }
  }

  private async loadTargetVersion(targetVersionId: string) {
    const rows = await this.db
      .select({
        documentId: documents.id,
        kind: documents.kind,
        workspaceId: documents.workspaceId,
        title: documents.title,
        version: documentVersions.version,
      })
      .from(documentVersions)
      .innerJoin(documents, eq(documents.id, documentVersions.documentId))
      .where(eq(documentVersions.id, targetVersionId))
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new NotFoundException('Target document version not found');
    }
    return row;
  }

  private async loadFormType(typeId: string) {
    const rows = await this.db
      .select({ kind: documentTypes.kind, typeVersionId: documentTypeVersions.id })
      .from(documentTypes)
      .innerJoin(
        documentTypeVersions,
        and(
          eq(documentTypeVersions.typeId, documentTypes.id),
          eq(documentTypeVersions.status, 'published'),
        ),
      )
      .where(eq(documentTypes.id, typeId))
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new UnprocessableEntityException('Form type not found or has no published version');
    }
    if (!FORM_KINDS.has(row.kind)) {
      throw new BadRequestException('typeId must be a basic-form or multi-stage-form type');
    }
    return row;
  }

  private async requireReference(
    versionId: string,
    referenceId: string,
  ): Promise<DocumentReference> {
    const rows = await this.db
      .select()
      .from(documentReferences)
      .where(
        and(
          eq(documentReferences.id, referenceId),
          eq(documentReferences.ownerVersionId, versionId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new NotFoundException('Reference not found');
    }
    return row;
  }
}
