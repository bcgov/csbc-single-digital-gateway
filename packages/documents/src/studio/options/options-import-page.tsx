import { Button } from '@repo/ui/button';
import { Textarea } from '@repo/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/toggle-group';
import { parseImport, type ParsedRow } from './option-import';

// Doc 255 rules 8-10 — the import page the dialog pushes to (forms doc 208's strip, as a page).

export const IMPORT_HINT =
  'Paste CSV, tab- or pipe-separated text, or one option per line. Columns: label, value, description.';

/** What an import does to the rows already there. */
export type ImportMode = 'append' | 'replace';

export interface OptionsImportPageProps {
  /** Held by the dialog, so Back and a return keep what was pasted (rule 8). */
  text: string;
  mode: ImportMode;
  onText: (text: string) => void;
  onMode: (mode: ImportMode) => void;
  onImport: (rows: readonly ParsedRow[], mode: ImportMode) => void;
}

/** The paste box, the Append | Replace choice and `Import N options` (disabled at none). */
export function OptionsImportPage({
  text,
  mode,
  onText,
  onMode,
  onImport,
}: OptionsImportPageProps) {
  const rows = parseImport(text);
  return (
    <div data-slot="options-import-page" className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3">
      <p className="text-xs text-muted-foreground">{IMPORT_HINT}</p>
      <Textarea
        aria-label="Paste options to import"
        value={text}
        onChange={(event) => onText(event.target.value)}
        className="min-h-48 flex-1 resize-y font-mono text-xs"
      />
      <div className="flex items-center justify-between gap-2">
        <ToggleGroup
          spacing={0}
          size="sm"
          aria-label="Import mode"
          value={[mode]}
          // Base UI reports an EMPTY array when the pressed item is pressed again; a mode is always chosen.
          onValueChange={(next: string[]) => {
            const picked = next[0];
            if (picked === 'append' || picked === 'replace') onMode(picked);
          }}
        >
          <ToggleGroupItem value="append">Append</ToggleGroupItem>
          <ToggleGroupItem value="replace">Replace</ToggleGroupItem>
        </ToggleGroup>
        <Button size="sm" disabled={rows.length === 0} onClick={() => onImport(rows, mode)}>
          Import {rows.length} {rows.length === 1 ? 'option' : 'options'}
        </Button>
      </div>
    </div>
  );
}
