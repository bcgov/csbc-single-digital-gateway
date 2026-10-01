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
import { useCallback, useId, useState } from 'react';

/** A node whose delete waits on the gate: its id, what it is, and the name the dialog shows. */
export interface PendingDelete {
  id: string;
  kind: 'form' | 'condition';
  name: string;
}

interface DeleteGateProps {
  pending: PendingDelete | null;
  onConfirm: (dontAskAgain: boolean) => void;
  onCancel: () => void;
}

const TITLE = { form: 'Delete form?', condition: 'Delete condition?' } as const;

/** What goes with the node. A Condition takes what only its branches lead to (`removeNode`'s `branchOnly`). */
function descriptionFor({ kind, name }: PendingDelete): string {
  return kind === 'form'
    ? `"${name}" will be removed from the document.`
    : `"${name}", its criteria and any steps only its branches lead to will be removed.`;
}

/**
 * Confirms a node delete (doc 234 rules 8-9), as Form Studio's delete confirmation does. Open while a delete is
 * pending; "Don't ask me again" starts unticked every time it opens and only counts when the delete is confirmed.
 * Cancel, Escape or the backdrop remove nothing.
 */
export function DeleteGate({ pending, onConfirm, onCancel }: DeleteGateProps) {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [openedFor, setOpenedFor] = useState(pending);
  // Kept while the dialog animates closed, so its text doesn't blank out as `pending` clears.
  const [shown, setShown] = useState(pending);
  const checkboxId = useId();
  const labelId = useId();

  if (pending !== openedFor) {
    setOpenedFor(pending);
    setDontAskAgain(false);
    if (pending !== null) setShown(pending);
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
          <AlertDialogTitle>{shown === null ? '' : TITLE[shown.kind]}</AlertDialogTitle>
          <AlertDialogDescription>
            {shown === null ? '' : descriptionFor(shown)}
          </AlertDialogDescription>
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

/**
 * The gate's state for a canvas: `request` either removes at once (the author stopped asking) or holds the delete
 * until the dialog answers.
 */
export function useDeleteGate(
  askBeforeDelete: boolean,
  remove: (nodeId: string) => void,
  onStopAsking: (() => void) | undefined,
) {
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const request = useCallback(
    (target: PendingDelete) => (askBeforeDelete ? setPending(target) : remove(target.id)),
    [askBeforeDelete, remove],
  );
  return {
    request,
    gate: (
      <DeleteGate
        pending={pending}
        onCancel={() => setPending(null)}
        onConfirm={(dontAskAgain) => {
          if (pending !== null) remove(pending.id);
          if (dontAskAgain) onStopAsking?.();
          setPending(null);
        }}
      />
    ),
  };
}
