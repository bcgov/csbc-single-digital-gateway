import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import {
  addServiceVersion,
  archiveVersion,
  formTypesQueryOptions,
  formsCatalogQueryOptions,
  serviceQueryOptions,
  serviceReferencesQueryOptions,
} from '@/lib/services';
import { ServiceEditor } from './service-editor';
import type { ApplicationItem } from './applications-editor';

const STATUS_VARIANT = { draft: 'secondary', published: 'default', archived: 'outline' } as const;

/** Service detail — version history + lifecycle, with the unified editor for the selected version. */
export function ServiceDetail() {
  const { slug, id } = useParams({ from: '/app/$slug/services/$id' });
  const queryClient = useQueryClient();
  const { data } = useQuery(serviceQueryOptions(id));
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['services'] });

  const versions = data?.versions ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = versions.find((v) => v.id === selectedId) ?? versions[versions.length - 1];
  const workspaceId = data?.service.workspaceId ?? '';

  const referencesQuery = useQuery({
    ...serviceReferencesQueryOptions(id, selected?.id ?? ''),
    enabled: selected !== undefined,
  });
  const references = referencesQuery.data ?? [];
  const { data: forms = [] } = useQuery({
    ...formsCatalogQueryOptions(workspaceId),
    enabled: workspaceId !== '',
  });
  const { data: formTypes = [] } = useQuery(formTypesQueryOptions());

  const archive = useMutation({
    mutationFn: (versionId: string) => archiveVersion(id, versionId),
    onSuccess: invalidate,
  });
  const addVersion = useMutation({
    mutationFn: () => addServiceVersion(id),
    onSuccess: invalidate,
  });

  if (!data) {
    return null;
  }

  const applications: ApplicationItem[] = references
    .filter((ref) => ref.relation === 'application_form')
    .map((ref) => ({
      key: ref.id,
      id: ref.id,
      label: ref.label ?? '',
      position: ref.position,
      mode: 'existing' as const,
      versionId: ref.targetVersionId,
    }));

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
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{data.service.title}</h2>
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

      {/* Render the editor only once references have loaded — it seeds its state from
          initialApplications at mount (keyed by version), so mounting before they arrive shows empty. */}
      {selected && referencesQuery.isSuccess ? (
        <ServiceEditor
          key={selected.id}
          mode="edit"
          slug={slug}
          workspaceId={workspaceId}
          serviceId={id}
          versionId={selected.id}
          definition={data.definition}
          forms={forms}
          formTypes={formTypes}
          initialData={selected.data}
          initialApplications={applications}
          readonly={selected.status !== 'draft'}
        />
      ) : null}
    </div>
  );
}
