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
import { Checkbox } from '@repo/ui/checkbox';
import { Label } from '@repo/ui/label';
import { useId, useState } from 'react';
import { isGridLayoutType } from '../renderers/gridstack/grid-layouts';
import type { PendingDelete } from './use-studio-selection';

interface DeleteConfirmationProps {
  readonly pending: PendingDelete | null;
  onConfirm(dontAskAgain: boolean): void;
  onCancel(): void;
}

const DESCRIPTION = 'This element will be removed from the form.';
const GRID_DESCRIPTION = 'This grid and everything inside it will be removed from the form.';
const LAYOUT_DESCRIPTION = 'This layout and everything inside it will be removed from the form.';

/** Rule 21: a Grid and the other gridstack layouts say their children go too. */
function descriptionFor(elementType: string | undefined): string {
  if (elementType === 'Grid') return GRID_DESCRIPTION;
  return elementType !== undefined && isGridLayoutType(elementType)
    ? LAYOUT_DESCRIPTION
    : DESCRIPTION;
}

/**
 * Confirms an element delete (doc 185 rules 21-22). Open while an element is pending; "Don't ask me
 * again" starts unticked every time it opens and only counts when the delete is confirmed. Cancel,
 * Escape or the backdrop remove nothing.
 */
export function DeleteConfirmation({ pending, onConfirm, onCancel }: DeleteConfirmationProps) {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [openedFor, setOpenedFor] = useState(pending);
  const checkboxId = useId();
  const labelId = useId();

  if (pending !== openedFor) {
    setOpenedFor(pending);
    setDontAskAgain(false);
  }

  return (
    <AlertDialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete element?</AlertDialogTitle>
          <AlertDialogDescription>{descriptionFor(pending?.elementType)}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-center gap-2">
          <Checkbox
            id={checkboxId}
            aria-labelledby={labelId}
            checked={dontAskAgain}
            onCheckedChange={(checked) => setDontAskAgain(checked)}
          />
          <Label id={labelId} htmlFor={checkboxId}>
            {"Don't ask me again"}
          </Label>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => onConfirm(dontAskAgain)}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
