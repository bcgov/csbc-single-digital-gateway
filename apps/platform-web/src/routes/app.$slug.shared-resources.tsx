import { createFileRoute } from '@tanstack/react-router';
import { SharedResourcesPage } from '@/components/console/pages/shared-resources';

export const Route = createFileRoute('/app/$slug/shared-resources')({
  component: SharedResourcesPage,
});
