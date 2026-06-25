import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@repo/ui/alert-dialog';
import { Button } from '@repo/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { deleteWorkspace } from '@/lib/workspaces';

/** Danger-zone delete: confirm, DELETE the workspace, then return to the workspace gate. */
export function DeleteWorkspaceButton({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => deleteWorkspace(workspaceId),
    onSuccess: async () => {
      // Drop all workspace caches (incl. the deleted one and the gate's "newest") so /app refetches
      // fresh and redirects to a remaining workspace — only showing the create modal if none remain.
      queryClient.removeQueries({ queryKey: ['workspaces'] });
      await navigate({ to: '/app' });
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="destructive" type="button">
            Delete workspace
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {workspaceName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the workspace and removes every member. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={mutation.isPending}
            onClick={() => {
              mutation.mutate();
            }}
          >
            Delete workspace
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
