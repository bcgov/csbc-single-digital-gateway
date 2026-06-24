import { createFileRoute } from '@tanstack/react-router';
import { SubmissionsPage } from '@/components/console/pages/submissions';

export const Route = createFileRoute('/app/submissions')({
  component: SubmissionsPage,
});
