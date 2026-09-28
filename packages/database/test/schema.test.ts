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
  'documents',
  'document_members',
  'document_versions',
  'document_version_history',
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

describe('schema — documents (feature 217: generic type + kind)', () => {
  it('drops the old per-document title/description/type_id in favour of the version columns', () => {
    const names = cfg(schema.documents).columns.map((c) => c.name);
    expect(names).not.toContain('title');
    expect(names).not.toContain('description');
    expect(names).not.toContain('type_id');
  });

  it('declares type and kind as enums, kind defaulting to document', () => {
    const byName = new Map(cfg(schema.documents).columns.map((c) => [c.name, c]));
    expect(byName.get('type')?.getSQLType()).toBe('document_type');
    expect(byName.get('type')?.notNull).toBe(true);
    expect(byName.get('kind')?.getSQLType()).toBe('document_kind');
    expect(byName.get('kind')?.hasDefault).toBe(true);
    expect(schema.documentType.enumValues).toEqual([
      'services.service',
      'services.service-application-method',
      'services.service-agreement',
    ]);
    expect(schema.documentKind.enumValues).toEqual(['document', 'template']);
  });

  it('pins the template FK with a GENERATED template_kind and NO referential action', () => {
    // Postgres REJECTS `ON DELETE SET NULL` / `ON UPDATE CASCADE` on an FK containing a generated
    // column, so this FK's lack of an action is forced, not a preference. Re-adding one here
    // would make migration 0022 unappliable.
    const templateKind = cfg(schema.documents).columns.find((c) => c.name === 'template_kind');
    expect(templateKind?.generated, 'template_kind must be GENERATED').toBeTruthy();

    const fk = cfg(schema.documents).foreignKeys.find(
      (f) => f.getName() === 'documents_template_fk',
    );
    expect(fk, 'documents_template_fk must exist').toBeDefined();
    // drizzle normalises an omitted action to the SQL default, 'no action'.
    expect(fk?.onDelete ?? 'no action').toBe('no action');
    expect(fk?.onUpdate ?? 'no action').toBe('no action');
    expect(fk?.reference().columns.map((c) => c.name)).toEqual([
      'template_id',
      'type',
      'template_kind',
    ]);
  });
});

describe('schema — document_versions (feature 217: one content blob)', () => {
  it('replaces the data/schema/type_version_id triple with content + version_number', () => {
    const names = cfg(schema.documentVersions).columns.map((c) => c.name);
    expect(names).toContain('content');
    expect(names).toContain('version_number');
    expect(names).toContain('revision');
    expect(names).not.toContain('data');
    expect(names).not.toContain('schema');
    expect(names).not.toContain('type_version_id');
  });

  it('generates title and description from content, both nullable', () => {
    // `content` with no `uischema.label` generates NULL, and `->>` over a JSON OBJECT yields NULL
    // too — a rich (Lexical) description leaves `description` NULL. Marking either notNull would
    // break every such document.
    const byName = new Map(cfg(schema.documentVersions).columns.map((c) => [c.name, c]));
    for (const name of ['title', 'description'] as const) {
      expect(byName.get(name)?.generated, `${name} must be GENERATED`).toBeTruthy();
      expect(byName.get(name)?.notNull, `${name} must be nullable`).toBe(false);
    }
  });

  it('uses NO ACTION on the template FKs, not RESTRICT', () => {
    // The sibling `document_id ON DELETE CASCADE` empties this table in the same statement, so a
    // RESTRICT here is evaluated after the cascade and silently finds nothing to block.
    const fks = cfg(schema.documentVersions).foreignKeys;
    for (const name of [
      'document_versions_template_fk',
      'document_versions_template_version_fk',
    ] as const) {
      const fk = fks.find((f) => f.getName() === name);
      expect(fk, `${name} must exist`).toBeDefined();
      expect(fk?.onDelete ?? 'no action', `${name} must have no ON DELETE action`).toBe(
        'no action',
      );
    }
  });
});

describe('schema — document_version_history (append-only)', () => {
  it('names its version FK explicitly, within the 63-character identifier limit', () => {
    // drizzle's default name (document_version_history_document_version_id_document_versions_id_fk)
    // is 68 characters and Postgres would silently TRUNCATE it.
    const fk = cfg(schema.documentVersionHistory).foreignKeys.find((f) =>
      f.reference().columns.some((c) => c.name === 'document_version_id'),
    );
    expect(fk?.getName()).toBe('document_version_history_version_fk');
    expect(fk?.getName().length).toBeLessThanOrEqual(63);
  });

  it('records an action and an optional JSON Patch delta', () => {
    const names = cfg(schema.documentVersionHistory).columns.map((c) => c.name);
    expect(names).toEqual(
      expect.arrayContaining(['document_version_id', 'user_id', 'action', 'revision', 'delta']),
    );
    expect(schema.documentVersionHistoryAction.enumValues).toEqual([
      'created',
      'updated',
      'published',
      'archived',
    ]);
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
    expect(names).toContain('agreement_type');
    // Feature 217: both are GENERATED constants pinning the composite FK to a service-agreement
    // DOCUMENT (never a template) — they replace the old text column and its CHECK.
    const byName = new Map(columns.map((c) => [c.name, c]));
    expect(byName.get('agreement_type')?.getSQLType()).toBe('document_type');
    expect(byName.get('agreement_type')?.generated).toBeTruthy();
    expect(byName.get('agreement_kind')?.getSQLType()).toBe('document_kind');
    expect(byName.get('agreement_kind')?.generated).toBeTruthy();
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
  it.each([['document_versions', schema.documentVersions]] as const)(
    'marks %s.status as a generated column',
    (_name, table) => {
      const status = cfg(table).columns.find((c) => c.name === 'status');
      expect(status, 'status column must exist').toBeDefined();
      // generatedAlwaysAs(...) populates the column's `generated` config.
      expect(status?.generated, 'status must be GENERATED').toBeTruthy();
    },
  );
});

describe('schema — partial unique indexes', () => {
  it.each([
    ['document_versions', schema.documentVersions, 'document_id'],
    ['document_members', schema.documentMembers, 'document_id'],
    ['document_version_history', schema.documentVersionHistory, 'document_version_id'],
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

  it('references workspace_members by column SET, not order', () => {
    // The referenced unique is workspace_members_user_id_workspace_id_key on
    // (user_id, workspace_id) — the OPPOSITE order to the columns listed here. Postgres matches a
    // composite FK against the referenced unique by column set, so this is fine and needs no
    // index rebuild. Asserted as a SET so a future reorder on either side stays green.
    const fk = cfg(schema.documentMembers).foreignKeys.find(
      (f) => f.getName() === 'document_members_workspace_member_fk',
    );
    expect(fk, 'document_members_workspace_member_fk must exist').toBeDefined();
    expect(new Set(fk?.reference().foreignColumns.map((c) => c.name))).toEqual(
      new Set(['workspace_id', 'user_id']),
    );
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
