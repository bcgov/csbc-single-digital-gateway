import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';
import { Button } from '@repo/ui/button';
import { ButtonGroup } from '@repo/ui/button-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { Spinner } from '@repo/ui/spinner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { publishVersion, updateDraft } from '@/lib/services';

interface Definition {
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
}

/** A one-line summary of an application method for the publish modal. */
export interface PublishApplication {
  title: string;
  hasStructure: boolean;
}

/** Edit a service draft version: a top action bar (Save draft / Publish / + any `actions` like Add
 * version) over the JSONForms service form. Save draft enables only with unsaved changes; Publish is
 * disabled until changes are saved (and gated by the summary modal on every method having fields). */
export function ServiceEditor({
  serviceId,
  versionId,
  definition,
  initialData = {},
  readonly = false,
  applications = [],
  actions,
}: {
  serviceId: string;
  versionId: string;
  definition: Definition;
  initialData?: Record<string, unknown>;
  readonly?: boolean;
  applications?: PublishApplication[];
  actions?: ReactNode;
}) {
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  // Baseline = last-saved data; dirty drives Save draft (on) / Publish (off).
  const [baseline, setBaseline] = useState<Record<string, unknown>>(initialData);
  const [publishOpen, setPublishOpen] = useState(false);
  const queryClient = useQueryClient();
  const dirty = JSON.stringify(data) !== JSON.stringify(baseline);

  const requireTitle = (): string => {
    const title = typeof data.title === 'string' ? data.title.trim() : '';
    if (title === '') {
      throw new Error('A service title is required');
    }
    return title;
  };

  const save = useMutation({
    mutationFn: () => updateDraft(serviceId, versionId, { data, title: requireTitle() }),
    onSuccess: async () => {
      setBaseline(data);
      await queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  // Publish the (already-saved) draft; server re-validates data + methods → 422 surfaced.
  const publish = useMutation({
    mutationFn: () => publishVersion(serviceId, versionId),
    onSuccess: async () => {
      setPublishOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
  const busy = save.isPending || publish.isPending;

  const structureless = applications.filter((app) => !app.hasStructure);
  const canPublish = applications.length > 0 && structureless.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-3">
        {save.isError ? (
          <p role="alert" className="mr-auto text-sm text-destructive">
            {save.error.message}
          </p>
        ) : null}
        {readonly ? null : (
          <ButtonGroup>
            <Button
              type="button"
              variant="outline"
              disabled={!dirty || busy}
              onClick={() => save.mutate()}
            >
              Save draft
            </Button>
            <Button type="button" disabled={dirty || busy} onClick={() => setPublishOpen(true)}>
              Publish
            </Button>
          </ButtonGroup>
        )}
        {actions}
      </div>
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

      <Dialog
        open={publishOpen}
        onOpenChange={(next) => {
          if (!next && !publish.isPending) {
            setPublishOpen(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish service?</DialogTitle>
            <DialogDescription>
              Publishing makes the service and its application methods live.
            </DialogDescription>
          </DialogHeader>
          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This service has no application methods. Add at least one before publishing.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                {applications.length} application method{applications.length === 1 ? '' : 's'} will
                be published with the service:
              </p>
              <ul className="flex flex-col gap-1.5">
                {applications.map((app) => (
                  <li key={app.title} className="flex items-center gap-2 text-sm">
                    {app.hasStructure ? (
                      <Check className="size-4 shrink-0 text-primary" aria-hidden />
                    ) : (
                      <X className="size-4 shrink-0 text-destructive" aria-hidden />
                    )}
                    <span className="min-w-0 truncate">{app.title}</span>
                    {app.hasStructure ? null : (
                      <span className="text-xs text-destructive">no fields</span>
                    )}
                  </li>
                ))}
              </ul>
              {structureless.length > 0 ? (
                <p className="text-sm text-destructive">
                  Add fields to every method before publishing.
                </p>
              ) : null}
            </div>
          )}
          {publish.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {publish.error.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={publish.isPending}
              onClick={() => setPublishOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!canPublish || publish.isPending}
              onClick={() => publish.mutate()}
            >
              {publish.isPending ? <Spinner className="size-4" /> : null}
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
