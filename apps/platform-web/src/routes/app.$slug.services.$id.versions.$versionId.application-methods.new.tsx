import { createFileRoute } from '@tanstack/react-router';
import { ApplicationMethodModal } from '@/components/console/services/application-method-modal';
import { ServiceDetail } from '@/components/console/services/service-detail';

/** `…/application-methods/new` — the detail with the "New application method" modal open over it. */
function NewApplicationMethod() {
  return (
    <>
      <ServiceDetail />
      <ApplicationMethodModal />
    </>
  );
}

export const Route = createFileRoute(
  '/app/$slug/services/$id/versions/$versionId/application-methods/new',
)({
  component: NewApplicationMethod,
});
