import { createFileRoute } from '@tanstack/react-router';
import { ServiceDetailsView } from '@/components/console/services/service-details-view';

/** Doc 229: the service's content, read-only — the current version. */
function ServiceDetailsRoute() {
  const { slug, id } = Route.useParams();
  return <ServiceDetailsView slug={slug} id={id} />;
}

export const Route = createFileRoute('/app/$slug/services/$id/_console/details')({
  component: ServiceDetailsRoute,
});
