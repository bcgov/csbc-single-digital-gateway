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

/** A node — or a page element (doc 242) — whose delete waits on the gate: its id, what it is, and its name. */
export interface PendingDelete {
  id: string;
  kind: 'form' | 'condition' | 'element';
  name: string;
}

/**
 * How a delete went (doc 235 rule 13): `node` removes the node alone — a Form, or a Condition whose branches stay,
 * floating; `subtree` takes a Condition's branch-only nodes with it.
 */
export type DeleteChoice = 'node' | 'subtree';

/** The choices "Don't ask me again" remembered, one per kind — one object rather than a flag each. */
export interface DeleteChoices {
  form?: 'node';
  element?: 'node';
  condition?: DeleteChoice;
}

interface DeleteGateProps {
  pending: PendingDelete | null;
  onConfirm: (choice: DeleteChoice, dontAskAgain: boolean) => void;
  onCancel: () => void;
}

const TITLE = {
  form: 'Delete form?',
  condition: 'Delete condition?',
  element: 'Delete element?',
} as const;

function descriptionFor({ kind, name }: PendingDelete): string {
  if (kind === 'element') return `"${name}" will be removed from the form.`;
  return kind === 'form'
    ? `"${name}" will be removed from the document.`
    : `Do you want to delete all branches or only the condition itself?`;
}

/**
 * Confirms a node delete (doc 234 rules 8-9), as Form Studio's delete confirmation does. A Form asks Cancel / Delete;
 * a Condition stacks All branches / Condition only / Cancel (doc 235 rule 12). "Don't ask me again" starts unticked
 * every time it opens and only counts when a delete is confirmed. Cancel, Escape or the backdrop remove nothing.
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
            {shown?.kind === 'condition' ? 'Remember my preference' : "Don't ask me again"}
          </Label>
        </div>
        {shown?.kind === 'condition' ? (
          // Three choices are too wide for one row: stacked full width, the most destructive first (doc 235 rule 12).
          <AlertDialogFooter className="flex-col sm:flex-col group-data-[size=sm]/alert-dialog-content:flex">
            <AlertDialogAction
              variant="destructive"
              className="w-full"
              onClick={() => onConfirm('subtree', dontAskAgain)}
            >
              All branches
            </AlertDialogAction>
            <AlertDialogAction className="w-full" onClick={() => onConfirm('node', dontAskAgain)}>
              Condition only
            </AlertDialogAction>
            <AlertDialogCancel variant="ghost" className="w-full">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        ) : (
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => onConfirm('node', dontAskAgain)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * The gate's state for a canvas: `request` applies the choice remembered for the node's kind at once, or holds the
 * delete until the dialog answers. `remove` deletes with a choice; `onRemember` records one for a kind.
 */
export function useDeleteGate(
  choices: DeleteChoices,
  remove: (target: PendingDelete, choice: DeleteChoice) => void,
  onRemember: ((kind: PendingDelete['kind'], choice: DeleteChoice) => void) | undefined,
) {
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const request = useCallback(
    (target: PendingDelete) => {
      const remembered = choices[target.kind];
      if (remembered === undefined) setPending(target);
      else remove(target, remembered);
    },
    [choices, remove],
  );
  return {
    request,
    gate: (
      <DeleteGate
        pending={pending}
        onCancel={() => setPending(null)}
        onConfirm={(choice, dontAskAgain) => {
          if (pending !== null) {
            remove(pending, choice);
            if (dontAskAgain) onRemember?.(pending.kind, choice);
          }
          setPending(null);
        }}
      />
    ),
  };
}
