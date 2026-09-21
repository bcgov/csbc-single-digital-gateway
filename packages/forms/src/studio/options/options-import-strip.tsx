import { Button } from '@repo/ui/button';
import { Textarea } from '@repo/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/toggle-group';
import { useState } from 'react';
import { parseImport } from './option-import';
import type { ParsedRow } from './option-bulk';

// Doc 208 rules 8-13 — the import strip.

export const IMPORT_HINT =
  'Paste CSV, tab- or pipe-separated text, or one option per line. Columns: label, value, description.';

/** Rule 11: what an import does to the rows already there. */
export type ImportMode = 'append' | 'replace';

export interface OptionsImportStripProps {
  onImport(rows: readonly ParsedRow[], mode: ImportMode): void;
}

export function OptionsImportStrip({ onImport }: OptionsImportStripProps) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<ImportMode>('append');
  const rows = parseImport(text);

  return (
    <div className="flex flex-col gap-2 border-b border-border bg-gray-10 px-4 py-3">
      <p className="text-xs text-muted-foreground">{IMPORT_HINT}</p>
      <Textarea
        aria-label="Paste options to import"
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="min-h-20 resize-y font-mono text-xs"
      />
      <div className="flex items-center justify-between gap-2">
        <ToggleGroup
          spacing={0}
          size="sm"
          aria-label="Import mode"
          value={[mode]}
          /* Rule 2's guard: Base UI reports an ARRAY, and an empty one when the active item is re-pressed. */
          onValueChange={(next) => {
            const picked = next[0];
            if (picked === 'append' || picked === 'replace') setMode(picked);
          }}
        >
          <ToggleGroupItem value="append">Append</ToggleGroupItem>
          <ToggleGroupItem value="replace">Replace</ToggleGroupItem>
        </ToggleGroup>
        {/* Rule 12: nothing to import is not an error, it is simply not yet actionable. */}
        <Button
          size="sm"
          disabled={rows.length === 0}
          onClick={() => {
            onImport(rows, mode);
            setText('');
          }}
        >
          Import {rows.length} {rows.length === 1 ? 'option' : 'options'}
        </Button>
      </div>
    </div>
  );
}
