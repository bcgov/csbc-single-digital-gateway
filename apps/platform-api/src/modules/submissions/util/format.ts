import type { SubmissionStatus } from '../dtos/submission.dtos';
import { documentContentOf } from '@repo/documents/content';

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  in_review: 'In review',
  approved: 'Approved',
  rejected: 'Rejected',
  needs_changes: 'Needs changes',
  withdrawn: 'Withdrawn',
};

export function submissionStatusLabel(status: SubmissionStatus): string {
  return STATUS_LABELS[status];
}

/** Staff review-queue visibility (feature 151): a `draft` is a citizen's un-submitted, in-progress
 * application and is never shown to staff. Every other status is a submitted/decided state. This is the
 * single source of truth for both the list filter and the detail 404. */
export function isStaffVisibleSubmission(status: SubmissionStatus): boolean {
  return status !== 'draft';
}

/** A stable, human-facing reference for a submission: `YYYYMMDD-XXXX` (created date + id suffix). */
export function submissionReference(submissionId: string, createdAt: Date): string {
  const date = createdAt.toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = submissionId.replaceAll('-', '').slice(-4).toUpperCase();
  return `${date}-${suffix}`;
}

/**
 * Coerce a document version's stored `content` JSONB into a render structure.
 *
 * Doc 275: `content` IS `{ schema, variants }` (a `@repo/documents` DocumentContent), so there is no per-kind
 * shape to branch on — a routed application is a `Funnel` root inside each variant, not a different top-level object.
 * Malformed content degrades to an empty Form rather than throwing.
 */
export function normalizeContent(content: Record<string, unknown>): Record<string, unknown> {
  const parsed = documentContentOf(content);
  return {
    schema: parsed?.schema ?? { type: 'object', properties: {} },
    variants: parsed?.variants ?? { default: { type: 'Form', elements: [] } },
  };
}
