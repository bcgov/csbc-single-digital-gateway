import { createFileRoute } from '@tanstack/react-router';
import { ServiceDetail } from '@/components/console/services/service-detail';

/** `…/services/:id` — the detail for the current (latest) version (no version in the URL). */
function ServiceIndex() {
  const { slug, id } = Route.useParams();
  return <ServiceDetail slug={slug} id={id} tab="details" />;
}

export const Route = createFileRoute('/app/$slug/services/$id/old/edit/')({
  component: ServiceIndex,
});
