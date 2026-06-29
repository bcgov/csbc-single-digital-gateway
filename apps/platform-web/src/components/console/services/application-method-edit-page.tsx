import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';
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

/** Basic-form method editor — editable when the form is a draft, otherwise a read-only preview. */
function BasicEdit({ form }: { form: FormWithVersion }) {
  const shell = useShellProps();
  const status = form.version.status;
  const readOnly = status !== 'draft';
  const [value, setValue] = useState<FormDefinition>(
    form.version.schema as unknown as FormDefinition,
  );
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: () =>
      updateFormSchema(form.form.id, form.version.id, { definition: value, title: titleOf(value) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forms', 'detail', form.form.id] }),
  });
  if (readOnly) {
    return (
      <ApplicationShell {...shell} label={form.form.title} status={status} readOnly>
        <div className="h-full overflow-auto p-4">
          <JsonForms
            schema={value.schema as JsonSchema}
            uischema={value.uischema as unknown as UISchemaElement}
            data={{}}
            readonly
          />
        </div>
      </ApplicationShell>
    );
  }
  return (
    <ApplicationShell
      {...shell}
      label={form.form.title}
      status={status}
      onSave={() => save.mutate()}
      saving={save.isPending}
      error={save.error}
    >
      <FormBuilder value={value} onChange={setValue} />
    </ApplicationShell>
  );
}

/** A read-only outline of a multi-stage form (stages → pages). */
function StageOutline({ def }: { def: MultiStageDefinition }) {
  return (
    <ol className="flex flex-col gap-3 p-4">
      {def.stages.map((stage, index) => (
        <li key={stage.id}>
          <p className="text-sm font-medium">
            {index + 1}. {stage.name}
          </p>
          <ul className="ml-5 list-disc text-sm text-muted-foreground">
            {stage.pages.map((page) => (
              <li key={page.id}>{page.name}</li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

/** Multi-stage method editor — editable when the form is a draft, otherwise a read-only outline. */
function StageEdit({ form }: { form: FormWithVersion }) {
  const shell = useShellProps();
  const status = form.version.status;
  const readOnly = status !== 'draft';
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
  if (readOnly) {
    return (
      <ApplicationShell {...shell} label={value.name || form.form.title} status={status} readOnly>
        <div className="h-full overflow-auto">
          <StageOutline def={value} />
        </div>
      </ApplicationShell>
    );
  }
  return (
    <ApplicationShell
      {...shell}
      label={value.name || form.form.title}
      status={status}
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
