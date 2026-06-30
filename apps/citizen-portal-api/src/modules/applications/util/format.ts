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
 * Coerce a form version's stored `schema` JSONB into the structure the renderer needs, defaulting
 * any missing arrays/fields (a template-seeded blob can omit them — see CLAUDE.md normalize rule).
 */
export function normalizeFormStructure(
  kind: string,
  structure: Record<string, unknown>,
): Record<string, unknown> {
  if (kind === 'multi-stage-form') {
    return {
      name: typeof structure['name'] === 'string' ? structure['name'] : '',
      description: typeof structure['description'] === 'string' ? structure['description'] : '',
      stages: Array.isArray(structure['stages']) ? structure['stages'] : [],
      edges: Array.isArray(structure['edges']) ? structure['edges'] : [],
    };
  }
  return {
    schema: (structure['schema'] as Record<string, unknown> | undefined) ?? {
      type: 'object',
      properties: {},
    },
    uischema: (structure['uischema'] as Record<string, unknown> | undefined) ?? {
      type: 'VerticalLayout',
      elements: [],
    },
  };
}
