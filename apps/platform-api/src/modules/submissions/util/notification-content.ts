/** Citizen-facing content for a review-decision notification. Pure — unit-tested. */
export interface ReviewNotificationContent {
  type: string;
  title: string;
  body: string;
}

const TITLES = {
  approved: 'Your application was approved',
  needs_changes: 'Your application needs changes',
  rejected: 'Your application was rejected',
} as const;

export type ReviewDecision = keyof typeof TITLES;

export function reviewNotificationContent(
  decision: ReviewDecision,
  reference: string,
  reason?: string,
): ReviewNotificationContent {
  const note = reason !== undefined && reason !== '' ? ` Reviewer note: ${reason}` : '';
  return {
    type: `application.${decision}`,
    title: TITLES[decision],
    body: `A decision was recorded on application ${reference}.${note}`,
  };
}
