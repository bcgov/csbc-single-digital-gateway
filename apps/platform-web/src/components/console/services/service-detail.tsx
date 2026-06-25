import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';
import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  addServiceVersion,
  archiveVersion,
  publishVersion,
  serviceQueryOptions,
  updateDraft,
} from '@/lib/services';

const STATUS_VARIANT = { draft: 'secondary', published: 'default', archived: 'outline' } as const;

/** Service detail — version history, the JsonForms editor, and the draft→publish lifecycle. */
export function ServiceDetail() {
  const { slug, id } = useParams({ from: '/app/$slug/services/$id' });
  const queryClient = useQueryClient();
  const { data } = useQuery(serviceQueryOptions(id));
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['services'] });

  const versions = data?.versions ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = versions.find((v) => v.id === selectedId) ?? versions[versions.length - 1];
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (selected) {
      setFormData(selected.data);
    }
  }, [selected?.id]);

  const isDraft = selected?.status === 'draft';

  const save = useMutation({
    mutationFn: (versionId: string) => updateDraft(id, versionId, formData),
    onSuccess: invalidate,
  });
  const publish = useMutation({
    mutationFn: async (versionId: string) => {
      await updateDraft(id, versionId, formData);
      return publishVersion(id, versionId);
    },
    onSuccess: invalidate,
  });
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

  return (
    <div className="mx-auto flex max-w-[1320px] flex-col gap-4">
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.8fr]">
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

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">
              Form {selected ? `(v${selected.version})` : ''}
              {isDraft ? '' : ' · read-only'}
            </span>
            {isDraft && selected ? (
              <div className="flex gap-2">
                <Button
                  size="xs"
                  variant="outline"
                  type="button"
                  disabled={save.isPending}
                  onClick={() => save.mutate(selected.id)}
                >
                  Save
                </Button>
                <Button
                  size="xs"
                  type="button"
                  disabled={publish.isPending}
                  onClick={() => publish.mutate(selected.id)}
                >
                  Publish
                </Button>
              </div>
            ) : null}
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <JsonForms
              schema={data.definition.schema as JsonSchema}
              uischema={data.definition.uischema as unknown as UISchemaElement}
              data={formData}
              readonly={!isDraft}
              onChange={({ data: next }) => {
                if (isDraft) {
                  setFormData(next as Record<string, unknown>);
                }
              }}
            />
          </div>
          {publish.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {publish.error.message}
            </p>
          ) : null}
          {save.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {save.error.message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
