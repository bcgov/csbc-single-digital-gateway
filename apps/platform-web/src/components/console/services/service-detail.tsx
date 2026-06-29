import { Badge } from '@repo/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@repo/ui/breadcrumb';
import { Button } from '@repo/ui/button';
import { ButtonGroup } from '@repo/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/tabs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronDown, Plus } from 'lucide-react';
import {
  addServiceVersion,
  serviceQueryOptions,
  serviceReferencesQueryOptions,
} from '@/lib/services';
import { useSetPageChrome } from '@/lib/page-chrome';
import { ApplicationMethods } from './application-methods';
import { ServiceEditor } from './service-editor';
import { ServiceMenu } from './service-menu';

/** Service detail — the version is in the URL (`…/versions/:versionId`). Header carries a version
 * picker, a "Go to current" shortcut when off the latest, Create-next-version, and the ⋯ menu. */
export function ServiceDetail({
  slug,
  id,
  versionId,
}: {
  slug: string;
  id: string;
  /** Omitted on the bare `…/services/:id` route → the current (latest) version. */
  versionId?: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useQuery(serviceQueryOptions(id));
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['services'] });

  const versions = data?.versions ?? [];
  const latest = versions[versions.length - 1];
  // The bare route (no versionId) shows the current/latest version; older versions are URL-addressed.
  const selected = versionId === undefined ? latest : versions.find((v) => v.id === versionId);

  // The current version lives at the bare `…/services/:id`; older versions at `…/versions/:versionId`.
  const goToCurrent = () => navigate({ to: '/app/$slug/services/$id', params: { slug, id } });
  const goToVersion = (vId: string) =>
    vId === latest?.id
      ? goToCurrent()
      : navigate({
          to: '/app/$slug/services/$id/versions/$versionId',
          params: { slug, id, versionId: vId },
        });

  const referencesQuery = useQuery({
    ...serviceReferencesQueryOptions(id, selected?.id ?? ''),
    enabled: selected !== undefined,
  });
  const references = referencesQuery.data ?? [];

  const addVersion = useMutation({
    mutationFn: () => addServiceVersion(id),
    onSuccess: async () => {
      await invalidate();
      goToCurrent();
    },
  });

  const serviceTitle = data?.service.title ?? 'Service';
  // Drive the top bar (title/description) + the full-width breadcrumb bar for this nested page.
  useSetPageChrome({
    title: serviceTitle,
    description: data?.service.description ? data.service.description : undefined,
    breadcrumb: (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link to="/app/$slug/services" params={{ slug }} />}>
              Services
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{serviceTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    ),
  });

  if (!data) {
    return null;
  }
  if (!selected) {
    return <p className="p-6 text-sm text-muted-foreground">This version no longer exists.</p>;
  }

  const applicationRefs = references.filter((ref) => ref.relation === 'application_form');
  const isLatest = selected.id === latest?.id;

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        <ButtonGroup>
          {!isLatest && latest ? (
            <Button size="sm" variant="outline" type="button" onClick={goToCurrent}>
              Go to current
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="sm" variant="outline" type="button" />}>
              Version v{selected.version}
              <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {versions.toReversed().map((version) => (
                <DropdownMenuItem
                  key={version.id}
                  className={version.id === selected.id ? 'font-semibold' : undefined}
                  onClick={() => goToVersion(version.id)}
                >
                  v{version.version}
                  <span className="ml-auto text-xs text-muted-foreground">{version.status}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>
        <div className="flex items-center gap-2">
          {/* A next version can only be started once the latest one is published. */}
          {latest?.status === 'published' ? (
            <Button
              size="sm"
              variant="outline"
              type="button"
              disabled={addVersion.isPending}
              onClick={() => addVersion.mutate()}
            >
              <Plus className="size-4" aria-hidden />
              Create next version
            </Button>
          ) : null}
          <ServiceMenu
            serviceId={id}
            versionId={selected.id}
            canDiscard={selected.status === 'draft' && versions.length > 1}
            hasSubmissions={data.hasSubmissions}
            archived={versions.length > 0 && versions.every((v) => v.status === 'archived')}
            onDeleted={() => navigate({ to: '/app/$slug/services', params: { slug } })}
            onDiscarded={() => navigate({ to: '/app/$slug/services/$id', params: { slug, id } })}
          />
        </div>
      </div>

      <Tabs defaultValue="details" className="gap-4">
        <TabsList>
          <TabsTrigger value="details">Service details</TabsTrigger>
          <TabsTrigger value="methods">
            Application methods
            <Badge variant="secondary" className="ml-2">
              {applicationRefs.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="flex flex-col gap-4">
          {/* Render the editor only once references have loaded (keyed by version id). */}
          {referencesQuery.isSuccess ? (
            <ServiceEditor
              key={selected.id}
              serviceId={id}
              versionId={selected.id}
              definition={data.definition}
              initialData={selected.data}
              readonly={selected.status !== 'draft'}
              applications={applicationRefs.map((ref) => ({
                title: ref.targetTitle,
                hasStructure: ref.hasStructure,
              }))}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="methods">
          {referencesQuery.isSuccess ? (
            <ApplicationMethods
              slug={slug}
              serviceId={id}
              versionId={selected.id}
              references={applicationRefs}
              readonly={selected.status !== 'draft'}
            />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
