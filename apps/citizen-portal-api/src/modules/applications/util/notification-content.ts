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
