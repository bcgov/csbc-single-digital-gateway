import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';
import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Spinner } from '@repo/ui/spinner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
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

/** Save/Cancel actions rendered inside a builder's header. */
function BuilderActions({
  error,
  saving,
  onSave,
  onCancel,
}: {
  error: Error | null;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      ) : null}
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="button" disabled={saving} onClick={onSave}>
        {saving ? <Spinner className="size-4" /> : null}
        Save form
      </Button>
    </>
  );
}

/** Basic-form method editor — editable when the form is a draft, otherwise a read-only preview. */
function BasicEdit({ form }: { form: FormWithVersion }) {
  const shell = useShellProps();
  const navigate = useNavigate();
  const toDetail = () =>
    navigate({ to: '/app/$slug/services/$id', params: { slug: shell.slug, id: shell.serviceId } });
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
    // Strip root title/description so the JsonForms wrapper doesn't also render a header (we render it).
    const {
      title: schemaTitle,
      description: schemaDescription,
      ...schemaRest
    } = value.schema as {
      title?: unknown;
      description?: unknown;
    };
    const previewTitle =
      typeof schemaTitle === 'string' && schemaTitle.trim() !== '' ? schemaTitle : form.form.title;
    return (
      <ApplicationShell {...shell} label={form.form.title} status={status} readOnly>
        <div className="flex h-full flex-col">
          <FormPreviewHeader
            title={previewTitle}
            description={typeof schemaDescription === 'string' ? schemaDescription : undefined}
          />
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <JsonForms
              schema={schemaRest as JsonSchema}
              uischema={value.uischema as unknown as UISchemaElement}
              data={{}}
              readonly
            />
          </div>
        </div>
      </ApplicationShell>
    );
  }
  return (
    <ApplicationShell {...shell} label={form.form.title}>
      <FormBuilder
        value={value}
        onChange={setValue}
        actions={
          <>
            <Badge variant="outline">{status}</Badge>
            <BuilderActions
              error={save.error}
              saving={save.isPending}
              onSave={() => save.mutate()}
              onCancel={toDetail}
            />
          </>
        }
      />
    </ApplicationShell>
  );
}

/** Title + description header shown above a read-only form preview. */
function FormPreviewHeader({
  title,
  description,
}: {
  title: string;
  description?: string | undefined;
}) {
  return (
    <div className="border-b border-border px-4 py-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
    </div>
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
  const navigate = useNavigate();
  const toDetail = () =>
    navigate({ to: '/app/$slug/services/$id', params: { slug: shell.slug, id: shell.serviceId } });
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
        <div className="flex h-full flex-col">
          <FormPreviewHeader
            title={value.name || form.form.title}
            description={value.description || undefined}
          />
          <div className="min-h-0 flex-1 overflow-auto">
            <StageOutline def={value} />
          </div>
        </div>
      </ApplicationShell>
    );
  }
  return (
    <ApplicationShell {...shell} label={value.name || form.form.title}>
      <StageBuilder
        value={value}
        onChange={setValue}
        actions={
          <>
            <Badge variant="outline">{status}</Badge>
            <BuilderActions
              error={save.error}
              saving={save.isPending}
              onSave={() => save.mutate()}
              onCancel={toDetail}
            />
          </>
        }
      />
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
