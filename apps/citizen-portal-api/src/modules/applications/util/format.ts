import type { SubmissionStatus } from '../dtos/application.dtos';

/** Human-facing label for a submission status (matches the citizen UI badges). */
const STATUS_LABELS: Record<SubmissionStatus, string> = {
  draft: 'Draft',
  pending: 'Submitted',
  in_review: 'Review',
  approved: 'Approved',
  rejected: 'Rejected',
  needs_changes: 'Action needed',
  withdrawn: 'Withdrawn',
};

export function submissionStatusLabel(status: SubmissionStatus): string {
  return STATUS_LABELS[status];
}

/**
 * A stable, human-facing reference for an application, derived from its submission so it needs no
 * extra column: `YYYYMMDD-XXXX` (creation date + the last 4 hex of the submission id).
 */
export function applicationReference(submissionId: string, createdAt: Date): string {
  const date = createdAt.toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = submissionId.replaceAll('-', '').slice(-4).toUpperCase();
  return `${date}-${suffix}`;
}

/**
 * Coerce a document version's stored `content` JSONB into the structure the renderer needs,
 * defaulting either half when absent.
 *
 * Feature 217: `content` IS `{ schema, uischema }` (a `@repo/forms` StudioDocument), so there is no
 * per-kind shape to branch on — a staged application is a `Flow` root inside `uischema`, not a
 * different top-level object.
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
