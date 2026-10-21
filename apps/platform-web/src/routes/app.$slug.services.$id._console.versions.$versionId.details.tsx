import { createFileRoute } from '@tanstack/react-router';
import { ServiceDetailsView } from '@/components/console/services/service-details-view';

/** Doc 229: the Details section opened on one version — what the header's version picker navigates to. */
function ServiceVersionDetailsRoute() {
  const { slug, id, versionId } = Route.useParams();
  return <ServiceDetailsView slug={slug} id={id} versionId={versionId} />;
}

export const Route = createFileRoute(
  '/app/$slug/services/$id/_console/versions/$versionId/details',
)({
  component: ServiceVersionDetailsRoute,
});
