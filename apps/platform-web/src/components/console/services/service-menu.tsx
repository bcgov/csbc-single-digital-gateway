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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EllipsisVertical } from 'lucide-react';
import { useState } from 'react';
import {
  archiveService,
  deleteService,
  discardServiceVersion,
  reactivateService,
} from '@/lib/services';

/** Overflow (⋯) menu for a service (detail header + each services-list row): discard the current draft
 * (detail only), archive ↔ publish/restore the service, and delete it (only when no application form has
 * submissions) (feature 49/51/52). */
export function ServiceMenu({
  serviceId,
  versionId = '',
  canDiscard = false,
  hasSubmissions,
  archived,
  latestPublished,
  onDeleted,
  onDiscarded,
}: {
  serviceId: string;
  /** The version to discard — only needed when `canDiscard` (the detail). */
  versionId?: string;
  /** The selected version is a draft AND it isn't the service's only version (detail only). */
  canDiscard?: boolean;
  hasSubmissions: boolean;
  archived: boolean;
  /** Whether the latest version was ever published — un-archive reads "Publish service" vs "Restore". */
  latestPublished: boolean;
  onDeleted?: () => void;
  /** Called after the current draft version is discarded (it no longer exists → navigate away). */
  onDiscarded?: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<null | 'delete' | 'discard'>(null);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['services'] });

  const remove = useMutation({
    mutationFn: () => deleteService(serviceId),
    onSuccess: async () => {
      setConfirm(null);
      await invalidate();
      onDeleted?.();
    },
  });
  const discard = useMutation({
    mutationFn: () => discardServiceVersion(serviceId, versionId),
    onSuccess: async () => {
      setConfirm(null);
      await invalidate();
      onDiscarded?.();
    },
  });
  const archive = useMutation({
    mutationFn: () => archiveService(serviceId),
    onSuccess: invalidate,
  });
  const reactivate = useMutation({
    mutationFn: () => reactivateService(serviceId),
    onSuccess: invalidate,
  });

  const active = confirm === 'discard' ? discard : remove;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="More actions"
          className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <EllipsisVertical className="size-[18px]" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {canDiscard ? (
            <>
              <DropdownMenuItem onClick={() => setConfirm('discard')}>
                Discard draft
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          {archived ? (
            <DropdownMenuItem disabled={reactivate.isPending} onClick={() => reactivate.mutate()}>
              {latestPublished ? 'Publish service' : 'Restore'}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled={archive.isPending} onClick={() => archive.mutate()}>
              Archive service
            </DropdownMenuItem>
          )}
          {/* A service can only be deleted when none of its application forms has submissions. */}
          <DropdownMenuItem
            className="text-destructive"
            disabled={hasSubmissions}
            onClick={() => setConfirm('delete')}
          >
            Delete service
          </DropdownMenuItem>
          {hasSubmissions ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">
              Has submissions — archive it instead.
            </p>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(next) => {
          if (!next) {
            setConfirm(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === 'discard' ? 'Discard this draft?' : 'Delete this service?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'discard'
                ? 'This permanently deletes the draft version and the application forms it created. This can’t be undone.'
                : 'This permanently deletes the service and its versions. This can’t be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {active.error ? (
            <p role="alert" className="text-sm text-destructive">
              {active.error.message}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => active.mutate()}
            >
              {confirm === 'discard' ? 'Discard draft' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
