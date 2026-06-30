import { createFileRoute } from '@tanstack/react-router';
import { ServiceVersionPage } from '@/components/service-version-page';

export const Route = createFileRoute('/services/$serviceId/versions/$versionId')({
  component: ServiceVersionPage,
});
