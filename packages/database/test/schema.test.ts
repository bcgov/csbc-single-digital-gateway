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

  it('includes the external_application relation enum value (feature 131)', () => {
    expect(schema.documentReferencesRelation.enumValues).toContain('external_application');
  });

  it('has a nullable target_workspace_id column (global-or-same-ws targets)', () => {
    const { columns } = cfg(schema.documentReferences);
    const targetWs = columns.find((c) => c.name === 'target_workspace_id');
    expect(targetWs, 'document_references.target_workspace_id must exist').toBeDefined();
    expect(targetWs?.notNull).toBe(false);
  });

  it('has a NULLABLE target_version_id (service_agreement refs point at the document)', () => {
    // Initiative shared-service-agreements: a service_agreement reference omits the version pin and
    // resolves current-published; a CHECK keeps it non-null for forms/related-services.
    const { columns } = cfg(schema.documentReferences);
    const targetVersion = columns.find((c) => c.name === 'target_version_id');
    expect(targetVersion, 'document_references.target_version_id must exist').toBeDefined();
    expect(targetVersion?.notNull).toBe(false);
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

describe('schema — workspace_default_agreements (workspace → agreement link)', () => {
  it('links a workspace to an agreement document (document-only) and is immutable', () => {
    const { columns } = cfg(schema.workspaceDefaultAgreements);
    const names = columns.map((c) => c.name);
    expect(names).toContain('workspace_id');
    expect(names).toContain('agreement_document_id');
    expect(names).toContain('agreement_kind');
    // Global-or-same-ws targeting; the agreement's workspace is nullable (NULL = global).
    const agrWs = columns.find((c) => c.name === 'agreement_workspace_id');
    expect(agrWs?.notNull).toBe(false);
    // Immutable: added/removed, never edited → no updated_at (so no set_updated_at trigger).
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

describe('schema — notification_outbox (transactional outbox)', () => {
  it('mirrors the ingestion contract with a unique idempotency key and a users FK', () => {
    const { columns, uniqueConstraints, foreignKeys } = cfg(schema.notificationOutbox);
    const byName = new Map(columns.map((c) => [c.name, c]));

    const key = byName.get('idempotency_key');
    expect(key, 'idempotency_key must exist').toBeDefined();
    expect(key?.notNull).toBe(true);
    expect(
      uniqueConstraints.some((u) => u.columns.some((c) => c.name === 'idempotency_key')),
      'idempotency_key must be UNIQUE',
    ).toBe(true);

    expect(byName.get('user_id')?.notNull).toBe(true);
    const fk = foreignKeys.find((f) => f.reference().columns.some((c) => c.name === 'user_id'));
    expect(fk, 'user_id must FK to users').toBeDefined();
    expect(byName.get('type')?.notNull).toBe(true);
    expect(byName.get('title')?.notNull).toBe(true);
    expect(byName.get('body')?.notNull).toBe(false);
    expect(byName.get('email')?.notNull).toBe(false);
  });

  it('carries relay state: writable pending-default status, attempts, next_attempt_at', () => {
    const { columns } = cfg(schema.notificationOutbox);
    const byName = new Map(columns.map((c) => [c.name, c]));

    expect(schema.outboxStatus.enumValues).toEqual(['pending', 'delivered', 'failed']);
    const status = byName.get('status');
    expect(status?.getSQLType()).toBe('outbox_status');
    expect(status?.notNull).toBe(true);
    expect(status?.hasDefault).toBe(true);
    expect(status?.generated, 'status must be writable, not GENERATED').toBeUndefined();

    expect(byName.get('attempts')?.notNull).toBe(true);
    const nextAttempt = byName.get('next_attempt_at');
    expect(nextAttempt?.notNull).toBe(true);
    expect(nextAttempt?.hasDefault).toBe(true);
    expect(byName.get('delivered_at')?.notNull).toBe(false);
    expect(byName.has('updated_at')).toBe(true);
  });
});
