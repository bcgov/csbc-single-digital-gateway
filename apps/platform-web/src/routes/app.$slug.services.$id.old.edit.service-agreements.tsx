import { createFileRoute } from '@tanstack/react-router';
import { ServiceDetail } from '@/components/console/services/service-detail';

/** `…/services/:id/service-agreements` — the current version's detail on the agreements tab. */
function CurrentAgreements() {
  const { slug, id } = Route.useParams();
  return <ServiceDetail slug={slug} id={id} tab="agreements" />;
}

export const Route = createFileRoute('/app/$slug/services/$id/old/edit/service-agreements')({
  component: CurrentAgreements,
});
