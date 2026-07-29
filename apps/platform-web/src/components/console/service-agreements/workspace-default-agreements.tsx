import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  addDefaultAgreement,
  agreementsQueryOptions,
  type DefaultAgreement,
  removeDefaultAgreement,
  workspaceDefaultAgreementsQueryOptions,
} from '@/lib/service-agreements';
import { workspaceBySlugQueryOptions } from '@/lib/workspaces';

const DEFAULTS_KEY = (workspaceId: string) =>
  ['workspace-default-agreements', workspaceId] as const;

/**
 * Workspace default agreements (feature 98; relocated to the Settings screen in feature 149) —
 * agreements that apply to EVERY service in the workspace. Rendered as a settings Card so its heading
 * matches General / Danger zone. Any member sees the list; only a workspace **admin** can add/remove
 * (the API enforces it too).
 */
export function WorkspaceDefaultAgreements({
  slug,
  workspaceId,
}: {
  slug: string;
  workspaceId: string;
}) {
  const queryClient = useQueryClient();
  const { data: workspace } = useQuery(workspaceBySlugQueryOptions(slug));
  const isAdmin = workspace?.role === 'admin';
  const { data: defaults = [] } = useQuery(workspaceDefaultAgreementsQueryOptions(workspaceId));
  const [addOpen, setAddOpen] = useState(false);

  const remove = useMutation({
    mutationFn: (id: string) => removeDefaultAgreement(workspaceId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEFAULTS_KEY(workspaceId) }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Default agreements</CardTitle>
        <CardDescription>
          Applied to every service in this workspace, in addition to a service&apos;s own
          agreements.
        </CardDescription>
        {isAdmin ? (
          <CardAction className="col-start-2 row-start-1 self-start">
            <Button size="sm" variant="outline" type="button" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" aria-hidden />
              Add default
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {remove.error ? (
          <p role="alert" className="text-sm text-destructive">
            {remove.error.message}
          </p>
        ) : null}

        {defaults.length === 0 ? (
          <p className="text-sm text-muted-foreground">No default agreements for this workspace.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {defaults.map((def: DefaultAgreement) => (
              <li
                key={def.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{def.title}</span>
                  <Badge color={def.isOptional ? 'grey' : 'blue'}>
                    {def.isOptional ? 'Optional' : 'Required'}
                  </Badge>
                  {def.isGlobal ? <Badge color="grey">Global</Badge> : null}
                </span>
                {isAdmin ? (
                  <Button
                    size="xs"
                    variant="ghost"
                    type="button"
                    className="shrink-0 text-destructive"
                    disabled={remove.isPending && remove.variables === def.id}
                    onClick={() => remove.mutate(def.id)}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {isAdmin ? (
        <AddDefaultModal
          open={addOpen}
          onOpenChange={setAddOpen}
          workspaceId={workspaceId}
          defaultedDocumentIds={defaults.map((d) => d.agreementDocumentId)}
        />
      ) : null}
    </Card>
  );
}

/** Pick a published agreement (workspace or global) to add as a default. */
function AddDefaultModal({
  open,
  onOpenChange,
  workspaceId,
  defaultedDocumentIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  defaultedDocumentIds: string[];
}) {
  const queryClient = useQueryClient();
  const { data: agreements = [] } = useQuery({
    ...agreementsQueryOptions(workspaceId),
    enabled: open && workspaceId !== '',
  });
  const already = new Set(defaultedDocumentIds);
  const selectable = agreements.filter((a) => a.status === 'published' && !already.has(a.id));

  const add = useMutation({
    mutationFn: (agreementDocumentId: string) =>
      addDefaultAgreement(workspaceId, agreementDocumentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: DEFAULTS_KEY(workspaceId) });
      onOpenChange(false);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !add.isPending) {
          onOpenChange(false);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a default agreement</DialogTitle>
          <DialogDescription>
            Choose a published agreement to apply workspace-wide.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {add.error ? (
            <p role="alert" className="text-sm text-destructive">
              {add.error.message}
            </p>
          ) : null}
          {selectable.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No published agreements available to add.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {selectable.map((agreement) => (
                <li key={agreement.id}>
                  <button
                    type="button"
                    disabled={add.isPending}
                    onClick={() => add.mutate(agreement.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                  >
                    <span className="font-medium text-foreground">{agreement.title}</span>
                    {agreement.workspaceId === null ? <Badge color="grey">Global</Badge> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
