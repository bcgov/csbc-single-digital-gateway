import {
  DOCUMENT_TYPE,
  type DocumentVersion,
  documentLinks as linksTable,
  documents,
  documentVersions,
} from '@repo/database';
import { documentContentOf, documentLinks } from '@repo/documents/content';
import { and, eq, inArray, isNull, ne } from 'drizzle-orm';
import { type Executor, type Tx, isUuid } from './method-lookup';

/**
 * Doc 290 rule 2 — `document_links` is DERIVED (contract 1): this is its only writer. Replaces `version`'s rows with the
 * references its content holds now, keeping only targets that exist (the FK would refuse the rest). Call it in the
 * transaction that wrote the content. Returns how many links it wrote.
 */
export async function rebuildLinksTx(
  tx: Tx,
  version: Pick<DocumentVersion, 'id' | 'documentId' | 'content'>,
): Promise<number> {
  await tx.delete(linksTable).where(eq(linksTable.sourceVersionId, version.id));
  const content = documentContentOf(version.content);
  const links = content === null ? [] : documentLinks(content).filter((l) => isUuid(l.targetId));
  if (links.length === 0) return 0;
  const existing = await tx
    .select({ id: documents.id })
    .from(documents)
    .where(inArray(documents.id, [...new Set(links.map((link) => link.targetId))]));
  const ids = new Set(existing.map((row) => row.id));
  const rows = links
    .filter((link) => ids.has(link.targetId))
    .map((link) => ({
      sourceDocumentId: version.documentId,
      sourceVersionId: version.id,
      targetDocumentId: link.targetId,
      relation: 'references',
      fieldKey: link.fieldKey,
      targetType: link.targetType,
    }));
  if (rows.length === 0) return 0;
  await tx.insert(linksTable).values(rows).onConflictDoNothing();
  return rows.length;
}

/** A document that links to a target: its id and the title of the linking version. */
export interface LinkUser {
  documentId: string;
  title: string | null;
}

/**
 * Doc 290 rule 5 (contract 3): for each of `targetIds`, the OTHER documents (not `excludeDocumentId`) that link to it —
 * through any version, or only through non-archived ones when `liveOnly` (rule 9). Each document once.
 */
export async function linkUsers(
  executor: Executor,
  targetIds: readonly string[],
  excludeDocumentId: string,
  { liveOnly = false }: { liveOnly?: boolean } = {},
): Promise<Map<string, LinkUser[]>> {
  const valid = targetIds.filter(isUuid);
  if (valid.length === 0) return new Map();
  const rows = await executor
    .select({
      targetId: linksTable.targetDocumentId,
      documentId: linksTable.sourceDocumentId,
      title: documentVersions.title,
    })
    .from(linksTable)
    .innerJoin(documentVersions, eq(documentVersions.id, linksTable.sourceVersionId))
    .where(
      and(
        inArray(linksTable.targetDocumentId, valid),
        ne(linksTable.sourceDocumentId, excludeDocumentId),
        ...(liveOnly ? [isNull(documentVersions.archivedAt)] : []),
      ),
    );
  const users = new Map<string, LinkUser[]>();
  for (const row of rows) {
    const list = users.get(row.targetId) ?? [];
    if (!list.some((user) => user.documentId === row.documentId))
      list.push({ documentId: row.documentId, title: row.title });
    users.set(row.targetId, list);
  }
  return users;
}

/** Doc 290 rules 9, 11: the application methods any version of `serviceId` links to. */
export async function linkedMethodIds(executor: Executor, serviceId: string): Promise<string[]> {
  const rows = await executor
    .selectDistinct({ id: linksTable.targetDocumentId })
    .from(linksTable)
    .where(
      and(
        eq(linksTable.sourceDocumentId, serviceId),
        eq(linksTable.targetType, DOCUMENT_TYPE.applicationMethod),
      ),
    );
  return rows.map((row) => row.id);
}

/** Doc 290 rule 8: which of `targetIds` some version OTHER than `versionId` links to. */
export async function linkedElsewhere(
  executor: Executor,
  targetIds: readonly string[],
  versionId: string,
): Promise<Set<string>> {
  const valid = targetIds.filter(isUuid);
  if (valid.length === 0) return new Set();
  const rows = await executor
    .selectDistinct({ id: linksTable.targetDocumentId })
    .from(linksTable)
    .where(
      and(inArray(linksTable.targetDocumentId, valid), ne(linksTable.sourceVersionId, versionId)),
    );
  return new Set(rows.map((row) => row.id));
}
