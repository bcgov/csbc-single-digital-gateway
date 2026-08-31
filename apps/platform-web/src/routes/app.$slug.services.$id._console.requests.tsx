import { createFileRoute } from '@tanstack/react-router';
import { ServiceConsolePage } from '@/components/console/services/service-console-page';

/** Service requests section. */
function ServiceRequestsSection() {
  return <ServiceConsolePage title="Service requests" />;
}

export const Route = createFileRoute('/app/$slug/services/$id/_console/requests')({
  component: ServiceRequestsSection,
});
