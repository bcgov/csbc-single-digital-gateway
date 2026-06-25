import { is } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import * as schema from '../src/schema';

// getTableConfig wants the base `PgTable<TableConfig>`; concrete drizzle tables carry
// literal-typed configs that trip invariance under `exactOptionalPropertyTypes`. Widen to
// the base type at the call boundary — the returned config shape is identical.
const cfg = (table: unknown) => getTableConfig(table as PgTable);

// The set of tables the DBML defines — the schema barrel must export every one.
const EXPECTED_TABLES = [
  'users',
  'identities',
  'workspaces',
  'workspace_members',
  'document_types',
  'document_type_versions',
  'documents',
  'document_members',
  'document_versions',
  'document_version_contributors',
  'document_references',
  'submissions',
  'submission_versions',
  'reviews',
] as const;

describe('schema — tables', () => {
  it('exports a drizzle pg table for every DBML table', () => {
    const tableNames = (Object.values(schema) as unknown[])
      .filter((v) => is(v, PgTable))
      .map((t) => cfg(t).name);

    for (const expected of EXPECTED_TABLES) {
      expect(tableNames).toContain(expected);
    }
  });
});

describe('schema — users (soft delete + citext email)', () => {
  it('has a nullable email column and a deleted_at soft-delete column', () => {
    const { columns } = cfg(schema.users);
    const byName = new Map(columns.map((c) => [c.name, c]));

    const email = byName.get('email');
    expect(email, 'users.email must exist').toBeDefined();
    expect(email?.getSQLType()).toBe('citext');
    expect(email?.notNull).toBe(false);

    const deletedAt = byName.get('deleted_at');
    expect(deletedAt, 'users.deleted_at must exist').toBeDefined();
    expect(deletedAt?.notNull).toBe(false);
  });
});

describe('schema — workspaces.slug default', () => {
  it('defaults slug to nanoid() at the database level', () => {
    const slug = cfg(schema.workspaces).columns.find((c) => c.name === 'slug');
    expect(slug, 'workspaces.slug must exist').toBeDefined();
    expect(slug?.hasDefault, 'slug must carry a DEFAULT').toBe(true);
  });
});

describe('schema — generated status columns', () => {
  // submissions' status moved to submission_versions and became a WRITABLE state machine
  // (see doc 30) — it is intentionally NOT generated and is asserted in submissions.test.ts.
  it.each([
    ['document_type_versions', schema.documentTypeVersions],
    ['document_versions', schema.documentVersions],
  ] as const)('marks %s.status as a generated column', (_name, table) => {
    const status = cfg(table).columns.find((c) => c.name === 'status');
    expect(status, 'status column must exist').toBeDefined();
    // generatedAlwaysAs(...) populates the column's `generated` config.
    expect(status?.generated, 'status must be GENERATED').toBeTruthy();
  });
});

describe('schema — partial unique "one published version" indexes', () => {
  it.each([
    ['document_type_versions', schema.documentTypeVersions, 'type_id'],
    ['document_versions', schema.documentVersions, 'document_id'],
  ] as const)('declares a partial unique index on %s', (_name, table, scopeColumn) => {
    const partialUnique = cfg(table).indexes.find(
      (idx) =>
        idx.config.unique === true &&
        idx.config.where !== undefined &&
        idx.config.columns.some(
          (c) => 'name' in c && (c as { name?: string }).name === scopeColumn,
        ),
    );
    expect(partialUnique, `expected a partial unique index scoped to ${scopeColumn}`).toBeDefined();
  });
});

describe('schema — composite foreign keys', () => {
  it('document_members references documents and workspace_members by composite key', () => {
    const composite = cfg(schema.documentMembers).foreignKeys.filter(
      (fk) => fk.reference().columns.length >= 2,
    );
    expect(composite.length, 'expected at least two composite FKs').toBeGreaterThanOrEqual(2);
  });
});
