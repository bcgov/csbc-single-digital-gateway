import { sql } from 'drizzle-orm';
import { foreignKey, index, jsonb, pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { createdAt, updatedAt, uuidPk } from './_shared';
import { documents, documentVersions } from './documents';
import { users } from './users';

export const submissionsStatus = pgEnum('submissions_status', ['draft', 'submitted']);

/**
 * A submission against a specific document version. `user_id` is nullable (NULL =
 * anonymous). `status` is GENERATED from `submitted_at`. Both composite FKs are RESTRICT so
 * a document/version with submissions can't be hard-deleted out from under them.
 */
export const submissions = pgTable(
  'submissions',
  {
    id: uuidPk(),
    documentId: uuid('document_id').notNull(),
    documentVersionId: uuid('document_version_id').notNull(),
    // Nullable: NULL = anonymous submission. Cascade so deleting a user clears their
    // (non-anonymous) submissions.
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').notNull(),
    status: submissionsStatus('status')
      .notNull()
      // Per-branch enum casts (see document-types.ts) so the STORED generated column
      // expression is IMMUTABLE.
      .generatedAlwaysAs(
        sql`CASE WHEN submitted_at IS NOT NULL THEN 'submitted'::submissions_status ELSE 'draft'::submissions_status END`,
      ),
    data: jsonb('data').$type<Record<string, unknown>>().notNull().default({}),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.documentId, table.workspaceId],
      foreignColumns: [documents.id, documents.workspaceId],
      name: 'submissions_document_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.documentVersionId, table.documentId],
      foreignColumns: [documentVersions.id, documentVersions.documentId],
      name: 'submissions_document_version_fk',
    }).onDelete('restrict'),
    index('submissions_document_version_id_created_at_idx').on(
      table.documentVersionId,
      table.createdAt,
    ),
    index('submissions_document_id_idx').on(table.documentId),
    index('submissions_user_id_idx').on(table.userId),
    index('submissions_workspace_id_idx').on(table.workspaceId),
  ],
);

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
