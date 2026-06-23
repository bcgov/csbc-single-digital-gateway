import { sql } from 'drizzle-orm';
import {
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
    typeId: uuid('type_id')
      .notNull()
      .references(() => documentTypes.id, { onDelete: 'restrict' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    // Composite UNIQUE CONSTRAINTS (not indexes) — referenced targets of the composite
    // FKs on document_versions, document_members, and submissions.
    unique('documents_id_type_id_key').on(table.id, table.typeId),
    unique('documents_id_workspace_id_key').on(table.id, table.workspaceId),
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
    data: jsonb('data').$type<Record<string, unknown>>().notNull().default({}),
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

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentMember = typeof documentMembers.$inferSelect;
export type NewDocumentMember = typeof documentMembers.$inferInsert;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type NewDocumentVersion = typeof documentVersions.$inferInsert;
export type DocumentVersionContributor = typeof documentVersionContributors.$inferSelect;
export type NewDocumentVersionContributor = typeof documentVersionContributors.$inferInsert;
