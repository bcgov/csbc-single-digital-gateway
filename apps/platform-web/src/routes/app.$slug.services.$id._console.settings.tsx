import { createFileRoute } from '@tanstack/react-router';
import { ServiceConsolePage } from '@/components/console/services/service-console-page';

/** Settings section. */
function ServiceSettingsSection() {
  return <ServiceConsolePage title="Settings" description="Manage this service's settings." />;
}

export const Route = createFileRoute('/app/$slug/services/$id/_console/settings')({
  component: ServiceSettingsSection,
});
