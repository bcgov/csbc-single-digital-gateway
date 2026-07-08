import { createFileRoute } from '@tanstack/react-router';
import { ServiceAgreementEditPage } from '@/components/console/service-agreements/console-agreements-pages';

/** `…/services/:id/versions/:versionId/service-agreements/:agreementId` — edit an attached
 * agreement in the service context (replaces the detail; back returns to the service). */
export const Route = createFileRoute(
  '/app/$slug/services/$id/versions/$versionId/service-agreements/$agreementId',
)({
  component: ServiceAgreementEditPage,
});
