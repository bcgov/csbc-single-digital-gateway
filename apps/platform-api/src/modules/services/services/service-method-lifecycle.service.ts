import { ConflictException, Injectable } from '@nestjs/common';
import { type DocumentVersion, documents, documentVersions, submissions } from '@repo/database';
import { applicationMethodIds, documentContentOf } from '@repo/documents/content';
import { and, inArray, isNull, sql } from 'drizzle-orm';
import { linkedElsewhere, linkedMethodIds, linkUsers } from '../util/document-links';
import { type Tx, findMethods } from '../util/method-lookup';

/** The service a lifecycle step acts for: its id and the workspace its methods must be in. */
interface ServiceRef {
  id: string;
  workspaceId: string;
}

export const METHOD_HAS_SUBMISSIONS = 'An application method has submissions';

/**
 * Doc 290 rules 8-11 — what happens to a service's application methods when the service, or one of its draft versions,
 * goes away or is archived. Each step runs in the caller's transaction (rule 12) and asks `document_links` who else uses
 * a method (contract 3), so the rules stay right once methods may be shared.
 */
@Injectable()
export class ServiceMethodLifecycle {
  /** Rule 8: delete the methods created in draft `version` — linked from nowhere else and never published. */
  async discardCreatedMethodsTx(
    tx: Tx,
    service: ServiceRef,
    version: DocumentVersion,
  ): Promise<void> {
    const ids = idsOf(version.content);
    const [methods, elsewhere] = await Promise.all([
      findMethods(tx, service.workspaceId, ids),
      linkedElsewhere(tx, ids, version.id),
    ]);
    const created = [...methods.values()]
      .filter(
        ({ doc, versions }) =>
          !elsewhere.has(doc.id) && versions.every((v) => v.status === 'draft'),
      )
      .map(({ doc }) => doc.id);
    if (created.length > 0) await tx.delete(documents).where(inArray(documents.id, created));
  }

  /** Rule 9: archive, at `at`, the methods the service links to that no other live service still uses. */
  async archiveMethodsTx(tx: Tx, service: ServiceRef, at: Date): Promise<void> {
    const ids = await this.ownMethods(tx, service, { liveOnly: true });
    if (ids.length === 0) return;
    await tx
      .update(documentVersions)
      .set({ archivedAt: at })
      .where(and(inArray(documentVersions.documentId, ids), isNull(documentVersions.archivedAt)));
  }

  /** Rule 10: restore the latest version of each method `latest` links to that was archived with it. */
  async reactivateMethodsTx(tx: Tx, service: ServiceRef, latest: DocumentVersion): Promise<void> {
    const at = latest.archivedAt;
    if (at === null) return;
    const methods = await findMethods(tx, service.workspaceId, idsOf(latest.content));
    const restored = [...methods.values()]
      .map(({ versions }) => versions.at(-1))
      .filter((version) => version?.archivedAt?.getTime() === at.getTime())
      .map((version) => version!.id);
    if (restored.length > 0)
      await tx
        .update(documentVersions)
        .set({ archivedAt: null })
        .where(inArray(documentVersions.id, restored));
  }

  /** Rule 11: delete the methods only this service uses; refuse when one of them has submissions. */
  async deleteMethodsTx(tx: Tx, service: ServiceRef): Promise<void> {
    const ids = await this.ownMethods(tx, service, { liveOnly: false });
    if (ids.length === 0) return;
    const used = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(submissions)
      .where(inArray(submissions.documentId, ids));
    if ((used[0]?.n ?? 0) > 0) throw new ConflictException(METHOD_HAS_SUBMISSIONS);
    await tx.delete(documents).where(inArray(documents.id, ids));
  }

  /** The workspace's application methods this service links to that no OTHER document uses (live users only if asked). */
  private async ownMethods(
    tx: Tx,
    service: ServiceRef,
    { liveOnly }: { liveOnly: boolean },
  ): Promise<string[]> {
    const linked = await linkedMethodIds(tx, service.id);
    const [methods, users] = await Promise.all([
      findMethods(tx, service.workspaceId, linked),
      linkUsers(tx, linked, service.id, { liveOnly }),
    ]);
    return [...methods.keys()].filter((id) => (users.get(id) ?? []).length === 0);
  }
}

function idsOf(content: unknown): string[] {
  const document = documentContentOf(content);
  return document === null ? [] : applicationMethodIds(document);
}
