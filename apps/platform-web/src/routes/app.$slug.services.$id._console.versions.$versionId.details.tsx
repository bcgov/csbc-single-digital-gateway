import { createFileRoute } from '@tanstack/react-router';
import { ServiceConsolePage } from '@/components/console/services/service-console-page';

/** Feature 217: the version permalink shares the details section's placeholder. */
export const Route = createFileRoute(
  '/app/$slug/services/$id/_console/versions/$versionId/details',
)({
  component: () => <ServiceConsolePage title="Service details" />,
});
