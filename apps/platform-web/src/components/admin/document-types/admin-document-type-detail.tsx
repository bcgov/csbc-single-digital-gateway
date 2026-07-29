import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DefinitionEditor } from '@/components/admin/document-types/definition-editor';
import { VersionActions } from '@/components/admin/document-types/version-actions';
import { addVersion, adminDocumentTypeQueryOptions, editDraft } from '@/lib/document-types';

const STATUS_COLOR = {
  draft: 'yellow',
  published: 'green',
  archived: 'blue',
} as const;

/** Admin Document Type detail — version history, lifecycle actions, and the definition editor. */
export function AdminDocumentTypeDetail() {
  const { id } = useParams({ from: '/admin/document-types/$id' });
  const queryClient = useQueryClient();
  const { data } = useQuery(adminDocumentTypeQueryOptions(id));
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'document-types'] });

  const versions = data?.versions ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    versions.find((version) => version.id === selectedId) ?? versions[versions.length - 1];
  const [draftText, setDraftText] = useState('');

  useEffect(() => {
    if (selected) {
      setDraftText(JSON.stringify(selected.definition, null, 2));
    }
  }, [selected?.id]);

  const save = useMutation({
    mutationFn: (vars: { versionId: string; text: string }) => {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(vars.text) as Record<string, unknown>;
      } catch {
        throw new Error('Definition is not valid JSON.');
      }
      return editDraft(id, vars.versionId, parsed);
    },
    onSuccess: invalidate,
  });
  const add = useMutation({
    mutationFn: () => addVersion(id, selected?.definition ?? {}),
    onSuccess: invalidate,
  });

  if (!data) {
    return null;
  }

  const isDraft = selected?.status === 'draft';

  return (
    <div className="mx-auto flex max-w-[1320px] flex-col gap-4">
      <Link
        to="/admin/document-types"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Document types
      </Link>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">{data.type.name}</h2>
          <Badge color="yellow">{data.type.kind}</Badge>
        </div>
        <Button size="sm" type="button" disabled={add.isPending} onClick={() => add.mutate()}>
          <Plus className="size-4" aria-hidden />
          New version
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.6fr]">
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
                    <Badge color={STATUS_COLOR[version.status]}>{version.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <VersionActions typeId={id} version={version} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">
              Definition {selected ? `(v${selected.version})` : ''}
            </span>
            {isDraft && selected ? (
              <Button
                size="xs"
                type="button"
                disabled={save.isPending}
                onClick={() => save.mutate({ versionId: selected.id, text: draftText })}
              >
                Save
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">Read-only (not a draft)</span>
            )}
          </div>
          <DefinitionEditor value={draftText} onChange={setDraftText} readOnly={!isDraft} />
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
