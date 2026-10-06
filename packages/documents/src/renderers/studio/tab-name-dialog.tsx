import { Button } from '@repo/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@repo/ui/dialog';
import { Field, FieldLabel } from '@repo/ui/field';
import { Input } from '@repo/ui/input';
import { useId, useState } from 'react';

/** Rename a tab (doc 272 rule 5): a non-blank, changed name saves; Cancel / Escape closes. Mounted while open. */
export function TabNameDialog({
  name,
  onSave,
  onClose,
}: {
  name: string;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(name);
  const next = draft.trim();
  const valid = next !== '' && next !== name;
  const save = () => {
    if (valid) onSave(next);
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename tab</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <Field>
            <FieldLabel htmlFor={id}>Tab name</FieldLabel>
            <Input
              id={id}
              value={draft}
              autoFocus
              onChange={(event) => setDraft(event.target.value)}
            />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid} onClick={save}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
