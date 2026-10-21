import { Button } from '@repo/ui/button';
import { DialogFooter } from '@repo/ui/dialog';
import { Kbd } from '@repo/ui/kbd';

// Doc 206 rules 18-19, 32 — the dialog's footer: what is wrong, or how many options there are, and Save.
// Its own module because the dialog is at the 300-line gate (doc 208 rule 20).

const countLabel = (count: number) => `${count} ${count === 1 ? 'option' : 'options'}`;

export interface OptionsDialogFooterProps {
  /** Why Save is disabled, or `undefined` when it is not (doc 206 rules 17-20). */
  readonly summary: string | undefined;
  readonly kept: number;
  readonly canSave: boolean;
  onCancel(): void;
  onSave(): void;
}

export function OptionsDialogFooter({
  summary,
  kept,
  canSave,
  onCancel,
  onSave,
}: OptionsDialogFooterProps) {
  return (
    <DialogFooter className="items-center border-t border-border px-4 py-3 sm:justify-between">
      <div className="flex flex-col gap-0.5 text-left">
        {summary === undefined ? (
          <span className="text-xs text-muted-foreground">{countLabel(kept)}</span>
        ) : (
          <span className="text-xs text-destructive">{summary}</span>
        )}
        <span className="text-[0.6875rem] text-muted-foreground">
          <Kbd>Enter</Kbd> adds a row · <Kbd>⌘↵</Kbd> saves
        </span>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" disabled={!canSave} onClick={onSave}>
          Save options
        </Button>
      </div>
    </DialogFooter>
  );
}
