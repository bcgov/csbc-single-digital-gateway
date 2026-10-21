import {
  DOCUMENT_TYPE,
  type Database,
  type Document,
  type DocumentVersion,
  documents,
  documentVersions,
} from '@repo/database';
import { and, asc, eq, inArray } from 'drizzle-orm';

export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];
/** Reads run on the pool or inside the caller's transaction (doc 289 rule 13). */
export type Executor = Database | Tx;

/** One application method: its document and every version, oldest first. */
export interface Method {
  doc: Document;
  versions: DocumentVersion[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Whether `id` can be compared with a uuid column — a malformed id would make Postgres refuse the whole query. */
export function isUuid(id: string): boolean {
  return UUID.test(id);
}

/**
 * Doc 289 rule 3: the application-method DOCUMENTS among `ids` in `workspaceId`, with their versions. The only way the
 * lifecycle resolves a method, so author-controlled references can never reach another workspace's document.
 */
export async function findMethods(
  executor: Executor,
  workspaceId: string,
  ids: readonly string[],
): Promise<Map<string, Method>> {
  const valid = ids.filter(isUuid);
  if (valid.length === 0) return new Map();
  const docs = await executor
    .select()
    .from(documents)
    .where(
      and(
        inArray(documents.id, valid),
        eq(documents.type, DOCUMENT_TYPE.applicationMethod),
        eq(documents.kind, 'document'),
        eq(documents.workspaceId, workspaceId),
      ),
    );
  if (docs.length === 0) return new Map();
  const versions = await executor
    .select()
    .from(documentVersions)
    .where(
      inArray(
        documentVersions.documentId,
        docs.map((doc) => doc.id),
      ),
    )
    .orderBy(asc(documentVersions.versionNumber));
  return new Map(
    docs.map((doc) => [
      doc.id,
      { doc, versions: versions.filter((version) => version.documentId === doc.id) },
    ]),
  );
}
