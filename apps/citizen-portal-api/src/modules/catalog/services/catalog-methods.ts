import { type Database, DOCUMENT_TYPE, documents, documentVersions } from '@repo/database';
import { applicationMethodIds, documentContentOf } from '@repo/documents/content';
import { and, eq, inArray } from 'drizzle-orm';

/** One application method a citizen may see: the method and its PUBLISHED version's content. */
export interface PublishedMethod {
  id: string;
  title: string | null;
  description: string | null;
  content: unknown;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Doc 291 rules 4-6 (contract 1): the application methods a citizen may see for a service — the ids its PUBLISHED
 * version references (`applicationMethodIds`), resolved only to application-method documents in the SERVICE's
 * workspace, each at its PUBLISHED version, in reference order. Anything else is left out: the catalog is anonymous,
 * so this scoping is the only thing between a stored id and a document.
 */
export async function publishedMethods(
  db: Database,
  workspaceId: string | null,
  serviceContent: unknown,
): Promise<PublishedMethod[]> {
  const content = documentContentOf(serviceContent);
  const ids = content === null ? [] : applicationMethodIds(content).filter((id) => UUID.test(id));
  if (ids.length === 0 || workspaceId === null) return [];
  const rows = await db
    .select({
      id: documents.id,
      title: documentVersions.title,
      description: documentVersions.description,
      content: documentVersions.content,
    })
    .from(documents)
    .innerJoin(
      documentVersions,
      and(eq(documentVersions.documentId, documents.id), eq(documentVersions.status, 'published')),
    )
    .where(
      and(
        inArray(documents.id, ids),
        eq(documents.type, DOCUMENT_TYPE.applicationMethod),
        eq(documents.kind, 'document'),
        eq(documents.workspaceId, workspaceId),
      ),
    );
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row === undefined ? [] : [row];
  });
}
