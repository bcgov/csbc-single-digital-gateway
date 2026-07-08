import { createFileRoute } from '@tanstack/react-router';
import { ServiceDetail } from '@/components/console/services/service-detail';

/** `…/services/:id/versions/:versionId/service-agreements` — an older version's agreements tab. */
function VersionAgreements() {
  const { slug, id, versionId } = Route.useParams();
  return <ServiceDetail slug={slug} id={id} versionId={versionId} tab="agreements" />;
}

export const Route = createFileRoute(
  '/app/$slug/services/$id/versions/$versionId/service-agreements',
)({
  component: VersionAgreements,
});
