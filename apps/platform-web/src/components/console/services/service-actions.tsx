import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/alert-dialog';
import { Button } from '@repo/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@repo/ui/tooltip';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { archiveService, deleteService } from '@/lib/services';

/** Service lifecycle action (list + detail): Delete when none of the service's application forms has
 * submissions (the service + its empty forms are removed), otherwise Archive. Delete is confirmed with
 * a shadcn AlertDialog (feature 45). */
export function ServiceActions({
  serviceId,
  hasSubmissions,
  archived,
  onDeleted,
}: {
  serviceId: string;
  hasSubmissions: boolean;
  archived: boolean;
  onDeleted?: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['services'] });
  const remove = useMutation({
    mutationFn: () => deleteService(serviceId),
    onSuccess: async () => {
      setConfirm(false);
      await invalidate();
      onDeleted?.();
    },
  });
  const archive = useMutation({
    mutationFn: () => archiveService(serviceId),
    onSuccess: invalidate,
  });

  if (hasSubmissions) {
    // A service with submitted applications can't be deleted — offer Archive (unless already archived)
    // and a disabled Delete with a tooltip explaining why.
    return (
      <div className="flex items-center gap-2">
        {archived ? null : (
          <Button
            size="xs"
            variant="ghost"
            type="button"
            disabled={archive.isPending}
            onClick={() => archive.mutate()}
          >
            <Archive className="size-3.5" aria-hidden />
            Archive
          </Button>
        )}
        <TooltipProvider>
          <Tooltip>
            {/* A disabled button doesn't fire pointer events, so the span carries the hover/focus. */}
            <TooltipTrigger render={<span tabIndex={0} className="inline-flex" />}>
              <Button
                size="xs"
                variant="ghost"
                type="button"
                disabled
                className="pointer-events-none text-destructive"
              >
                <Trash2 className="size-3.5" aria-hidden />
                Delete
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              This service has submissions and can’t be deleted — archive it instead.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <>
      <Button
        size="xs"
        variant="ghost"
        type="button"
        className="text-destructive"
        disabled={remove.isPending}
        onClick={() => setConfirm(true)}
      >
        <Trash2 className="size-3.5" aria-hidden />
        Delete
      </Button>
      <AlertDialog
        open={confirm}
        onOpenChange={(next) => {
          if (!next) {
            setConfirm(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this service?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the service and its versions. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {remove.error ? (
            <p role="alert" className="text-sm text-destructive">
              {remove.error.message}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => remove.mutate()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
