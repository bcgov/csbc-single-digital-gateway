import { createFileRoute } from '@tanstack/react-router';
import { ApplicationMethodEditPage } from '@/components/console/services/application-method-edit-page';

export const Route = createFileRoute(
  '/app/$slug/services/$id/old/edit/versions/$versionId/application-methods/$applicationMethodId',
)({
  component: ApplicationMethodEditPage,
});
