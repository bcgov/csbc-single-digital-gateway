import { Spinner } from '@repo/ui/spinner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { FormBuilder } from '@/components/form-builder/form-builder';
import { StageBuilder } from '@/components/stage-builder/stage-builder';
import {
  type MultiStageDefinition,
  normalizeDefinition,
} from '@/components/stage-builder/stage-model';
import {
  type FormDefinition,
  type FormWithVersion,
  formQueryOptions,
  updateFormSchema,
} from '@/lib/forms';
import { serviceQueryOptions } from '@/lib/services';
import { ApplicationShell } from './application-shell';

const FROM = '/app/$slug/services/$id/versions/$versionId/application-methods/$applicationMethodId';

const titleOf = (def: FormDefinition): string => {
  const title = def.schema.title;
  return typeof title === 'string' && title.trim() !== '' ? title.trim() : 'Untitled form';
};

function useShellProps() {
  const { slug, id } = useParams({ from: FROM });
  const { data: service } = useQuery(serviceQueryOptions(id));
  const serviceTitle = service?.service.title ?? 'Service';
  return {
    slug,
    serviceId: id,
    serviceTitle,
    description: `Application method of ${serviceTitle}`,
  };
}

/** Basic-form method editor — seeded from the loaded form (gated on success at the parent). */
function BasicEdit({ form }: { form: FormWithVersion }) {
  const shell = useShellProps();
  const [value, setValue] = useState<FormDefinition>(
    form.version.schema as unknown as FormDefinition,
  );
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: () =>
      updateFormSchema(form.form.id, form.version.id, { definition: value, title: titleOf(value) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forms', 'detail', form.form.id] }),
  });
  return (
    <ApplicationShell
      {...shell}
      label={form.form.title}
      onSave={() => save.mutate()}
      saving={save.isPending}
      error={save.error}
    >
      <FormBuilder value={value} onChange={setValue} />
    </ApplicationShell>
  );
}

/** Multi-stage method editor — the form name/description are edited in the builder's canvas panel. */
function StageEdit({ form }: { form: FormWithVersion }) {
  const shell = useShellProps();
  // The stored schema may be a barebones template ({ stages } with no edges/name) — normalize so the
  // builder + stage-model mutators always get complete arrays (and a name/description).
  const [value, setValue] = useState<MultiStageDefinition>(() =>
    normalizeDefinition(form.version.schema),
  );
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: () =>
      updateFormSchema(form.form.id, form.version.id, {
        definition: value,
        title: value.name.trim() || form.form.title,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forms', 'detail', form.form.id] }),
  });
  return (
    <ApplicationShell
      {...shell}
      label={value.name || form.form.title}
      onSave={() => save.mutate()}
      saving={save.isPending}
      error={save.error}
    >
      <StageBuilder value={value} onChange={setValue} />
    </ApplicationShell>
  );
}

/** Edit an application method's form (in-shell): load the form, then render the builder for its kind. */
export function ApplicationMethodEditPage() {
  const { applicationMethodId } = useParams({ from: FROM });
  const query = useQuery(formQueryOptions(applicationMethodId));
  if (!query.isSuccess) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }
  return query.data.form.kind === 'multi-stage-form' ? (
    <StageEdit form={query.data} />
  ) : (
    <BasicEdit form={query.data} />
  );
}
