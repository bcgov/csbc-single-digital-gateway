import { createFileRoute } from '@tanstack/react-router';
import { ServiceConsolePage } from '@/components/console/services/service-console-page';

/** Analytics section. */
function ServiceAnalyticsSection() {
  return <ServiceConsolePage title="Analytics" />;
}

export const Route = createFileRoute('/app/$slug/services/$id/_console/analytics')({
  component: ServiceAnalyticsSection,
});
