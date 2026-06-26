import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';
import { Spinner } from '@repo/ui/spinner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { StageBuilder } from '@/components/stage-builder/stage-builder';
import { emptyDefinition, type MultiStageDefinition } from '@/components/stage-builder/stage-model';
import { type FormWithVersion, createForm, formQueryOptions, updateFormSchema } from '@/lib/forms';
import { workspaceBySlugQueryOptions } from '@/lib/workspaces';

function BuilderShell({
  heading,
  docTitle,
  onDocTitleChange,
  value,
  onChange,
  onSave,
  saving,
  error,
}: {
  heading: string;
  docTitle: string;
  onDocTitleChange: (title: string) => void;
  value: MultiStageDefinition;
  onChange: (value: MultiStageDefinition) => void;
  onSave: () => void;
  saving: boolean;
  error: Error | null;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 text-sm font-semibold text-muted-foreground">{heading}</span>
          <Label htmlFor="stage-doc-title" className="sr-only">
            Form title
          </Label>
          <Input
            id="stage-doc-title"
            aria-label="Form title"
            value={docTitle}
            onChange={(event) => onDocTitleChange(event.target.value)}
            className="h-8 max-w-xs"
          />
        </div>
        <div className="flex items-center gap-3">
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error.message}
            </p>
          ) : null}
          <Button type="button" disabled={saving} onClick={onSave}>
            {saving ? <Spinner className="size-4" /> : null}
            Save form
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <StageBuilder value={value} onChange={onChange} />
      </div>
    </div>
  );
}

/** Standalone create: build in-browser, persist on save, then replace-navigate to the edit route. */
export function StageBuilderCreatePage() {
  const { slug } = useParams({ from: '/app/$slug' });
  const search = useSearch({ strict: false }) as { typeId?: string };
  const { data: workspace } = useQuery(workspaceBySlugQueryOptions(slug));
  const workspaceId = workspace?.id ?? '';
  const [docTitle, setDocTitle] = useState('Untitled multi-stage form');
  const [value, setValue] = useState<MultiStageDefinition>(emptyDefinition());
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: () => {
      if (workspaceId === '' || !search.typeId) {
        throw new Error('Missing workspace or form type');
      }
      return createForm({
        workspaceId,
        typeId: search.typeId,
        title: docTitle.trim() || 'Untitled multi-stage form',
        definition: value,
      });
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['forms'] });
      await navigate({
        to: '/app/$slug/stages/$id/edit',
        params: { slug, id: result.form.id },
        replace: true,
      });
    },
  });

  return (
    <BuilderShell
      heading="New multi-stage form"
      docTitle={docTitle}
      onDocTitleChange={setDocTitle}
      value={value}
      onChange={setValue}
      onSave={() => save.mutate()}
      saving={save.isPending}
      error={save.error}
    />
  );
}

function EditLoaded({ initial }: { initial: FormWithVersion }) {
  const [docTitle, setDocTitle] = useState(initial.form.title);
  const [value, setValue] = useState<MultiStageDefinition>(
    initial.version.schema as unknown as MultiStageDefinition,
  );
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: () =>
      updateFormSchema(initial.form.id, initial.version.id, {
        definition: value,
        title: docTitle.trim() || initial.form.title,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['forms', 'detail', initial.form.id] }),
  });
  return (
    <BuilderShell
      heading="Edit multi-stage form"
      docTitle={docTitle}
      onDocTitleChange={setDocTitle}
      value={value}
      onChange={setValue}
      onSave={() => save.mutate()}
      saving={save.isPending}
      error={save.error}
    />
  );
}

/** Standalone edit: load the form, then mount the builder seeded with its definition (gate on success). */
export function StageBuilderEditPage() {
  const { id } = useParams({ from: '/app/$slug/stages/$id/edit' });
  const query = useQuery(formQueryOptions(id));
  if (!query.isSuccess) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }
  return <EditLoaded initial={query.data} />;
}
