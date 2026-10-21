import { Button } from '@repo/ui/button';
import { DialogDescription, DialogHeader, DialogTitle } from '@repo/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/toggle-group';
import type { OptionsTarget } from './options-target';

// Doc 208 rules 1-2 — the dialog's header: what is being edited, the List/Bulk switch and the Import toggle.
// Its own module because the dialog is at the 300-line gate (rule 20).

export type EditMode = 'list' | 'bulk';

export interface OptionsDialogHeaderProps {
  readonly target: OptionsTarget;
  readonly mode: EditMode;
  readonly importing: boolean;
  onMode(mode: EditMode): void;
  onToggleImport(): void;
}

export function OptionsDialogHeader({
  target,
  mode,
  importing,
  onMode,
  onToggleImport,
}: OptionsDialogHeaderProps) {
  return (
    <DialogHeader showCloseButton className="border-b border-border px-4 py-3 text-left">
      <div className="flex items-center justify-between gap-3 pr-6">
        <div className="min-w-0">
          <DialogTitle className="text-sm font-bold">Options</DialogTitle>
          <DialogDescription className="truncate text-xs text-muted-foreground">
            {target.label} · {target.fieldName}
          </DialogDescription>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ToggleGroup
            spacing={0}
            size="sm"
            aria-label="Edit mode"
            value={[mode]}
            /**
             * Rule 2: Base UI reports the pressed set as an ARRAY, and an EMPTY one when the active item is
             * re-pressed — unguarded, the dialog would end up showing neither mode.
             */
            onValueChange={(next) => {
              const picked = next[0];
              if (picked === 'list' || picked === 'bulk') onMode(picked);
            }}
          >
            <ToggleGroupItem value="list">List</ToggleGroupItem>
            <ToggleGroupItem value="bulk">Bulk</ToggleGroupItem>
          </ToggleGroup>
          <Button variant="outline" size="sm" aria-expanded={importing} onClick={onToggleImport}>
            Import
          </Button>
        </div>
      </div>
    </DialogHeader>
  );
}
