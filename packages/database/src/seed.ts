import { resolve } from 'node:path';
import { config } from 'dotenv';
import { sql } from 'drizzle-orm';

import { createDatabase } from './client';
import { documentTypes, documentTypeVersions } from './schema';

// Load the repo-root .env so `npm run db:seed -w @repo/database` picks up DATABASE_URL
// regardless of the cwd it is invoked from.
config({ path: resolve(import.meta.dirname, '../../../.env') });

// Fixed ids make the seed idempotent (re-running inserts nothing new).
const BASIC_FORM_ID = '00000000-0000-4000-8000-000000000001';
const MULTI_STAGE_ID = '00000000-0000-4000-8000-000000000002';

const emptyForm = {
  schema: { type: 'object', properties: {}, required: [] },
  uischema: { type: 'VerticalLayout', elements: [] },
};

const basicFormDefinition = {
  name: 'Basic Form',
  description: 'A single page of fields applicants complete and submit in one go.',
  ...emptyForm,
};

const multiStageDefinition = {
  stages: [
    {
      id: 'stage-1',
      name: 'Stage 1',
      pages: [{ id: 'page-1', name: 'Page 1', description: '', ...emptyForm }],
    },
  ],
};

/**
 * Seed runner — idempotent (fixed ids + `onConflictDoNothing`). Inserts the first two document types
 * (Basic Form, Multi-stage Form) with a PUBLISHED version 1 so they appear in the staff catalog.
 */
async function seed(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url.trim() === '') {
    throw new Error('db:seed — DATABASE_URL is not set (copy .env.example to .env)');
  }

  const db = createDatabase(url);
  try {
    await db
      .insert(documentTypes)
      .values([
        { id: BASIC_FORM_ID, name: 'Basic Form', kind: 'basic-form' },
        { id: MULTI_STAGE_ID, name: 'Multi-stage Form', kind: 'multi-stage-form' },
      ])
      .onConflictDoNothing();

    await db
      .insert(documentTypeVersions)
      .values([
        {
          typeId: BASIC_FORM_ID,
          version: 1,
          definition: basicFormDefinition,
          publishedAt: sql`now()`,
        },
        {
          typeId: MULTI_STAGE_ID,
          version: 1,
          definition: multiStageDefinition,
          publishedAt: sql`now()`,
        },
      ])
      .onConflictDoNothing();

    console.info('[seed] document types ready: Basic Form, Multi-stage Form (published v1).');
  } finally {
    await db.$client.end();
  }
}

seed().catch((error: unknown) => {
  console.error('[seed] failed:', error);
  process.exitCode = 1;
});
