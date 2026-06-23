import { resolve } from 'node:path';
import { config } from 'dotenv';

import { createDatabase } from './client';

// Load the repo-root .env so `npm run db:seed -w @repo/database` picks up DATABASE_URL
// regardless of the cwd it is invoked from.
config({ path: resolve(import.meta.dirname, '../../../.env') });

/**
 * Seed runner — STUB. The seed pipeline (env → client → teardown) is wired and idempotent
 * by virtue of doing nothing yet. Add inserts here (workspaces, document types, …) when
 * fixture data is needed; keep them idempotent (e.g. `onConflictDoNothing`).
 */
async function seed(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url.trim() === '') {
    throw new Error('db:seed — DATABASE_URL is not set (copy .env.example to .env)');
  }

  const db = createDatabase(url);
  try {
    // TODO: insert seed data. No-op stub for now.
    console.info('[seed] no seed data defined yet — nothing to do.');
  } finally {
    await db.$client.end();
  }
}

seed().catch((error: unknown) => {
  console.error('[seed] failed:', error);
  process.exitCode = 1;
});
