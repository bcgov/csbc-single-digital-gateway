import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { ServiceEditor } from '@/components/console/services/service-editor';
import {
  formTypesQueryOptions,
  formsCatalogQueryOptions,
  serviceDefinitionQueryOptions,
} from '@/lib/services';
import { workspaceBySlugQueryOptions } from '@/lib/workspaces';

/** Client-first service creation — builds the whole service in-browser; Save persists it atomically. */
export function ServiceCreate() {
  const { slug } = useParams({ from: '/app/$slug' });
  const { data: workspace } = useQuery(workspaceBySlugQueryOptions(slug));
  const workspaceId = workspace?.id ?? '';
  const { data: definition } = useQuery(serviceDefinitionQueryOptions());
  const { data: forms = [] } = useQuery({
    ...formsCatalogQueryOptions(workspaceId),
    enabled: workspaceId !== '',
  });
  const { data: formTypes = [] } = useQuery(formTypesQueryOptions());

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-4">
      <Link
        to="/app/$slug/services"
        params={{ slug }}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Services
      </Link>
      <h2 className="text-lg font-semibold">New service</h2>
      {definition && workspaceId !== '' ? (
        <ServiceEditor
          mode="create"
          slug={slug}
          workspaceId={workspaceId}
          definition={definition}
          forms={forms}
          formTypes={formTypes}
        />
      ) : null}
    </div>
  );
}
