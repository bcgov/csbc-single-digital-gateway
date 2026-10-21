import { createFileRoute } from '@tanstack/react-router';
import { ApplicationDetailPage } from '@/components/application-detail-page';

/** Doc 292: one of the signed-in citizen's applications — status, answers, revise and resubmit. */
export const Route = createFileRoute('/applications/$applicationId')({
  component: ApplicationDetailPage,
});
