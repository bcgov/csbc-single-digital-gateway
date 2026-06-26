import { Button } from '@repo/ui/button';
import { Spinner } from '@repo/ui/spinner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { EMPTY_FORM_DEFINITION } from '@/components/form-builder/builder-dialog';
import { FormBuilder } from '@/components/form-builder/form-builder';
import {
  type FormDefinition,
  type FormWithVersion,
  createForm,
  formQueryOptions,
  updateFormSchema,
} from '@/lib/forms';
import { workspaceBySlugQueryOptions } from '@/lib/workspaces';

function titleOf(definition: FormDefinition): string {
  const title = definition.schema.title;
  return typeof title === 'string' && title.trim() !== '' ? title.trim() : 'Untitled form';
}

function BuilderShell({
  heading,
  value,
  onChange,
  onSave,
  saving,
  error,
}: {
  heading: string;
  value: FormDefinition;
  onChange: (value: FormDefinition) => void;
  onSave: () => void;
  saving: boolean;
  error: Error | null;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h1 className="text-sm font-semibold">{heading}</h1>
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
        <FormBuilder value={value} onChange={onChange} />
      </div>
    </div>
  );
}

/** Standalone create: build in-browser, persist on save, then replace-navigate to the edit route. */
export function FormBuilderCreatePage() {
  const { slug } = useParams({ from: '/app/$slug' });
  const search = useSearch({ strict: false }) as { typeId?: string };
  const { data: workspace } = useQuery(workspaceBySlugQueryOptions(slug));
  const workspaceId = workspace?.id ?? '';
  const [value, setValue] = useState<FormDefinition>(EMPTY_FORM_DEFINITION);
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
        title: titleOf(value),
        definition: value,
      });
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['forms'] });
      await navigate({
        to: '/app/$slug/forms/$id/edit',
        params: { slug, id: result.form.id },
        replace: true,
      });
    },
  });

  return (
    <BuilderShell
      heading="New form"
      value={value}
      onChange={setValue}
      onSave={() => save.mutate()}
      saving={save.isPending}
      error={save.error}
    />
  );
}

function EditLoaded({ slug, initial }: { slug: string; initial: FormWithVersion }) {
  const [value, setValue] = useState<FormDefinition>(initial.version.schema);
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: () =>
      updateFormSchema(initial.form.id, initial.version.id, {
        definition: value,
        title: titleOf(value),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['forms', 'detail', initial.form.id] }),
  });
  void slug;
  return (
    <BuilderShell
      heading={`Edit form — ${initial.form.title}`}
      value={value}
      onChange={setValue}
      onSave={() => save.mutate()}
      saving={save.isPending}
      error={save.error}
    />
  );
}

/** Standalone edit: load the form, then mount the editor seeded with its definition (gate on success). */
export function FormBuilderEditPage() {
  const { slug, id } = useParams({ from: '/app/$slug/forms/$id/edit' });
  const query = useQuery(formQueryOptions(id));
  if (!query.isSuccess) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }
  return <EditLoaded slug={slug} initial={query.data} />;
}
