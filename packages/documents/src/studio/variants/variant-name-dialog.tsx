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
import { useId, useState, type FormEvent } from 'react';
import { MAX_VARIANT_NAME, variantNameProblem } from './variant-names';

/** What the name dialog is doing: naming a new variant, or renaming `from`. */
export type NameRequest = { mode: 'create' } | { mode: 'rename'; from: string };

export interface VariantNameDialogProps {
  request: NameRequest | null;
  /** Every variant's name, for the uniqueness check (doc 262 rule 8). */
  existing: readonly string[];
  onClose: () => void;
  onSubmit: (request: NameRequest, name: string) => void;
}

/** Names a new variant or renames one (doc 262 rules 6, 8, 9): the problem shows inline and blocks the confirm. */
export function VariantNameDialog({
  request,
  existing,
  onClose,
  onSubmit,
}: VariantNameDialogProps) {
  return (
    <Dialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent data-slot="variant-name-dialog">
        {/* Keyed so each opening starts from the request's own name. */}
        {request !== null && (
          <NameForm
            key={request.mode === 'rename' ? `rename:${request.from}` : 'create'}
            request={request}
            existing={existing}
            onClose={onClose}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NameForm({
  request,
  existing,
  onClose,
  onSubmit,
}: Omit<VariantNameDialogProps, 'request'> & { request: NameRequest }) {
  const renaming = request.mode === 'rename';
  const [name, setName] = useState(renaming ? request.from : '');
  const [touched, setTouched] = useState(false);
  const inputId = useId();
  const problem = variantNameProblem(name, existing, renaming ? request.from : undefined);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (problem === undefined) onSubmit(request, name.trim());
  };
  // An empty new name is not an error until the author tries it; every other problem shows as they type.
  const shown = touched || name !== '' ? problem : undefined;
  return (
    <form onSubmit={submit} className="contents">
      <DialogHeader>
        <DialogTitle>{renaming ? 'Rename variant' : 'New variant'}</DialogTitle>
        <DialogDescription>
          {renaming
            ? 'The variant keeps its layout; only its name changes.'
            : 'A new variant starts as a blank form over the same fields.'}
        </DialogDescription>
      </DialogHeader>
      <Field data-invalid={shown !== undefined || undefined}>
        <FieldLabel htmlFor={inputId}>Name</FieldLabel>
        <Input
          id={inputId}
          value={name}
          maxLength={MAX_VARIANT_NAME + 10}
          autoFocus
          aria-invalid={shown !== undefined || undefined}
          onChange={(event) => setName(event.target.value)}
        />
        {shown !== undefined && <FieldError>{shown}</FieldError>}
      </Field>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={problem !== undefined}>
          {renaming ? 'Rename' : 'Create'}
        </Button>
      </DialogFooter>
    </form>
  );
}
