import { mdiArrowLeft } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@repo/ui/dialog';
import { Kbd } from '@repo/ui/kbd';
import type { OptionsTarget } from './options-target';

// Doc 255 rules 4, 8 — the dialog's header (per page) and the list page's footer.

export type OptionsPage = 'list' | 'import';

export function OptionsDialogHeader({
  target,
  page,
  onImport,
  onBack,
}: {
  target: OptionsTarget;
  page: OptionsPage;
  onImport: () => void;
  onBack: () => void;
}) {
  return (
    <DialogHeader showCloseButton className="border-b border-border px-4 py-3 text-left">
      {/* `pr-10` keeps Import clear of the dialog's close X, which sits absolutely in this corner. */}
      <div className="flex items-center justify-between gap-3 pr-10">
        <div className="flex min-w-0 items-center gap-2">
          {page === 'import' && (
            <Button variant="ghost" size="icon-xs" aria-label="Back to options" onClick={onBack}>
              <Icon path={mdiArrowLeft} size="14px" />
            </Button>
          )}
          <div className="min-w-0">
            <DialogTitle className="text-sm font-bold">
              {page === 'import' ? 'Import options' : 'Edit options'}
            </DialogTitle>
            <DialogDescription className="truncate text-xs text-muted-foreground">
              {target.label} · {target.fieldName}
            </DialogDescription>
          </div>
        </div>
        {page === 'list' && (
          <Button variant="outline" size="sm" className="shrink-0" onClick={onImport}>
            Import
          </Button>
        )}
      </div>
    </DialogHeader>
  );
}

const countLabel = (count: number) => `${count} ${count === 1 ? 'option' : 'options'}`;

export function OptionsDialogFooter({
  summary,
  kept,
  canSave,
  onCancel,
  onSave,
}: {
  /** Why Save is disabled, or `undefined` when it is not (rule 6). */
  summary: string | undefined;
  kept: number;
  canSave: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
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
