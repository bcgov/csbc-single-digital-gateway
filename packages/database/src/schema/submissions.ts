import { sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { createdAt, updatedAt, uuidPk } from './_shared';
import { documents, documentVersions } from './documents';
import { users } from './users';

/**
 * Submission container: who submitted which form, in which workspace. Stable references
 * only — the answers and workflow status live on `submission_versions` (one row per
 * revision), mirroring documents/document_versions. `user_id` is nullable (NULL =
 * anonymous). Both composite FKs are RESTRICT so a document/version with submissions can't
 * be hard-deleted out from under them. See `.mdd/docs/30`.
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
    // Composite UNIQUE CONSTRAINT (not index) — referenced target of submission_versions'
    // and reviews' composite FKs.
    unique('submissions_id_workspace_id_key').on(table.id, table.workspaceId),
    index('submissions_document_id_idx').on(table.documentId),
    index('submissions_user_id_idx').on(table.userId),
    index('submissions_workspace_id_idx').on(table.workspaceId),
  ],
);

export const submissionVersionsStatus = pgEnum('submission_versions_status', [
  'draft',
  'pending',
  'in_review',
  'approved',
  'rejected',
  'needs_changes',
  'withdrawn',
]);

/**
 * One revision of a submission's answers plus its workflow status. Unlike
 * `document_versions.status` (GENERATED from timestamps), `status` here is a WRITABLE state
 * machine advanced by the submissions service — the review-workflow states (in_review,
 * approved, …) are reviewer-driven and not timestamp-derivable. `submitted_at`/`withdrawn_at`
 * record the citizen-driven transitions; reviewer transitions are recorded in `reviews`.
 * At most one approved version per submission (partial unique). See doc 30 for the state
 * machine and the decision→status mapping.
 */
export const submissionVersions = pgTable(
  'submission_versions',
  {
    id: uuidPk(),
    submissionId: uuid('submission_id').notNull(),
    // Denormalized from the submission so the composite FK keeps a version pinned to its
    // submission's workspace (cross-workspace references are structurally impossible).
    workspaceId: uuid('workspace_id').notNull(),
    version: integer('version').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>().notNull().default({}),
    status: submissionVersionsStatus('status').notNull().default('draft'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.submissionId, table.workspaceId],
      foreignColumns: [submissions.id, submissions.workspaceId],
      name: 'submission_versions_submission_fk',
    }).onDelete('cascade'),
    // Composite UNIQUE CONSTRAINT — referenced target of reviews' composite FK.
    unique('submission_versions_id_submission_id_key').on(table.id, table.submissionId),
    uniqueIndex('submission_versions_submission_id_version_key').on(
      table.submissionId,
      table.version,
    ),
    // At most one approved version per submission (mirrors documents' one-published rule).
    // Not deferrable — promotion is demote-then-promote in one txn (approval is terminal, so
    // this is rarely exercised).
    uniqueIndex('submission_versions_one_approved_key')
      .on(table.submissionId)
      .where(sql`status = 'approved'`),
    index('submission_versions_workspace_id_status_idx').on(table.workspaceId, table.status),
    index('submission_versions_status_idx').on(table.status),
  ],
);

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type SubmissionVersion = typeof submissionVersions.$inferSelect;
export type NewSubmissionVersion = typeof submissionVersions.$inferInsert;
