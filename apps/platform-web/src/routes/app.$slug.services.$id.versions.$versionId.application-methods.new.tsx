import { createFileRoute } from '@tanstack/react-router';
import { ApplicationMethodModal } from '@/components/console/services/application-method-modal';
import { ServiceDetail } from '@/components/console/services/service-detail';

/** `…/application-methods/new` — the detail with the "New application method" modal open over it. */
function NewApplicationMethod() {
  const { slug, id, versionId } = Route.useParams();
  return (
    <>
      <ServiceDetail slug={slug} id={id} versionId={versionId} tab="methods" />
      <ApplicationMethodModal />
    </>
  );
}

export const Route = createFileRoute(
  '/app/$slug/services/$id/versions/$versionId/application-methods/new',
)({
  component: NewApplicationMethod,
});
