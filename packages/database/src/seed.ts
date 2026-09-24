import { resolve } from 'node:path';
import { config } from 'dotenv';
import { sql } from 'drizzle-orm';

import { createDatabase } from './client';
import { resolvePgSsl } from './ssl';
import { documentVersions, documents } from './schema';
import {
  blankApplicationMethodContent,
  blankServiceAgreementContent,
  blankServiceContent,
} from './seed-data/blank-documents';

// Load this package's own .env (see .env.example) so `npm run db:seed -w @repo/database`
// picks up DATABASE_URL regardless of the cwd it is invoked from.
config({ path: resolve(import.meta.dirname, '../.env'), quiet: true });

// Fixed ids make the seed idempotent (a re-run inserts nothing) and let tests and fixtures
// reference the templates by constant. The VERSION ids are fixed too: a targetless
// `ON CONFLICT DO NOTHING` would otherwise arbitrate on whichever unique it hit
// (`document_versions_document_id_version_number_key` or the one-published partial index), and a
// fresh random id on every run is a silent invariant risk.
export const TEMPLATE_SERVICE_ID = '00000000-0000-4000-8000-000000000001';
export const TEMPLATE_APPLICATION_METHOD_ID = '00000000-0000-4000-8000-000000000002';
export const TEMPLATE_SERVICE_AGREEMENT_ID = '00000000-0000-4000-8000-000000000003';
export const TEMPLATE_SERVICE_V1_ID = '00000000-0000-4000-8000-000000000011';
export const TEMPLATE_APPLICATION_METHOD_V1_ID = '00000000-0000-4000-8000-000000000012';
export const TEMPLATE_SERVICE_AGREEMENT_V1_ID = '00000000-0000-4000-8000-000000000013';

/**
 * Seed runner — idempotent (fixed ids + `onConflictDoNothing`). Inserts one GLOBAL template
 * document per `document_type`, each with a PUBLISHED version 1 holding a blank `@repo/forms`
 * document, so a fresh database has a shape for every type a staff author can create.
 *
 * `workspaceId` is omitted, so each template is global (available in every workspace).
 * `templateId`/`templateVersionId` are omitted: a template follows no template, which satisfies
 * `document_versions_template_pair_chk` and leaves the MATCH SIMPLE template FK skipped.
 *
 * No `document_version_history` rows: `user_id` is NOT NULL with a RESTRICT FK to `users`, and the
 * seed creates no users. A seeded template version legitimately has no history — don't "fix" this
 * by inventing a user.
 *
 * `title`, `description` and `status` are GENERATED columns, so they are absent from the insert
 * type and must not be set. `status` becomes `published` by virtue of `publishedAt`.
 */
async function seed(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url.trim() === '') {
    throw new Error('db:seed — DATABASE_URL is not set (copy .env.example to .env)');
  }

  const db = createDatabase(url, {
    ssl: resolvePgSsl({ mode: process.env.PGSSLMODE, ca: process.env.DATABASE_CA_CERT }),
  });
  try {
    await db
      .insert(documents)
      .values([
        { id: TEMPLATE_SERVICE_ID, kind: 'template', type: 'service' },
        { id: TEMPLATE_APPLICATION_METHOD_ID, kind: 'template', type: 'application-method' },
        { id: TEMPLATE_SERVICE_AGREEMENT_ID, kind: 'template', type: 'service-agreement' },
      ])
      .onConflictDoNothing();

    await db
      .insert(documentVersions)
      .values([
        {
          id: TEMPLATE_SERVICE_V1_ID,
          documentId: TEMPLATE_SERVICE_ID,
          versionNumber: 1,
          content: blankServiceContent,
          publishedAt: sql`now()`,
        },
        {
          id: TEMPLATE_APPLICATION_METHOD_V1_ID,
          documentId: TEMPLATE_APPLICATION_METHOD_ID,
          versionNumber: 1,
          content: blankApplicationMethodContent,
          publishedAt: sql`now()`,
        },
        {
          id: TEMPLATE_SERVICE_AGREEMENT_V1_ID,
          documentId: TEMPLATE_SERVICE_AGREEMENT_ID,
          versionNumber: 1,
          content: blankServiceAgreementContent,
          publishedAt: sql`now()`,
        },
      ])
      .onConflictDoNothing();

    console.info(
      '[seed] templates ready: Service, Application method, Service agreement (published v1).',
    );
  } finally {
    await db.$client.end();
  }
}

seed().catch((error: unknown) => {
  console.error('[seed] failed:', error);
  process.exitCode = 1;
});
