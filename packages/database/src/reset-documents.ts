import { resolve } from 'node:path';
import { config } from 'dotenv';

import { createDatabase } from './client';
import { resolvePgSsl } from './ssl';
import {
  documents,
  serviceAgreementConsents,
  submissions,
  workspaceDefaultAgreements,
} from './schema';

// Load this package's own .env, as the seed does.
config({ path: resolve(import.meta.dirname, '../.env'), quiet: true });

/**
 * DESTRUCTIVE, LOCAL USE (doc 275): deletes EVERY document — templates and documents of every type — and everything
 * that points at them, so a database written in the old `{ schema, uischema }` content shape can be reseeded in the
 * `{ schema, variants }` shape. Run as `npm run db:reset-documents -w @repo/database`, which re-runs the seed after.
 *
 * Deliberately NOT a migration: migrations run on every deployed database, and this deletes data.
 *
 * Order: the RESTRICT references first (submissions, consents, workspace default agreements), then `documents` in ONE
 * statement — `document_members`, `document_versions` and their history cascade, and the NO ACTION template FKs are
 * checked at statement end, when every row they could name is gone too.
 */
async function resetDocuments(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url.trim() === '') {
    throw new Error('db:reset-documents — DATABASE_URL is not set (copy .env.example to .env)');
  }
  const db = createDatabase(url, {
    ssl: resolvePgSsl({ mode: process.env.PGSSLMODE, ca: process.env.DATABASE_CA_CERT }),
  });
  try {
    await db.transaction(async (tx) => {
      await tx.delete(submissions);
      await tx.delete(serviceAgreementConsents);
      await tx.delete(workspaceDefaultAgreements);
      await tx.delete(documents);
    });
    console.info('[reset-documents] every document deleted; reseeding templates.');
  } finally {
    await db.$client.end();
  }
}

resetDocuments().catch((error: unknown) => {
  console.error('[reset-documents] failed:', error);
  process.exitCode = 1;
});
