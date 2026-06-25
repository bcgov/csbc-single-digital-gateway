import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';
import { Button } from '@repo/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import {
  type ApplicationInput,
  type FormCatalogEntry,
  type FormType,
  createService,
  publishVersion,
  updateDraft,
} from '@/lib/services';
import { ApplicationsEditor, type ApplicationItem } from './applications-editor';

interface Definition {
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
}

function toApplicationInputs(items: ApplicationItem[]): ApplicationInput[] {
  return items.map((item, index) => ({
    ...(item.id ? { id: item.id } : {}),
    label: item.label,
    position: index,
    form:
      item.mode === 'existing'
        ? { mode: 'existing', versionId: item.versionId ?? '' }
        : { mode: 'new', typeId: item.newTypeId ?? '', title: item.newTitle ?? '' },
  }));
}

/** Unified service editor: the JSONForms service form + the applications editor + a composite save. */
export function ServiceEditor({
  mode,
  slug,
  workspaceId,
  definition,
  forms,
  formTypes,
  serviceId,
  versionId,
  initialData = {},
  initialApplications = [],
  readonly = false,
}: {
  mode: 'create' | 'edit';
  slug: string;
  workspaceId: string;
  definition: Definition;
  forms: FormCatalogEntry[];
  formTypes: FormType[];
  serviceId?: string;
  versionId?: string;
  initialData?: Record<string, unknown>;
  initialApplications?: ApplicationItem[];
  readonly?: boolean;
}) {
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const [applications, setApplications] = useState<ApplicationItem[]>(initialApplications);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: async () => {
      const title = typeof data.title === 'string' ? data.title.trim() : '';
      if (title === '') {
        throw new Error('A service title is required');
      }
      const applicationInputs = toApplicationInputs(applications);
      if (mode === 'create') {
        return createService({ workspaceId, title, data, applications: applicationInputs });
      }
      if (serviceId === undefined || versionId === undefined) {
        throw new Error('Missing service version to update');
      }
      await updateDraft(serviceId, versionId, { data, title, applications: applicationInputs });
      return null;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['services'] });
      if (mode === 'create' && result) {
        await navigate({
          to: '/app/$slug/services/$id',
          params: { slug, id: result.service.id },
          replace: true,
        });
      }
    },
  });

  // Edit mode only: save the draft, then publish it (server re-validates → 422 surfaced).
  const publish = useMutation({
    mutationFn: async () => {
      if (serviceId === undefined || versionId === undefined) {
        throw new Error('Missing service version to publish');
      }
      const title = typeof data.title === 'string' ? data.title.trim() : '';
      if (title === '') {
        throw new Error('A service title is required');
      }
      await updateDraft(serviceId, versionId, {
        data,
        title,
        applications: toApplicationInputs(applications),
      });
      return publishVersion(serviceId, versionId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  });
  const busy = save.isPending || publish.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <JsonForms
          schema={definition.schema as JsonSchema}
          uischema={definition.uischema as unknown as UISchemaElement}
          data={data}
          readonly={readonly}
          onChange={({ data: next }) => {
            if (!readonly) {
              setData(next as Record<string, unknown>);
            }
          }}
        />
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <ApplicationsEditor
          items={applications}
          onChange={setApplications}
          forms={forms}
          formTypes={formTypes}
          disabled={readonly}
        />
      </div>
      {readonly ? null : (
        <div className="flex items-center justify-end gap-3">
          {save.isError || publish.isError ? (
            <p role="alert" className="mr-auto text-sm text-destructive">
              {(save.error ?? publish.error)?.message}
            </p>
          ) : null}
          <Button type="button" variant="outline" disabled={busy} onClick={() => save.mutate()}>
            Save draft
          </Button>
          {mode === 'edit' ? (
            <Button type="button" disabled={busy} onClick={() => publish.mutate()}>
              Save &amp; publish
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
