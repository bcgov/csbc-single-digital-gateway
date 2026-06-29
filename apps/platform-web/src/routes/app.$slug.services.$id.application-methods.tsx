import { createFileRoute } from '@tanstack/react-router';
import { ServiceDetail } from '@/components/console/services/service-detail';

/** `…/services/:id/application-methods` — the current version's detail on the methods tab. */
function CurrentMethods() {
  const { slug, id } = Route.useParams();
  return <ServiceDetail slug={slug} id={id} tab="methods" />;
}

export const Route = createFileRoute('/app/$slug/services/$id/application-methods')({
  component: CurrentMethods,
});
