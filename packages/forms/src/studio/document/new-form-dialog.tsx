import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { useId, useState } from 'react';
import type { FormChoice } from '../../types/index';
import { FormChoiceCards } from './form-choice-cards';

interface NewFormDialogProps {
  /** Open while the session status is `choosing` (doc 200 rule 7). */
  readonly open: boolean;
  /** Dismissal — Escape, the close button or the backdrop. Dismissing without choosing changes nothing. */
  onOpenChange(open: boolean): void;
  /** The explicit confirmation (doc 200 rule 11): the chosen key, reported upward. */
  onChoose(choice: FormChoice): void;
}

/** The choice a freshly opened dialog starts on — the first of `FORM_CHOICES` (doc 200 rule 8). */
const DEFAULT_CHOICE: FormChoice = 'new-multi-stage';

/**
 * Asks the author what kind of form to create (doc 200 rules 7-11).
 *
 * This is `@repo/ui/dialog` and deliberately NOT `@repo/ui/alert-dialog`: rule 7 requires it to be dismissible, while
 * the alert dialog used by `delete-confirmation.tsx` is undismissible on purpose. Dismissing here reports nothing, so
 * the caller's session stays in `choosing`.
 *
 * The component is presentational plus its own selection state — it never builds a document. Rule 11: a choice is
 * confirmed only by the Create button, because a radio group that acted on focus change would be unusable by keyboard.
 */
export function NewFormDialog({ open, onOpenChange, onChoose }: NewFormDialogProps) {
  const [choice, setChoice] = useState<FormChoice>(DEFAULT_CHOICE);
  const [openedAs, setOpenedAs] = useState(open);
  const labelId = useId();

  // Each fresh open starts from the default choice — the same reset shape delete-confirmation.tsx uses.
  if (open !== openedAs) {
    setOpenedAs(open);
    if (open) setChoice(DEFAULT_CHOICE);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-labelledby={labelId}>
        <DialogHeader>
          <DialogTitle id={labelId}>New form</DialogTitle>
          <DialogDescription>Choose what kind of form to start from.</DialogDescription>
        </DialogHeader>
        <FormChoiceCards value={choice} onValueChange={setChoice} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onChoose(choice)}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
