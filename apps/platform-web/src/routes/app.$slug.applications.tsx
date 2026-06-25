import { createFileRoute } from '@tanstack/react-router';
import { ApplicationsPage } from '@/components/console/pages/applications';

export const Route = createFileRoute('/app/$slug/applications')({
  component: ApplicationsPage,
});
