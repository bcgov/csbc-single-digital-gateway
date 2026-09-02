import { createFileRoute } from '@tanstack/react-router';
import { ServiceDetail } from '@/components/console/services/service-detail';

/** `…/services/:id/versions/:versionId` — the service detail for a specific version. */
function VersionDetail() {
  const { slug, id, versionId } = Route.useParams();
  return <ServiceDetail slug={slug} id={id} versionId={versionId} tab="details" />;
}

export const Route = createFileRoute('/app/$slug/services/$id/old/edit/versions/$versionId/')({
  component: VersionDetail,
});
