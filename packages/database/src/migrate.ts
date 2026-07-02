import { resolve } from 'node:path';
import { config } from 'dotenv';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { createDatabase } from './client';

// Load this package's own .env (see .env.example) when present, so `npm run db:migrate:run`
// works locally regardless of cwd. In CI/containers DATABASE_URL comes from the environment
// (dotenv never overrides an already-set var, and a missing .env is a no-op).
config({ path: resolve(import.meta.dirname, '../.env'), quiet: true });

/**
 * Apply all pending SQL migrations and exit. Unlike `drizzle-kit migrate` (which can swallow
 * SQL errors and still exit 0 — see the repo CLAUDE.md), the drizzle-orm migrator THROWS on a
 * failed statement, so this runner fails loudly (exit 1) — the behaviour a CI/CD gate needs.
 */
async function run(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('db:migrate — DATABASE_URL is not set');
  }

  const db = createDatabase(url);
  try {
    await migrate(db, { migrationsFolder: resolve(import.meta.dirname, '../migrations') });
    console.info('[migrate] all migrations applied.');
  } finally {
    await db.$client.end();
  }
}

run().catch((error: unknown) => {
  console.error('[migrate] failed:', error);
  // drizzle wraps the driver error; the real SQL message is usually on `.cause`.
  if (error instanceof Error && error.cause) {
    console.error('[migrate] cause:', error.cause);
  }
  process.exitCode = 1;
});
