/** Citizen-facing content for the submission-received confirmation. Pure — unit-tested. */
export interface SubmissionReceivedContent {
  type: string;
  title: string;
  body: string;
}

export function submissionReceivedContent(reference: string): SubmissionReceivedContent {
  return {
    type: 'application.received',
    title: 'We received your application',
    body: `Your application ${reference} was received and is pending review.`,
  };
}

/** Staff-facing alert for a new submission (feature 124). Pure — unit-tested. */
export function staffSubmissionContent(
  reference: string,
  serviceTitle: string | null,
): SubmissionReceivedContent {
  const service = serviceTitle !== null && serviceTitle !== '' ? ` for ${serviceTitle}` : '';
  return {
    type: 'submission.received',
    title: 'New application received',
    body: `Application ${reference}${service} was submitted and is ready for review.`,
  };
}
