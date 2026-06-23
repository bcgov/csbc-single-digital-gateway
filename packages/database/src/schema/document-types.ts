import { sql } from 'drizzle-orm';
import {
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

import { createdAt, updatedAt, uuidPk } from './_shared';
import { workspaces } from './workspaces';

/**
 * A catalog of document types. `workspace_id` is nullable: NULL = global/shared catalog,
 * non-NULL = workspace-owned (future). Restrict on delete so a workspace can't be removed
 * while it still owns types.
 */
export const documentTypes = pgTable('document_types', {
  id: uuidPk(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  kind: text('kind').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const documentTypeVersionsStatus = pgEnum('document_type_versions_status', [
  'draft',
  'published',
  'archived',
]);

/**
 * A versioned definition of a document type. `status` is GENERATED from the timestamps —
 * never write it directly; mutate `published_at` / `archived_at`. At most one published
 * version per type is enforced by a partial unique index (not deferrable — see the doc's
 * demote-then-promote rule).
 */
export const documentTypeVersions = pgTable(
  'document_type_versions',
  {
    id: uuidPk(),
    typeId: uuid('type_id')
      .notNull()
      .references(() => documentTypes.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    definition: jsonb('definition').$type<Record<string, unknown>>().notNull().default({}),
    status: documentTypeVersionsStatus('status')
      .notNull()
      // Per-branch enum casts (not an outer cast of a text CASE) so the expression is
      // IMMUTABLE — required for a STORED generated column.
      .generatedAlwaysAs(
        sql`CASE WHEN archived_at IS NOT NULL THEN 'archived'::document_type_versions_status WHEN published_at IS NOT NULL THEN 'published'::document_type_versions_status ELSE 'draft'::document_type_versions_status END`,
      ),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: createdAt(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    updatedAt: updatedAt(),
  },
  (table) => [
    // Composite UNIQUE CONSTRAINT — referenced target of document_versions' composite FK.
    unique('document_type_versions_id_type_id_key').on(table.id, table.typeId),
    uniqueIndex('document_type_versions_type_id_version_key').on(table.typeId, table.version),
    // One published version per type.
    uniqueIndex('document_type_versions_one_published_key')
      .on(table.typeId)
      .where(sql`status = 'published'`),
  ],
);

export type DocumentType = typeof documentTypes.$inferSelect;
export type NewDocumentType = typeof documentTypes.$inferInsert;
export type DocumentTypeVersion = typeof documentTypeVersions.$inferSelect;
export type NewDocumentTypeVersion = typeof documentTypeVersions.$inferInsert;
