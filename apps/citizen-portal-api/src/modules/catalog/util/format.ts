import type { ApplicationStatus } from '../dtos/catalog.dtos';

/** Human-facing status label for an application (matches the citizen UI badges). */
const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: 'Draft',
  pending: 'Submitted',
  in_review: 'Review',
  approved: 'Approved',
  rejected: 'Rejected',
  needs_changes: 'Action needed',
  withdrawn: 'Withdrawn',
};

export function applicationStatusLabel(status: ApplicationStatus): string {
  return STATUS_LABELS[status];
}

/**
 * A stable, human-facing reference for an application, derived from its submission so it needs
 * no extra column: `YYYYMMDD-XXXX` (creation date + the last 4 hex of the submission id).
 */
export function applicationReference(submissionId: string, createdAt: Date): string {
  const date = createdAt.toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = submissionId.replaceAll('-', '').slice(-4).toUpperCase();
  return `${date}-${suffix}`;
}

/** The historical title of a service version: the version's own `data.title`, else the doc title. */
export function serviceVersionTitle(data: Record<string, unknown>, fallback: string): string {
  const title = data['title'];
  return typeof title === 'string' && title.trim().length > 0 ? title : fallback;
}
