import { createFileRoute } from '@tanstack/react-router';
import { ServiceVersionDetailsLayout } from '@/components/console/services/service-version-details-layout';

export const Route = createFileRoute(
  '/app/$slug/services/$id/_console/versions/$versionId/details',
)({
  component: ServiceVersionDetailsLayout,
});
