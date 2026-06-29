import { ConflictException, NotFoundException } from '@nestjs/common';
import { documentReferences, documentVersions, documents } from '@repo/database';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Tx } from './applications';

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
  const formIds = (
    await tx
      .select({ formId: documentReferences.targetDocumentId })
      .from(documentReferences)
      .where(
        and(
          eq(documentReferences.ownerVersionId, versionId),
          eq(documentReferences.relation, 'application_form'),
        ),
      )
  ).map((r) => r.formId);
  // Deleting the version cascades the references it owns; the deep-copied forms are then orphaned.
  await tx.delete(documentVersions).where(eq(documentVersions.id, versionId));
  for (const formId of formIds) {
    // eslint-disable-next-line no-await-in-loop -- sequential reads/writes share one tx connection
    const remaining = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(documentReferences)
      .where(eq(documentReferences.targetDocumentId, formId));
    if ((remaining[0]?.n ?? 0) === 0) {
      // eslint-disable-next-line no-await-in-loop -- sequential reads/writes share one tx connection
      await tx.delete(documents).where(eq(documents.id, formId));
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
      formTitle: documents.title,
      formKind: documents.kind,
      formTypeId: documentVersions.typeId,
      formTypeVersionId: documentVersions.typeVersionId,
      formSchema: documentVersions.schema,
    })
    .from(documentReferences)
    .innerJoin(documents, eq(documents.id, documentReferences.targetDocumentId))
    .innerJoin(documentVersions, eq(documentVersions.id, documentReferences.targetVersionId))
    .where(eq(documentReferences.ownerVersionId, source.sourceVersionId));

  for (const src of sources) {
    let targetDocumentId = src.targetDocumentId;
    let targetVersionId = src.targetVersionId;
    if (src.relation === 'application_form') {
      // eslint-disable-next-line no-await-in-loop -- sequential writes share one tx connection
      const formDocRows = await tx
        .insert(documents)
        .values({
          typeId: src.formTypeId,
          workspaceId: source.workspaceId,
          kind: src.formKind,
          title: src.formTitle,
        })
        .returning();
      const formDoc = one(formDocRows, 'form document copy');
      // eslint-disable-next-line no-await-in-loop -- sequential writes share one tx connection
      const formVersionRows = await tx
        .insert(documentVersions)
        .values({
          documentId: formDoc.id,
          typeId: src.formTypeId,
          typeVersionId: src.formTypeVersionId,
          version: 1,
          schema: src.formSchema,
        })
        .returning();
      targetDocumentId = formDoc.id;
      targetVersionId = one(formVersionRows, 'form version copy').id;
    }
    // eslint-disable-next-line no-await-in-loop -- sequential writes share one tx connection
    await tx.insert(documentReferences).values({
      ownerVersionId: source.newVersionId,
      ownerDocumentId: source.serviceId,
      ownerKind: 'service',
      targetVersionId,
      targetDocumentId,
      targetKind: src.targetKind,
      workspaceId: source.workspaceId,
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
