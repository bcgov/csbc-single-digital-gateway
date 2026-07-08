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

describe('schema — documents.workspace_id nullable (global documents)', () => {
  it('allows a NULL workspace_id so a document can be global (e.g. an admin service agreement)', () => {
    const { columns } = cfg(schema.documents);
    const workspaceId = columns.find((c) => c.name === 'workspace_id');
    expect(workspaceId, 'documents.workspace_id must exist').toBeDefined();
    expect(workspaceId?.notNull).toBe(false);
  });
});

describe('schema — document_references service_agreement relation + relaxed workspace', () => {
  it('includes the service_agreement relation enum value', () => {
    expect(schema.documentReferencesRelation.enumValues).toContain('service_agreement');
  });

  it('has a nullable target_workspace_id column (global-or-same-ws targets)', () => {
    const { columns } = cfg(schema.documentReferences);
    const targetWs = columns.find((c) => c.name === 'target_workspace_id');
    expect(targetWs, 'document_references.target_workspace_id must exist').toBeDefined();
    expect(targetWs?.notNull).toBe(false);
  });
});

describe('schema — service_agreement_consents (append-only audit)', () => {
  it('has approve/reject decision, a durable user FK, and NO updated_at (immutable)', () => {
    expect(schema.serviceAgreementConsentsDecision.enumValues).toEqual(['approve', 'reject']);
    const { columns } = cfg(schema.serviceAgreementConsents);
    const names = columns.map((c) => c.name);
    expect(names).toContain('user_id');
    expect(names).toContain('agreement_version_id');
    expect(names).toContain('decision');
    // Immutable audit: no updated_at (so no set_updated_at trigger attaches).
    expect(names).not.toContain('updated_at');
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
