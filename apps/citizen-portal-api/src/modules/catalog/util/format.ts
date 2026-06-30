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

/**
 * Read a display string out of a service version's `data` JSONB (where the meaningful title and
 * description live), falling back to the document column when absent/blank.
 */
export function serviceDataString(
  data: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const value = data[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

/** Split a document-type version `definition` JSONB into the `{ schema, uischema }` a renderer needs. */
export function definitionSchemas(definition: unknown): {
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
} {
  const def = (definition ?? {}) as { schema?: unknown; uischema?: unknown };
  return {
    schema: (def.schema as Record<string, unknown> | undefined) ?? {},
    uischema: (def.uischema as Record<string, unknown> | undefined) ?? {},
  };
}
