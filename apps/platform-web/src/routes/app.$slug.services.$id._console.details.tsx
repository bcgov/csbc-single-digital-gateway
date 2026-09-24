import { createFileRoute } from '@tanstack/react-router';
import { ServiceConsolePage } from '@/components/console/services/service-console-page';

/**
 * Feature 217: the schema-driven service details editor (`ServiceDetailsPage` → the JSONForms
 * `service-details-body`) is gone with the `@repo/react` renderers. The section falls back to the
 * shared "coming soon" page until the Form Studio is wired to the documents API.
 */
export const Route = createFileRoute('/app/$slug/services/$id/_console/details')({
  component: () => <ServiceConsolePage title="Service details" />,
});
