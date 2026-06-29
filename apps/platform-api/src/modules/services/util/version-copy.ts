import { documentReferences, documentVersions, documents } from '@repo/database';
import { and, eq } from 'drizzle-orm';
import type { Tx } from './applications';

function one<T>(rows: T[], what: string): T {
  const row = rows[0];
  if (row === undefined) {
    throw new Error(`${what} returned no row`);
  }
  return row;
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
