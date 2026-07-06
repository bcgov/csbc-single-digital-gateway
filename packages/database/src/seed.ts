import { resolve } from 'node:path';
import { config } from 'dotenv';
import { sql } from 'drizzle-orm';

import { createDatabase } from './client';
import { documentTypes, documentTypeVersions } from './schema';

// Load this package's own .env (see .env.example) so `npm run db:seed -w @repo/database`
// picks up DATABASE_URL regardless of the cwd it is invoked from.
config({ path: resolve(import.meta.dirname, '../.env'), quiet: true });

// Fixed ids make the seed idempotent (re-running inserts nothing new).
const BASIC_FORM_ID = '00000000-0000-4000-8000-000000000001';
const MULTI_STAGE_ID = '00000000-0000-4000-8000-000000000002';
const SERVICE_ID = '00000000-0000-4000-8000-000000000003';

const emptyForm = {
  schema: { type: 'object', properties: {}, required: [] },
  uischema: { type: 'VerticalLayout', elements: [] },
};

// `about` is a rich-text field — stored as a Lexical SerializedEditorState object (schema type "object"),
// driven by the `richtext` JSONForms renderer (uischema option `format: 'richtext'`).
const serviceDefinition = {
  schema: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string', title: 'Title' },
      description: { type: 'string', title: 'Description' },
      about: { type: 'object', title: 'About' },
    },
  },
  uischema: {
    type: 'VerticalLayout',
    elements: [
      { type: 'Control', scope: '#/properties/title' },
      { type: 'Control', scope: '#/properties/description', options: { multi: true } },
      { type: 'Control', scope: '#/properties/about', options: { format: 'richtext' } },
    ],
  },
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
      position: { x: 0, y: 0 },
      pages: [{ id: 'page-1', name: 'Page 1', description: '', ...emptyForm }],
    },
  ],
  edges: [],
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
        { id: SERVICE_ID, name: 'Service', kind: 'service' },
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
        {
          typeId: SERVICE_ID,
          version: 1,
          definition: serviceDefinition,
          publishedAt: sql`now()`,
        },
      ])
      .onConflictDoNothing();

    console.info(
      '[seed] document types ready: Basic Form, Multi-stage Form, Service (published v1).',
    );
  } finally {
    await db.$client.end();
  }
}

seed().catch((error: unknown) => {
  console.error('[seed] failed:', error);
  process.exitCode = 1;
});
