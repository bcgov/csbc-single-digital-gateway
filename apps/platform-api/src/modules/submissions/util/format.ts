import type { SubmissionStatus } from '../dtos/submission.dtos';

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
 * Feature 217: `content` IS `{ schema, uischema }` (a `@repo/forms` StudioDocument), so there is no
 * longer a per-kind shape to branch on — a multi-stage form is a `Flow` root inside `uischema`,
 * not a different top-level object.
 */
export function normalizeContent(content: Record<string, unknown>): Record<string, unknown> {
  return {
    schema: (content['schema'] as Record<string, unknown> | undefined) ?? {
      type: 'object',
      properties: {},
    },
    uischema: (content['uischema'] as Record<string, unknown> | undefined) ?? {
      type: 'Form',
      elements: [],
    },
  };
}
