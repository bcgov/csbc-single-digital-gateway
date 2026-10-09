import { resolve } from 'node:path';
import { DOCUMENT_TYPE, createDatabase, documents, documentVersions } from '@repo/database';
import { and, eq } from 'drizzle-orm';
import { rebuildLinksTx } from '../modules/services/util/document-links';

/**
 * Doc 290 rule 4: rebuild `document_links` for every service version — what each one references now. Idempotent (each
 * version's rows are replaced, in its own transaction), so it is safe to re-run. Run after migrating:
 *
 *     npm run db:backfill-links -w platform-api
 */
async function backfill(): Promise<void> {
  process.loadEnvFile(resolve(__dirname, '../../.env'));
  const url = process.env['DATABASE_URL'];
  if (url === undefined || url.trim() === '') throw new Error('DATABASE_URL is not set');
  const db = createDatabase(url);
  try {
    const versions = await db
      .select({
        id: documentVersions.id,
        documentId: documentVersions.documentId,
        content: documentVersions.content,
      })
      .from(documentVersions)
      .innerJoin(documents, eq(documents.id, documentVersions.documentId))
      .where(and(eq(documents.type, DOCUMENT_TYPE.service), eq(documents.kind, 'document')));
    let links = 0;
    // One transaction per version, in turn: a large backfill never holds one long transaction.
    for (const version of versions) {
      // eslint-disable-next-line no-await-in-loop -- sequential on purpose (see above).
      links += await db.transaction((tx) => rebuildLinksTx(tx, version));
    }
    console.log(
      `document_links: ${String(versions.length)} service versions, ${String(links)} links`,
    );
  } finally {
    await db.$client.end();
  }
}

process.on('unhandledRejection', (error) => {
  console.error('backfill-document-links failed:', error);
  process.exit(1);
});
void backfill().catch((error: unknown) => {
  console.error('backfill-document-links failed:', error);
  process.exit(1);
});
