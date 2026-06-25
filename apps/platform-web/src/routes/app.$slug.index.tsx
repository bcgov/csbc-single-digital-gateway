import { createFileRoute } from '@tanstack/react-router';
import { OverviewPage } from '@/components/console/pages/overview';

export const Route = createFileRoute('/app/$slug/')({
  component: OverviewPage,
});
