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
  submissions,
} from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import {
  type AddReferenceInput,
  type CreateReferencedFormInput,
  type ExternalApplicationInput,
  type ReferenceRelation,
  type ReferenceResponse,
} from '../dtos/reference.dtos';
import { formHasStructure, structureFromDefinition } from '../util/applications';
import { ServicesService } from './services.service';

const FORM_KINDS = new Set(['basic-form', 'multi-stage-form']);
const EXTERNAL_KIND = 'external-application';

/** The `data` shape of an external-application document version (feature 131). */
function externalUrl(data: Record<string, unknown> | null | undefined): string | null {
  const url = data?.url;
  return typeof url === 'string' ? url : null;
}

/** application_form / related_service references always pin a version (only service_agreement refs
 * may omit it), so this narrows the now-nullable `target_version_id` for those relations. */
function pinnedVersion(value: string | null, what: string): string {
  if (value === null) {
    throw new Error(`${what} is unexpectedly null`);
  }
  return value;
}

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
  targetStatus: string,
  hasSubmissions: boolean,
  hasStructure: boolean,
  url: string | null,
): ReferenceResponse {
  return {
    // `list` filters to application methods + related services, so the widened enum (which also
    // carries service_agreement) never reaches this mapper.
    relation: row.relation as ReferenceResponse['relation'],
    id: row.id,
    position: row.position,
    label: row.label,
    url,
    targetDocumentId: row.targetDocumentId,
    targetVersionId: pinnedVersion(row.targetVersionId, 'reference target_version_id'),
    targetKind: row.targetKind,
    targetTitle,
    targetVersion,
    targetStatus,
    hasSubmissions,
    hasStructure,
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
        targetStatus: documentVersions.status,
        targetSchema: documentVersions.schema,
        targetData: documentVersions.data,
        hasSubmissions: sql<boolean>`exists (select 1 from ${submissions} where ${submissions.documentId} = ${documentReferences.targetDocumentId})`,
      })
      .from(documentReferences)
      .innerJoin(documents, eq(documents.id, documentReferences.targetDocumentId))
      .innerJoin(documentVersions, eq(documentVersions.id, documentReferences.targetVersionId))
      // Application-method references (forms + external links) and related services. Service-agreement
      // references (feature 86) have their own surface and are excluded here.
      .where(
        and(
          eq(documentReferences.ownerVersionId, versionId),
          inArray(documentReferences.relation, [
            'related_service',
            'application_form',
            'external_application',
          ]),
        ),
      )
      .orderBy(asc(documentReferences.relation), asc(documentReferences.position));
    return rows.map((row) => {
      const isExternal = row.ref.targetKind === EXTERNAL_KIND;
      return toDto(
        row.ref,
        row.targetTitle,
        row.targetVersion,
        row.targetStatus,
        row.hasSubmissions,
        // An external method has no form structure; it's a valid method once it has a url.
        isExternal ? true : formHasStructure(row.ref.targetKind, row.targetSchema),
        isExternal ? externalUrl(row.targetData) : null,
      );
    });
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
          // Legacy relations (forms/related services) are always same-workspace.
          targetWorkspaceId: service.workspaceId,
          relation: input.relation,
          label: input.label ?? null,
        })
        .returning();
      const row = inserted[0];
      if (row === undefined) {
        throw new Error('reference insert returned no row');
      }
      return toDto(row, target.title, target.version, 'draft', false, false, null);
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

    // Related-service references point at a shared, independently-owned document — just unlink.
    if (ref.relation === 'related_service') {
      await this.db.delete(documentReferences).where(eq(documentReferences.id, referenceId));
      return;
    }

    // Application-method targets (forms + external links) are owned by the service: if other service
    // versions still reference the same target, only unlink here; if this is the LAST reference the
    // target document is deleted with it.
    const refRows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(documentReferences)
      .where(eq(documentReferences.targetDocumentId, ref.targetDocumentId));
    if ((refRows[0]?.n ?? 0) > 1) {
      await this.db.delete(documentReferences).where(eq(documentReferences.id, referenceId));
      return;
    }
    // A form with submissions can't be deleted — archive it instead (external methods never have
    // submissions, so this only ever gates forms).
    if (ref.relation === 'application_form') {
      const submissionRows = await this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(submissions)
        .where(eq(submissions.documentId, ref.targetDocumentId));
      if ((submissionRows[0]?.n ?? 0) > 0) {
        throw new ConflictException(
          'This form has submissions — archive it instead of deleting it',
        );
      }
    }
    await this.db.transaction(async (tx) => {
      await tx.delete(documentReferences).where(eq(documentReferences.id, referenceId));
      // Deleting the target document cascades its versions; no submissions remain to block it.
      await tx.delete(documents).where(eq(documents.id, ref.targetDocumentId));
    });
  }

  /** Archive an application-method form (set archived_at on its version) — for forms WITH submissions
   * that can't be deleted. The reference stays; the method shows as archived. */
  async archive(
    userId: string,
    serviceId: string,
    versionId: string,
    referenceId: string,
  ): Promise<void> {
    await this.services.requireDocument(userId, serviceId);
    await this.requireDraftOwner(serviceId, versionId);
    const ref = await this.requireReference(versionId, referenceId);
    if (ref.relation !== 'application_form') {
      throw new BadRequestException('Only application-method forms can be archived');
    }
    await this.db
      .update(documentVersions)
      .set({ archivedAt: new Date() })
      .where(eq(documentVersions.id, pinnedVersion(ref.targetVersionId, 'form target_version_id')));
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
          // Prefer a builder-authored definition; otherwise copy the type template. `data` stays default.
          schema: input.definition ?? structureFromDefinition(type.kind, type.definition),
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
          // A newly-created application form lives in the service's workspace.
          targetWorkspaceId: service.workspaceId,
          relation: 'application_form',
          label: input.label ?? null,
        })
        .returning();
      const ref = insertedRef[0];
      if (ref === undefined) {
        throw new Error('reference insert returned no row');
      }
      return toDto(ref, input.title, formVersion.version, 'draft', false, false, null);
    });
  }

  /** Create an external-application document + v1 (data `{ label, url }`) and reference it from this
   * service version (atomic) — the external analogue of `createForm` (feature 131). */
  async createExternal(
    userId: string,
    serviceId: string,
    versionId: string,
    input: ExternalApplicationInput,
  ): Promise<ReferenceResponse> {
    const service = await this.services.requireDocument(userId, serviceId);
    await this.requireDraftOwner(serviceId, versionId);
    const type = await this.loadExternalType();

    return this.db.transaction(async (tx) => {
      const insertedDoc = await tx
        .insert(documents)
        .values({
          typeId: type.typeId,
          workspaceId: service.workspaceId,
          kind: EXTERNAL_KIND,
          title: input.label,
        })
        .returning();
      const extDoc = insertedDoc[0];
      if (extDoc === undefined) {
        throw new Error('external application document insert returned no row');
      }
      const insertedVersion = await tx
        .insert(documentVersions)
        .values({
          documentId: extDoc.id,
          typeId: type.typeId,
          typeVersionId: type.typeVersionId,
          version: 1,
          // The external method's content lives in `data`; it has no form structure (`schema` NULL).
          data: { label: input.label, url: input.url },
        })
        .returning();
      const extVersion = insertedVersion[0];
      if (extVersion === undefined) {
        throw new Error('external application version insert returned no row');
      }
      const insertedRef = await tx
        .insert(documentReferences)
        .values({
          ownerVersionId: versionId,
          ownerDocumentId: serviceId,
          ownerKind: 'service',
          targetVersionId: extVersion.id,
          targetDocumentId: extDoc.id,
          targetKind: EXTERNAL_KIND,
          workspaceId: service.workspaceId,
          targetWorkspaceId: service.workspaceId,
          relation: 'external_application',
          label: input.label,
        })
        .returning();
      const ref = insertedRef[0];
      if (ref === undefined) {
        throw new Error('reference insert returned no row');
      }
      return toDto(ref, input.label, extVersion.version, 'draft', false, true, input.url);
    });
  }

  /** Edit an external method's label + url (draft owner only): update the target document title and
   * its version `data`. The reference's `label` mirror is kept in sync. */
  async updateExternal(
    userId: string,
    serviceId: string,
    versionId: string,
    referenceId: string,
    input: ExternalApplicationInput,
  ): Promise<ReferenceResponse> {
    await this.services.requireDocument(userId, serviceId);
    await this.requireDraftOwner(serviceId, versionId);
    const ref = await this.requireReference(versionId, referenceId);
    if (ref.relation !== 'external_application') {
      throw new BadRequestException('Not an external application method');
    }
    const targetVersionId = pinnedVersion(ref.targetVersionId, 'external target_version_id');

    const updated = await this.db.transaction(async (tx) => {
      await tx
        .update(documents)
        .set({ title: input.label })
        .where(eq(documents.id, ref.targetDocumentId));
      const versionRows = await tx
        .update(documentVersions)
        .set({ data: { label: input.label, url: input.url } })
        .where(eq(documentVersions.id, targetVersionId))
        .returning();
      const rows = await tx
        .update(documentReferences)
        .set({ label: input.label })
        .where(eq(documentReferences.id, referenceId))
        .returning();
      return { ref: rows[0], version: versionRows[0] };
    });
    if (updated.ref === undefined || updated.version === undefined) {
      throw new Error('external application update returned no row');
    }
    return toDto(
      updated.ref,
      input.label,
      updated.version.version,
      'draft',
      false,
      true,
      input.url,
    );
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
      .select({
        kind: documentTypes.kind,
        typeVersionId: documentTypeVersions.id,
        definition: documentTypeVersions.definition,
      })
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

  /** The published external-application type (its id + published version id) — 422 if unseeded. */
  private async loadExternalType(): Promise<{ typeId: string; typeVersionId: string }> {
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
      .where(eq(documentTypes.kind, EXTERNAL_KIND))
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new UnprocessableEntityException(
        'External application type not found or has no published version',
      );
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
