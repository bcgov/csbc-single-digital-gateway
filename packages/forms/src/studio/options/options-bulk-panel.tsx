import { Textarea } from '@repo/ui/textarea';

// Doc 208 rules 3-4, 19 — Bulk edit: the whole list as text.

export const BULK_HINT =
  'One option per line: Label | value | Description. Value and description are optional.';

export interface OptionsBulkPanelProps {
  readonly text: string;
  onChange(text: string): void;
}

export function OptionsBulkPanel({ text, onChange }: OptionsBulkPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p className="text-xs text-muted-foreground">{BULK_HINT}</p>
      <Textarea
        aria-label="Bulk options"
        value={text}
        onChange={(event) => onChange(event.target.value)}
        /* `Textarea` ships `field-sizing-content resize-none`; a bulk editor wants a real box (doc 206 r32). */
        className="min-h-[17.5rem] flex-1 resize-y font-mono text-xs leading-relaxed"
      />
    </div>
  );
}
