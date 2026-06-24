import { foreignKey, index, jsonb, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';

import { createdAt, uuidPk } from './_shared';
import { submissions, submissionVersions } from './submissions';
import { users } from './users';

export const reviewsDecision = pgEnum('reviews_decision', [
  'approved',
  'rejected',
  'flagged',
  'needs_changes',
  'escalated',
  'no_action',
]);

/**
 * Append-only audit of an internal user's review decision on a specific submission_version.
 * Immutable: there is no `updated_at` and rows are never edited or deleted — a change of mind
 * is a NEW row. `reviewer_id → users` (RESTRICT) is the durable, soft-deletable identity, so
 * a review survives the reviewer's removal from the workspace; "reviewer belongs to the
 * workspace" is enforced in the app at write time, NOT by an FK to workspace_members (which
 * would force blocking removal or deleting history). The composite FKs pin a review to one
 * submission_version and one workspace. See `.mdd/docs/30`.
 */
export const reviews = pgTable(
  'reviews',
  {
    id: uuidPk(),
    submissionVersionId: uuid('submission_version_id').notNull(),
    submissionId: uuid('submission_id').notNull(),
    workspaceId: uuid('workspace_id').notNull(),
    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    decision: reviewsDecision('decision').notNull(),
    reason: text('reason'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [
    // The reviewed version provably belongs to the cited submission.
    foreignKey({
      columns: [table.submissionVersionId, table.submissionId],
      foreignColumns: [submissionVersions.id, submissionVersions.submissionId],
      name: 'reviews_submission_version_fk',
    }).onDelete('cascade'),
    // The review can't cross workspaces.
    foreignKey({
      columns: [table.submissionId, table.workspaceId],
      foreignColumns: [submissions.id, submissions.workspaceId],
      name: 'reviews_submission_fk',
    }).onDelete('cascade'),
    index('reviews_submission_version_id_idx').on(table.submissionVersionId),
    index('reviews_submission_id_created_at_idx').on(table.submissionId, table.createdAt),
    index('reviews_reviewer_id_idx').on(table.reviewerId),
  ],
);

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
