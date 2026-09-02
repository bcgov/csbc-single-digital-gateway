import { createFileRoute } from '@tanstack/react-router';
import { ServiceDetail } from '@/components/console/services/service-detail';

/** `…/versions/:versionId/application-methods` — an older version's detail on the methods tab. */
function VersionMethods() {
  const { slug, id, versionId } = Route.useParams();
  return <ServiceDetail slug={slug} id={id} versionId={versionId} tab="methods" />;
}

export const Route = createFileRoute(
  '/app/$slug/services/$id/old/edit/versions/$versionId/application-methods/',
)({
  component: VersionMethods,
});
