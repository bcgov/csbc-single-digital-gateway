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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/tabs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import {
  addServiceVersion,
  archiveVersion,
  serviceQueryOptions,
  serviceReferencesQueryOptions,
} from '@/lib/services';
import { useSetPageChrome } from '@/lib/page-chrome';
import { ApplicationMethods } from './application-methods';
import { ServiceActions } from './service-actions';
import { ServiceEditor } from './service-editor';

const STATUS_VARIANT = { draft: 'secondary', published: 'default', archived: 'outline' } as const;

/** Service detail — version history + lifecycle, with the unified editor for the selected version. */
export function ServiceDetail() {
  const { slug, id } = useParams({ from: '/app/$slug/services/$id' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useQuery(serviceQueryOptions(id));
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['services'] });

  const versions = data?.versions ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = versions.find((v) => v.id === selectedId) ?? versions[versions.length - 1];

  const referencesQuery = useQuery({
    ...serviceReferencesQueryOptions(id, selected?.id ?? ''),
    enabled: selected !== undefined,
  });
  const references = referencesQuery.data ?? [];

  const archive = useMutation({
    mutationFn: (versionId: string) => archiveVersion(id, versionId),
    onSuccess: invalidate,
  });
  const addVersion = useMutation({
    mutationFn: () => addServiceVersion(id),
    onSuccess: invalidate,
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

  const applicationRefs = references.filter((ref) => ref.relation === 'application_form');

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        <ServiceActions
          serviceId={id}
          hasSubmissions={data.hasSubmissions}
          archived={versions.length > 0 && versions.every((v) => v.status === 'archived')}
          onDeleted={() => navigate({ to: '/app/$slug/services', params: { slug } })}
        />
        <Button
          size="sm"
          type="button"
          disabled={addVersion.isPending}
          onClick={() => addVersion.mutate()}
        >
          <Plus className="size-4" aria-hidden />
          Add version
        </Button>
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
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((version) => (
                  <TableRow
                    key={version.id}
                    className={version.id === selected?.id ? 'bg-accent' : 'cursor-pointer'}
                    onClick={() => setSelectedId(version.id)}
                  >
                    <TableCell className="font-medium">v{version.version}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[version.status]}>{version.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {version.status !== 'archived' ? (
                          <Button
                            size="xs"
                            variant="outline"
                            type="button"
                            disabled={archive.isPending}
                            onClick={(event) => {
                              event.stopPropagation();
                              archive.mutate(version.id);
                            }}
                          >
                            Archive
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Render the editor only once references have loaded (keyed by version id). */}
          {selected && referencesQuery.isSuccess ? (
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
          {selected && referencesQuery.isSuccess ? (
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
