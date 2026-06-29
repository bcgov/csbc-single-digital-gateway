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
import { useBlocker } from '@tanstack/react-router';
import { useCallback } from 'react';

/** Blocks in-app navigation (and warns on tab close/refresh) while `when` is true, confirming before
 * the user discards unsaved changes. The affirmative action discards and proceeds. */
export function UnsavedChangesGuard({ when }: { when: boolean }) {
  // Memoize so the blocker only re-registers when `when` flips, not on every keystroke.
  const shouldBlockFn = useCallback(() => when, [when]);
  const blocker = useBlocker({
    shouldBlockFn,
    enableBeforeUnload: shouldBlockFn,
    withResolver: true,
  });

  return (
    <AlertDialog
      open={blocker.status === 'blocked'}
      onOpenChange={(open) => {
        if (!open) {
          blocker.reset?.();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            Your changes haven’t been saved and will be lost if you leave this page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => blocker.reset?.()}>Keep editing</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => blocker.proceed?.()}
          >
            Discard changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
