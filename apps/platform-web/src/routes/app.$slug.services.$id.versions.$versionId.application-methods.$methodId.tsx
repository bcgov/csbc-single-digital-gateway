import { createFileRoute } from '@tanstack/react-router';
import { ApplicationMethodEditor } from '@/components/console/services/application-method-editor';

/** Doc 288: an application method in the Document Studio, full width — a sibling of the service console shell. */
function ApplicationMethodRoute() {
  const { slug, id, versionId, methodId } = Route.useParams();
  return <ApplicationMethodEditor slug={slug} id={id} versionId={versionId} methodId={methodId} />;
}

export const Route = createFileRoute(
  '/app/$slug/services/$id/versions/$versionId/application-methods/$methodId',
)({
  component: ApplicationMethodRoute,
});
