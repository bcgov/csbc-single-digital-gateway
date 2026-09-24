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

export interface ConfirmDiscardDialogProps {
  open: boolean;
  /** Keep editing — the dialog closes and nothing is lost. */
  onCancel: () => void;
  /** Throw the unsaved edits away and do the thing that was interrupted. */
  onConfirm: () => void;
}

/**
 * "Discard unsaved changes?" — an explicit Keep editing beside a solid destructive Discard.
 *
 * Extracted from `UnsavedChangesGuard` (doc 218 rule 19), which still renders it for its no-save
 * variant. It exists separately because the guard can only see NAVIGATION: an in-page version switch
 * on a template or agreement detail page changes no route, so `useBlocker` never fires, and those
 * pages need the same question asked about something the guard cannot observe.
 *
 * Controlled and stateless — the caller owns which action is pending, because only the caller knows
 * what to resume once the author confirms.
 */
export function ConfirmDiscardDialog({ open, onCancel, onConfirm }: ConfirmDiscardDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onCancel();
        }
      }}
    >
      {/* No `relative` here: the popup is already `fixed`, and `cn`'s tailwind-merge would treat
          `relative` as the winning member of the same position group — dropping `fixed` and
          un-centering the whole dialog. */}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          {/* Deliberately NOT "if you leave this page": the same dialog asks about an in-page version
              switch, where nobody is leaving anything. It has to be true of both. */}
          <AlertDialogDescription>
            Your changes haven’t been saved and will be lost if you continue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Keep editing</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Discard changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
