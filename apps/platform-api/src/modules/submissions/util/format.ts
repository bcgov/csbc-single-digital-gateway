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

/** A stable, human-facing reference for a submission: `YYYYMMDD-XXXX` (created date + id suffix). */
export function submissionReference(submissionId: string, createdAt: Date): string {
  const date = createdAt.toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = submissionId.replaceAll('-', '').slice(-4).toUpperCase();
  return `${date}-${suffix}`;
}

/** Coerce a form version's stored `schema` JSONB into a render structure, defaulting missing arrays. */
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
