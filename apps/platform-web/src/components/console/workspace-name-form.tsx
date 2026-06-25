import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { updateWorkspace } from '@/lib/workspaces';

/** Rename a workspace from Settings → General. Disabled for non-admins (the API also enforces it). */
export function WorkspaceNameForm({
  workspaceId,
  initialName,
  canEdit,
}: {
  workspaceId: string;
  initialName: string;
  canEdit: boolean;
}) {
  const [name, setName] = useState(initialName);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => updateWorkspace(workspaceId, name.trim()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspaces'] }),
  });

  const dirty = name.trim() !== initialName && name.trim().length > 0;

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    if (dirty) {
      mutation.mutate();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex max-w-sm flex-col gap-2">
        <Label htmlFor="workspace-name">Workspace name</Label>
        <Input
          id="workspace-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={!canEdit}
        />
      </div>
      {mutation.isError ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Could not save changes. Please try again.
        </p>
      ) : null}
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          type="button"
          onClick={() => setName(initialName)}
          disabled={!dirty || mutation.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!canEdit || !dirty || mutation.isPending}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
