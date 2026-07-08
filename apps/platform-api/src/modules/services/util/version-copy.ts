import { ConflictException, NotFoundException } from '@nestjs/common';
import { documentReferences, documentVersions, documents } from '@repo/database';
import { and, desc, eq, inArray, isNotNull, or, sql } from 'drizzle-orm';
import type { Tx } from './applications';

/** A previous-published-version agreement reference (the revert target). */
export interface AgreementRefSnapshot {
  position: number;
  data: unknown;
  targetDocumentId: string;
  targetVersionId: string;
}
/** A current draft version's agreement reference (a deep-copy candidate for revert). */
export interface CurrentAgreementRef extends AgreementRefSnapshot {
  refId: string;
}
/** A revert instruction: re-point `refId` to the previous version, delete the copied document. */
export interface AgreementRevert {
  refId: string;
  copiedDocumentId: string;
  previousDocumentId: string;
  previousVersionId: string;
}

/**
 * Pure planner for revert-if-unchanged of deep-copied service agreements. Pairs each current draft
 * agreement copy to the previously-published service version's agreement ref by `position`
 * (agreements have no `label`); an unchanged copy (byte-identical `data`) is reverted to the previous
 * version so publishing doesn't create a redundant agreement version.
 */
export function planAgreementReverts(
  current: CurrentAgreementRef[],
  previous: AgreementRefSnapshot[],
): AgreementRevert[] {
  const previousByPosition = new Map(previous.map((p) => [p.position, p]));
  const reverts: AgreementRevert[] = [];
  for (const cur of current) {
    const match = previousByPosition.get(cur.position);
    if (match === undefined || JSON.stringify(cur.data) !== JSON.stringify(match.data)) {
      continue;
    }
    reverts.push({
      refId: cur.refId,
      copiedDocumentId: cur.targetDocumentId,
      previousDocumentId: match.targetDocumentId,
      previousVersionId: match.targetVersionId,
    });
  }
  return reverts;
}

/** Reactivate an archived service: clear `archived_at` on the LATEST version (→ its prior published/
 * draft state) and the application forms it references. Older versions stay archived as history. */
export async function reactivateServiceTx(tx: Tx, id: string): Promise<void> {
  const latest = (
    await tx
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, id))
      .orderBy(desc(documentVersions.version))
      .limit(1)
  )[0];
  if (latest === undefined) {
    throw new NotFoundException('Service not found');
  }
  if (latest.status !== 'archived') {
    throw new ConflictException('Only archived services can be reactivated');
  }
  const formVersionIds = (
    await tx
      .select({ vid: documentReferences.targetVersionId })
      .from(documentReferences)
      .where(
        and(
          eq(documentReferences.ownerVersionId, latest.id),
          eq(documentReferences.relation, 'application_form'),
        ),
      )
  ).map((r) => r.vid);
  await tx
    .update(documentVersions)
    .set({ archivedAt: null })
    .where(inArray(documentVersions.id, [latest.id, ...formVersionIds]));
}

function one<T>(rows: T[], what: string): T {
  const row = rows[0];
  if (row === undefined) {
    throw new Error(`${what} returned no row`);
  }
  return row;
}

/** Delete a (draft) service version and the application forms it owned that nothing else references.
 * Refuses to discard a service's only version (delete the service instead). */
export async function discardVersionTx(
  tx: Tx,
  serviceId: string,
  versionId: string,
): Promise<void> {
  const counts = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(documentVersions)
    .where(eq(documentVersions.documentId, serviceId));
  if ((counts[0]?.n ?? 0) <= 1) {
    throw new ConflictException('Delete the service instead of discarding its only version');
  }
  // Deep-copied targets this version owns: application forms (always) + WORKSPACE service agreements.
  // Globals (targetWorkspaceId NULL) are shared/admin-owned and never candidates for deletion.
  const copyDocIds = (
    await tx
      .select({ docId: documentReferences.targetDocumentId })
      .from(documentReferences)
      .where(
        and(
          eq(documentReferences.ownerVersionId, versionId),
          or(
            eq(documentReferences.relation, 'application_form'),
            and(
              eq(documentReferences.relation, 'service_agreement'),
              isNotNull(documentReferences.targetWorkspaceId),
            ),
          ),
        ),
      )
  ).map((r) => r.docId);
  // Deleting the version cascades the references it owns; the deep-copied targets are then orphaned.
  await tx.delete(documentVersions).where(eq(documentVersions.id, versionId));
  for (const docId of copyDocIds) {
    // eslint-disable-next-line no-await-in-loop -- sequential reads/writes share one tx connection
    const remaining = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(documentReferences)
      .where(eq(documentReferences.targetDocumentId, docId));
    // eslint-disable-next-line no-await-in-loop -- sequential reads/writes share one tx connection
    const published = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(documentVersions)
      .where(and(eq(documentVersions.documentId, docId), eq(documentVersions.status, 'published')));
    // Delete only orphaned pure-draft copies. An attached-existing agreement that was ever published
    // (has a published version) is shared — leave it even if this was its last reference.
    if ((remaining[0]?.n ?? 0) === 0 && (published[0]?.n ?? 0) === 0) {
      // eslint-disable-next-line no-await-in-loop -- sequential reads/writes share one tx connection
      await tx.delete(documents).where(eq(documents.id, docId));
    }
  }
}

/**
 * Copy a service version's references onto a NEW version. Application-method forms are deep-copied
 * (new form document + fresh draft version) so each service version edits its own forms; other
 * references (e.g. related services) are copied as-is.
 */
export async function copyReferences(
  tx: Tx,
  source: { sourceVersionId: string; newVersionId: string; serviceId: string; workspaceId: string },
): Promise<void> {
  const sources = await tx
    .select({
      relation: documentReferences.relation,
      label: documentReferences.label,
      position: documentReferences.position,
      targetKind: documentReferences.targetKind,
      targetDocumentId: documentReferences.targetDocumentId,
      targetVersionId: documentReferences.targetVersionId,
      targetWorkspaceId: documentReferences.targetWorkspaceId,
      formTitle: documents.title,
      formKind: documents.kind,
      formTypeId: documentVersions.typeId,
      formTypeVersionId: documentVersions.typeVersionId,
      formSchema: documentVersions.schema,
      srcData: documentVersions.data,
    })
    .from(documentReferences)
    .innerJoin(documents, eq(documents.id, documentReferences.targetDocumentId))
    .innerJoin(documentVersions, eq(documentVersions.id, documentReferences.targetVersionId))
    .where(eq(documentReferences.ownerVersionId, source.sourceVersionId));

  for (const src of sources) {
    let targetDocumentId = src.targetDocumentId;
    let targetVersionId = src.targetVersionId;
    // Deep-copy application forms (always) and WORKSPACE service agreements (globals stay shared)
    // into a fresh draft the new service version owns. Forms carry their structure in `schema`;
    // agreements carry authored content in `data`.
    const deepCopy =
      src.relation === 'application_form' ||
      (src.relation === 'service_agreement' && src.targetWorkspaceId !== null);
    if (deepCopy) {
      // eslint-disable-next-line no-await-in-loop -- sequential writes share one tx connection
      const copyDocRows = await tx
        .insert(documents)
        .values({
          typeId: src.formTypeId,
          workspaceId: source.workspaceId,
          kind: src.formKind,
          title: src.formTitle,
        })
        .returning();
      const copyDoc = one(copyDocRows, 'reference document copy');
      // eslint-disable-next-line no-await-in-loop -- sequential writes share one tx connection
      const copyVersionRows = await tx
        .insert(documentVersions)
        .values({
          documentId: copyDoc.id,
          typeId: src.formTypeId,
          typeVersionId: src.formTypeVersionId,
          version: 1,
          schema: src.formSchema,
          // Agreements carry authored content in `data`; forms keep the prior behavior (schema only).
          ...(src.relation === 'service_agreement' ? { data: src.srcData } : {}),
        })
        .returning();
      targetDocumentId = copyDoc.id;
      targetVersionId = one(copyVersionRows, 'reference version copy').id;
    }
    // A copied application_form gets a fresh form document in the owner's workspace; other
    // relations keep the source's target_workspace_id (NULL for a global service agreement).
    const targetWorkspaceId =
      src.relation === 'application_form' ? source.workspaceId : src.targetWorkspaceId;
    // eslint-disable-next-line no-await-in-loop -- sequential writes share one tx connection
    await tx.insert(documentReferences).values({
      ownerVersionId: source.newVersionId,
      ownerDocumentId: source.serviceId,
      ownerKind: 'service',
      targetVersionId,
      targetDocumentId,
      targetKind: src.targetKind,
      workspaceId: source.workspaceId,
      targetWorkspaceId,
      relation: src.relation,
      label: src.label,
      position: src.position,
    });
  }
}

/**
 * On publish, re-point any unchanged deep-copied application form to the previously-published
 * version's form (matched by button label) and delete the redundant copy.
 */
export async function dedupCopiedForms(
  tx: Tx,
  serviceId: string,
  versionId: string,
): Promise<void> {
  const pubRows = await tx
    .select({ id: documentVersions.id })
    .from(documentVersions)
    .where(
      and(eq(documentVersions.documentId, serviceId), eq(documentVersions.status, 'published')),
    )
    .limit(1);
  const publishedVersionId = pubRows[0]?.id;
  if (publishedVersionId === undefined || publishedVersionId === versionId) {
    return;
  }
  const previous = await tx
    .select({
      label: documentReferences.label,
      targetDocumentId: documentReferences.targetDocumentId,
      targetVersionId: documentReferences.targetVersionId,
      schema: documentVersions.schema,
    })
    .from(documentReferences)
    .innerJoin(documentVersions, eq(documentVersions.id, documentReferences.targetVersionId))
    .where(
      and(
        eq(documentReferences.ownerVersionId, publishedVersionId),
        eq(documentReferences.relation, 'application_form'),
      ),
    );
  const previousByLabel = new Map(previous.map((p) => [p.label ?? '', p]));

  const current = await tx
    .select({
      refId: documentReferences.id,
      label: documentReferences.label,
      targetDocumentId: documentReferences.targetDocumentId,
      schema: documentVersions.schema,
    })
    .from(documentReferences)
    .innerJoin(documentVersions, eq(documentVersions.id, documentReferences.targetVersionId))
    .where(
      and(
        eq(documentReferences.ownerVersionId, versionId),
        eq(documentReferences.relation, 'application_form'),
      ),
    );

  for (const cur of current) {
    const match = previousByLabel.get(cur.label ?? '');
    // Byte-identical schema = an unedited copy (the deep-copy preserves key order; any edit changes it).
    if (match === undefined || JSON.stringify(cur.schema) !== JSON.stringify(match.schema)) {
      continue;
    }
    // eslint-disable-next-line no-await-in-loop -- sequential writes share one tx connection
    await tx
      .update(documentReferences)
      .set({ targetDocumentId: match.targetDocumentId, targetVersionId: match.targetVersionId })
      .where(eq(documentReferences.id, cur.refId));
    // The copy is now unreferenced → delete it (cascades its version).
    // eslint-disable-next-line no-await-in-loop -- sequential writes share one tx connection
    await tx.delete(documents).where(eq(documents.id, cur.targetDocumentId));
  }
}

/**
 * On publish, revert any unchanged deep-copied WORKSPACE service agreement to the previously-published
 * service version's agreement (matched by `position`, compared by authored `data`) and delete the
 * redundant copy. Only the draft copies this version owns are considered; globals (re-referenced
 * as-is) and already-published shared versions are left untouched. Runs before the agreement promote.
 */
export async function dedupCopiedAgreements(
  tx: Tx,
  serviceId: string,
  versionId: string,
): Promise<void> {
  const pubRows = await tx
    .select({ id: documentVersions.id })
    .from(documentVersions)
    .where(
      and(eq(documentVersions.documentId, serviceId), eq(documentVersions.status, 'published')),
    )
    .limit(1);
  const publishedVersionId = pubRows[0]?.id;
  if (publishedVersionId === undefined || publishedVersionId === versionId) {
    return;
  }
  const previous: AgreementRefSnapshot[] = await tx
    .select({
      position: documentReferences.position,
      data: documentVersions.data,
      targetDocumentId: documentReferences.targetDocumentId,
      targetVersionId: documentReferences.targetVersionId,
    })
    .from(documentReferences)
    .innerJoin(documentVersions, eq(documentVersions.id, documentReferences.targetVersionId))
    .where(
      and(
        eq(documentReferences.ownerVersionId, publishedVersionId),
        eq(documentReferences.relation, 'service_agreement'),
      ),
    );
  // Only the draft copies this version owns are revert candidates (globals/shared published are
  // filtered by `status = 'draft'`).
  const current: CurrentAgreementRef[] = await tx
    .select({
      refId: documentReferences.id,
      position: documentReferences.position,
      data: documentVersions.data,
      targetDocumentId: documentReferences.targetDocumentId,
      targetVersionId: documentReferences.targetVersionId,
    })
    .from(documentReferences)
    .innerJoin(documentVersions, eq(documentVersions.id, documentReferences.targetVersionId))
    .where(
      and(
        eq(documentReferences.ownerVersionId, versionId),
        eq(documentReferences.relation, 'service_agreement'),
        eq(documentVersions.status, 'draft'),
      ),
    );

  for (const revert of planAgreementReverts(current, previous)) {
    // eslint-disable-next-line no-await-in-loop -- sequential writes share one tx connection
    await tx
      .update(documentReferences)
      .set({
        targetDocumentId: revert.previousDocumentId,
        targetVersionId: revert.previousVersionId,
      })
      .where(eq(documentReferences.id, revert.refId));
    // eslint-disable-next-line no-await-in-loop -- sequential writes share one tx connection
    await tx.delete(documents).where(eq(documents.id, revert.copiedDocumentId));
  }
}
