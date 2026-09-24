import { ConflictException, NotFoundException } from '@nestjs/common';
import { type Database, documentVersions } from '@repo/database';
import { desc, eq, sql } from 'drizzle-orm';

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Reactivate an archived service: clear `archived_at` on the LATEST version, restoring its prior
 * published/draft state. Older versions stay archived as history.
 *
 * Feature 217: this used to also un-archive the application-method form versions the service
 * version referenced. `document_references` is gone, so a service now carries only its own
 * versions.
 */
export async function reactivateServiceTx(tx: Tx, id: string): Promise<void> {
  const latest = (
    await tx
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, id))
      .orderBy(desc(documentVersions.versionNumber))
      .limit(1)
  )[0];
  if (latest === undefined) {
    throw new NotFoundException('Service not found');
  }
  if (latest.status !== 'archived') {
    throw new ConflictException('Only archived services can be reactivated');
  }
  await tx
    .update(documentVersions)
    .set({ archivedAt: null })
    .where(eq(documentVersions.id, latest.id));
}

/**
 * Discard one version of a service. The last remaining version can't be discarded — deleting the
 * service is the operation for that.
 *
 * Feature 217: the deep-copied application methods this used to orphan and clean up no longer
 * exist, so the version simply goes.
 */
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
  await tx.delete(documentVersions).where(eq(documentVersions.id, versionId));
}
