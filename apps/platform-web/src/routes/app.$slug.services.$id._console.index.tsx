import { createFileRoute } from '@tanstack/react-router';
import { ServiceConsolePage } from '@/components/console/services/service-console-page';

/** Dashboard — the default section at the bare `…/services/:id` route. */
function ServiceDashboard() {
  return <ServiceConsolePage title="Dashboard" />;
}

export const Route = createFileRoute('/app/$slug/services/$id/_console/')({
  component: ServiceDashboard,
});
