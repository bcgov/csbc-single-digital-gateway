import { createFileRoute } from '@tanstack/react-router';
import { SubmissionDetail } from '@/components/console/submissions/submission-detail';

export const Route = createFileRoute('/app/$slug/submissions/$id')({
  component: SubmissionDetail,
});
