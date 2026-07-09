import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { createdAt, timestamptz, updatedAt, uuidPk } from './_shared';
import { documentTypes, documentTypeVersions } from './document-types';
import { users } from './users';
import { workspaceMembers, workspaces } from './workspaces';

/**
 * A document instance of a given type within a workspace. Carries composite unique keys
 * `(id, type_id)` and `(id, workspace_id)` that back the composite FKs on
 * `document_versions`, `document_members`, and `submissions`. Type/workspace deletes are
 * restricted so a document is never orphaned.
 */
export const documents = pgTable(
  'documents',
  {
    id: uuidPk(),
    typeId: uuid('type_id').notNull(),
    // Nullable: NULL = a GLOBAL document (shared catalog, e.g. an admin-authored service
    // agreement), like document_types.workspace_id. Non-NULL = workspace-scoped as usual.
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'restrict' }),
    // `kind` is denormalized from the type and pinned by the composite FK below so it can never
    // drift. It lets document_references DB-enforce "owner is a service" / "target kind matches".
    kind: text('kind').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    // Composite FK (type_id, kind) → document_types(id, kind): enforces the type exists AND the
    // denormalized kind equals the type's real kind. Replaces the plain type_id FK.
    foreignKey({
      columns: [table.typeId, table.kind],
      foreignColumns: [documentTypes.id, documentTypes.kind],
      name: 'documents_type_fk',
    }).onDelete('restrict'),
    // Composite UNIQUE CONSTRAINTS (not indexes) — referenced targets of the composite FKs on
    // document_versions, document_members, submissions, and document_references.
    unique('documents_id_type_id_key').on(table.id, table.typeId),
    unique('documents_id_workspace_id_key').on(table.id, table.workspaceId),
    unique('documents_id_kind_key').on(table.id, table.kind),
    index('documents_type_id_idx').on(table.typeId),
    index('documents_workspace_id_idx').on(table.workspaceId),
  ],
);

export const documentMembersRole = pgEnum('document_members_role', ['admin', 'editor', 'viewer']);

/**
 * Per-document membership. Both FKs are composite and workspace-scoped, so a member can
 * only ever reference a document and a workspace_member in the SAME workspace — cross-
 * workspace references are structurally impossible.
 */
export const documentMembers = pgTable(
  'document_members',
  {
    id: uuidPk(),
    documentId: uuid('document_id').notNull(),
    userId: uuid('user_id').notNull(),
    workspaceId: uuid('workspace_id').notNull(),
    role: documentMembersRole('role').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.documentId, table.workspaceId],
      foreignColumns: [documents.id, documents.workspaceId],
      name: 'document_members_document_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId, table.workspaceId],
      foreignColumns: [workspaceMembers.userId, workspaceMembers.workspaceId],
      name: 'document_members_workspace_member_fk',
    }).onDelete('cascade'),
    uniqueIndex('document_members_document_id_user_id_key').on(table.documentId, table.userId),
    index('document_members_user_id_workspace_id_idx').on(table.userId, table.workspaceId),
  ],
);

export const documentVersionsStatus = pgEnum('document_versions_status', [
  'draft',
  'published',
  'archived',
]);

/**
 * A version of a document. `type_id` is denormalized from the document so the two
 * composite FKs pin a version's type to its document's type (making the document's type
 * effectively immutable once a version exists). `status` is GENERATED from the timestamps;
 * one published version per document is enforced by a partial unique index.
 */
export const documentVersions = pgTable(
  'document_versions',
  {
    id: uuidPk(),
    documentId: uuid('document_id').notNull(),
    typeId: uuid('type_id').notNull(),
    typeVersionId: uuid('type_version_id').notNull(),
    version: integer('version').notNull(),
    // Filled values (services) or default values (forms).
    data: jsonb('data').$type<Record<string, unknown>>().notNull().default({}),
    // The form's STRUCTURE, copied from the type definition for form documents ({schema,uischema} for
    // basic-form, {stages} for multi-stage-form). NULL for services today (future: templated services).
    schema: jsonb('schema').$type<Record<string, unknown>>(),
    status: documentVersionsStatus('status')
      .notNull()
      // Per-branch enum casts (see document-types.ts) so the STORED generated column
      // expression is IMMUTABLE.
      .generatedAlwaysAs(
        sql`CASE WHEN archived_at IS NOT NULL THEN 'archived'::document_versions_status WHEN published_at IS NOT NULL THEN 'published'::document_versions_status ELSE 'draft'::document_versions_status END`,
      ),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: createdAt(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.documentId, table.typeId],
      foreignColumns: [documents.id, documents.typeId],
      name: 'document_versions_document_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.typeVersionId, table.typeId],
      foreignColumns: [documentTypeVersions.id, documentTypeVersions.typeId],
      name: 'document_versions_type_version_fk',
    }).onDelete('restrict'),
    // Composite UNIQUE CONSTRAINT — referenced target of submissions' composite FK.
    unique('document_versions_id_document_id_key').on(table.id, table.documentId),
    uniqueIndex('document_versions_document_id_version_key').on(table.documentId, table.version),
    index('document_versions_type_id_idx').on(table.typeId),
    index('document_versions_type_version_id_idx').on(table.typeVersionId),
    uniqueIndex('document_versions_one_published_key')
      .on(table.documentId)
      .where(sql`status = 'published'`),
  ],
);

/**
 * Append-only audit of who edited a document version. `user_id` is NOT NULL + restrict so
 * the trail survives user soft-deletes and is guarded against accidental hard-deletes.
 */
export const documentVersionContributors = pgTable(
  'document_version_contributors',
  {
    id: uuidPk(),
    documentVersionId: uuid('document_version_id')
      .notNull()
      .references(() => documentVersions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    firstUpdateAt: timestamptz('first_update_at').notNull().defaultNow(),
    lastUpdateAt: timestamptz('last_update_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('document_version_contributors_dv_id_user_id_key').on(
      table.documentVersionId,
      table.userId,
    ),
    index('document_version_contributors_user_id_idx').on(table.userId),
  ],
);

export const documentReferencesRelation = pgEnum('document_references_relation', [
  'related_service',
  'application_form',
  'service_agreement',
]);

/**
 * A reference owned by a service `document_version` (owner) to another document's version (target):
 * other services (`related_service`, optional) or forms (`application_form`, a way to apply). Both
 * sides are version-pinned. The composite FKs make the type/workspace rules DB-enforced:
 *  - owner is a service (`owner_kind = 'service'` + (owner_document_id, owner_kind) → documents(id, kind))
 *  - target kind matches the relation (CHECK + (target_document_id, target_kind) → documents(id, kind))
 *  - both sides in the same workspace (shared `workspace_id` + composite FKs to documents(id, workspace_id))
 *  - version ↔ document consistency on each side; no duplicate target; no self-reference.
 * The "a form must be referenced by ≥1 service" minimum is enforced in the app (not expressible as FKs).
 */
export const documentReferences = pgTable(
  'document_references',
  {
    id: uuidPk(),
    ownerVersionId: uuid('owner_version_id').notNull(),
    ownerDocumentId: uuid('owner_document_id').notNull(),
    ownerKind: text('owner_kind').notNull(),
    // The pinned target version, or NULL for a `service_agreement` reference — which points at the
    // agreement DOCUMENT and always resolves the current published version (initiative
    // shared-service-agreements). `application_form` / `related_service` keep a non-null pin.
    targetVersionId: uuid('target_version_id'),
    targetDocumentId: uuid('target_document_id').notNull(),
    targetKind: text('target_kind').notNull(),
    workspaceId: uuid('workspace_id').notNull(),
    // The target document's workspace, or NULL when the target is a GLOBAL agreement (only the
    // `service_agreement` relation may be NULL here). Lets the target side be global-or-same-ws
    // independently of the owner, which is always workspace-scoped (a service).
    targetWorkspaceId: uuid('target_workspace_id'),
    relation: documentReferencesRelation('relation').notNull(),
    // Button label for an `application_form` reference (what a user clicks to apply). NULL for
    // `related_service` references.
    label: text('label'),
    position: integer('position').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.ownerVersionId, table.ownerDocumentId],
      foreignColumns: [documentVersions.id, documentVersions.documentId],
      name: 'document_references_owner_version_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.targetVersionId, table.targetDocumentId],
      foreignColumns: [documentVersions.id, documentVersions.documentId],
      name: 'document_references_target_version_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.ownerDocumentId, table.ownerKind],
      foreignColumns: [documents.id, documents.kind],
      name: 'document_references_owner_kind_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.targetDocumentId, table.targetKind],
      foreignColumns: [documents.id, documents.kind],
      name: 'document_references_target_kind_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.ownerDocumentId, table.workspaceId],
      foreignColumns: [documents.id, documents.workspaceId],
      name: 'document_references_owner_ws_fk',
    }).onDelete('cascade'),
    // Target side is keyed on target_workspace_id (not the shared workspace_id): NULL ⇒ a global
    // agreement (FK skipped); non-NULL ⇒ the target must exist in that workspace.
    foreignKey({
      columns: [table.targetDocumentId, table.targetWorkspaceId],
      foreignColumns: [documents.id, documents.workspaceId],
      name: 'document_references_target_ws_fk',
    }).onDelete('restrict'),
    unique('document_references_owner_version_target_doc_key').on(
      table.ownerVersionId,
      table.targetDocumentId,
    ),
    check('document_references_owner_kind_chk', sql`${table.ownerKind} = 'service'`),
    check(
      // `relation::text` (not the enum literal) so a fresh single-transaction migrate can apply this
      // CHECK in the same run that ADDs the `service_agreement` enum value (Postgres forbids using a
      // not-yet-committed enum value; a text comparison sidesteps it). See migration 0014.
      'document_references_relation_kind_chk',
      sql`(${table.relation} = 'related_service' AND ${table.targetKind} = 'service') OR (${table.relation} = 'application_form' AND ${table.targetKind} IN ('basic-form', 'multi-stage-form')) OR (${table.relation}::text = 'service_agreement' AND ${table.targetKind} = 'service-agreement')`,
    ),
    // A scoped target must be in the owner's workspace; a NULL target_workspace_id (global) is
    // allowed only for the service_agreement relation (services/forms are never global).
    check(
      'document_references_target_ws_scope_chk',
      sql`${table.targetWorkspaceId} IS NULL OR ${table.targetWorkspaceId} = ${table.workspaceId}`,
    ),
    check(
      'document_references_target_ws_global_only_chk',
      sql`${table.targetWorkspaceId} IS NOT NULL OR ${table.relation}::text = 'service_agreement'`,
    ),
    // Only a `service_agreement` reference may omit the version pin (it points at the document and
    // resolves current-published); forms/related-services must pin a version. `relation::text` per
    // the enum-in-CHECK migrate rule.
    check(
      'document_references_agreement_no_version_chk',
      sql`${table.targetVersionId} IS NOT NULL OR ${table.relation}::text = 'service_agreement'`,
    ),
    check(
      'document_references_no_self_chk',
      sql`${table.ownerDocumentId} <> ${table.targetDocumentId}`,
    ),
    index('document_references_target_document_id_idx').on(table.targetDocumentId),
    index('document_references_owner_version_id_idx').on(table.ownerVersionId),
    index('document_references_workspace_id_idx').on(table.workspaceId),
  ],
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentReference = typeof documentReferences.$inferSelect;
export type NewDocumentReference = typeof documentReferences.$inferInsert;
export type DocumentMember = typeof documentMembers.$inferSelect;
export type NewDocumentMember = typeof documentMembers.$inferInsert;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type NewDocumentVersion = typeof documentVersions.$inferInsert;
export type DocumentVersionContributor = typeof documentVersionContributors.$inferSelect;
export type NewDocumentVersionContributor = typeof documentVersionContributors.$inferInsert;
