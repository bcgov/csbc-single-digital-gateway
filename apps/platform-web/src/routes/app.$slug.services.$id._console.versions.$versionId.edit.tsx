import { createFileRoute } from '@tanstack/react-router';
import { ServiceVersionEditor } from '@/components/console/services/service-version-editor';

/** Doc 230: a service version in the Form Studio — editable when it is a draft. */
function ServiceVersionEditRoute() {
  const { slug, id, versionId } = Route.useParams();
  return <ServiceVersionEditor slug={slug} id={id} versionId={versionId} />;
}

export const Route = createFileRoute('/app/$slug/services/$id/_console/versions/$versionId/edit')({
  component: ServiceVersionEditRoute,
});
