import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';
import { Button } from '@repo/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { publishVersion, updateDraft } from '@/lib/services';

interface Definition {
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
}

/** Edit a service draft version: the JSONForms service form + Save draft / Save & publish. Application
 * methods are managed separately (the route-based flow on the detail), not here. Creation is a modal. */
export function ServiceEditor({
  serviceId,
  versionId,
  definition,
  initialData = {},
  readonly = false,
}: {
  serviceId: string;
  versionId: string;
  definition: Definition;
  initialData?: Record<string, unknown>;
  readonly?: boolean;
}) {
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const queryClient = useQueryClient();

  const requireTitle = (): string => {
    const title = typeof data.title === 'string' ? data.title.trim() : '';
    if (title === '') {
      throw new Error('A service title is required');
    }
    return title;
  };

  const save = useMutation({
    mutationFn: () => updateDraft(serviceId, versionId, { data, title: requireTitle() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  });

  // Save the draft, then publish it (server re-validates → 422 surfaced).
  const publish = useMutation({
    mutationFn: async () => {
      await updateDraft(serviceId, versionId, { data, title: requireTitle() });
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
          <Button type="button" disabled={busy} onClick={() => publish.mutate()}>
            Save &amp; publish
          </Button>
        </div>
      )}
    </div>
  );
}
