import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { Field, FieldError, FieldLabel } from '@repo/ui/field';
import { Input } from '@repo/ui/input';
import { useId, useState } from 'react';

/**
 * Change a column's data key (doc 264 rule 12): the key in an input, its problem live under it, and Save only for a
 * valid change. Mounted while open, so every opening starts from the current key.
 */
export function ColumnKeyDialog({
  title,
  columnKey,
  problem,
  onSave,
  onClose,
}: {
  title: string;
  columnKey: string;
  /** Why a key can't be used, from the table's own columns (rule 10). */
  problem: (to: string) => string | undefined;
  onSave: (to: string) => void;
  onClose: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(columnKey);
  const error = problem(draft);
  const changed = draft.trim() !== columnKey;
  const save = () => {
    if (error === undefined && changed) onSave(draft.trim());
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change data key</DialogTitle>
          <DialogDescription>
            The key {title}&apos;s answers are stored under. Answers already saved under the old key
            are not moved.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <Field data-invalid={error !== undefined || undefined}>
            <FieldLabel htmlFor={id}>Data key</FieldLabel>
            <Input
              id={id}
              value={draft}
              autoFocus
              aria-invalid={error !== undefined || undefined}
              aria-describedby={error === undefined ? undefined : `${id}-error`}
              onChange={(event) => setDraft(event.target.value)}
              className="font-mono"
            />
            {error !== undefined && <FieldError id={`${id}-error`}>{error}</FieldError>}
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={error !== undefined || !changed} onClick={save}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
