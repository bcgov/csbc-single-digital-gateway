import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { createWorkspace } from '@/lib/workspaces';

interface CreateWorkspaceModalProps {
  /** When false the modal is forced (no Cancel, no close affordance) — the onboarding gate. */
  dismissable?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Create Workspace dialog. On submit it POSTs `/v1/workspaces`, refreshes the workspaces cache, then
 * navigates to the new `/app/:slug`. The forced variant (no workspace yet) has no escape.
 */
export function CreateWorkspaceModal({
  dismissable = false,
  open = true,
  onOpenChange,
}: CreateWorkspaceModalProps) {
  const [name, setName] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({ mutationFn: createWorkspace });

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return;
    }
    const created = await mutation.mutateAsync(trimmed);
    await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    onOpenChange?.(false);
    await navigate({ to: '/app/$slug', params: { slug: created.slug } });
  }

  return (
    // The forced (gate) variant is non-modal so the sidebar profile card stays interactive — the
    // only console affordance that must keep working while the user has no workspace.
    <Dialog open={open} onOpenChange={dismissable ? onOpenChange : undefined} modal={dismissable}>
      <DialogContent showCloseButton={dismissable}>
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>
          <DialogDescription>
            {dismissable
              ? 'Add a new workspace to organise your services.'
              : 'Create your first workspace to get started.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="workspace-name">Workspace name</Label>
            {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
            <Input
              id="workspace-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. City of Riverton"
              autoFocus
            />
          </div>
          {mutation.isError ? (
            <p role="alert" className="text-sm text-destructive">
              Could not create the workspace. Please try again.
            </p>
          ) : null}
          <DialogFooter>
            {dismissable ? (
              <Button type="button" variant="ghost" onClick={() => onOpenChange?.(false)}>
                Cancel
              </Button>
            ) : null}
            <Button type="submit" disabled={mutation.isPending || name.trim().length === 0}>
              Create workspace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
