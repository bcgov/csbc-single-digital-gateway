import { createFileRoute } from '@tanstack/react-router';
import { ServiceDetailsPage } from '@/components/console/services/service-details-page';

export const Route = createFileRoute(
  '/app/$slug/services/$id/_console/versions/$versionId/details',
)({
  component: ServiceDetailsPage,
});
