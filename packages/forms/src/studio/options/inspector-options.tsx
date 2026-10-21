import { Button } from '@repo/ui/button';
import { Separator } from '@repo/ui/separator';
import type { OptionsTarget } from './options-target';

// Doc 206 rules 2-4 — the READ-ONLY Options summary at the bottom of the inspector.
//
// Plain JSX, not an `InspectorField`: every inspector write passes `fieldAccepts`, which admits only a
// string, boolean or finite number, so an option list can never ride the JSONForms data channel. Widening
// that guard would be the wrong fix — the dialog does not use the channel at all.

/** Rule 3: how many options are listed before the overflow row. */
const PREVIEW = 4;

export interface InspectorOptionsProps {
  readonly target: OptionsTarget;
  onEdit(): void;
}

const countLabel = (count: number) => `${count} ${count === 1 ? 'option' : 'options'}`;

export function InspectorOptions({ target, onEdit }: InspectorOptionsProps) {
  const { options, fieldName } = target;
  const shown = options.slice(0, PREVIEW);
  const overflow = options.length - shown.length;

  return (
    <div data-slot="inspector-options" className="flex flex-col gap-2">
      <Separator />
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-bold">Options</h3>
        <span className="text-xs text-muted-foreground">{countLabel(options.length)}</span>
      </div>
      <p className="truncate text-xs text-muted-foreground">{fieldName}</p>

      {options.length === 0 ? (
        <p className="rounded-md border border-border py-3 text-center text-xs text-muted-foreground">
          No options
        </p>
      ) : (
        <ul className="overflow-hidden rounded-md border border-border">
          {shown.map((option) => (
            <li
              key={String(option.value)}
              className="flex items-center justify-between gap-2 border-b border-border px-2 py-1.5 last:border-b-0"
            >
              {/*
                Hand verification: with `shrink-0` on the value, a long const ate the whole row and the
                labels truncated to "Whe…", "Quie…". Both sides shrink, and the value is capped at 45% so
                the LABEL — the thing an author recognises an option by — keeps the larger share.
              */}
              <span className="min-w-0 flex-1 truncate text-xs">{option.label}</span>
              <span className="min-w-0 max-w-[45%] truncate font-mono text-[0.6875rem] text-muted-foreground">
                {String(option.value)}
              </span>
            </li>
          ))}
          {overflow > 0 ? (
            <li className="bg-gray-10 px-2 py-1.5 text-xs text-muted-foreground">
              +{overflow} more
            </li>
          ) : null}
        </ul>
      )}

      <Button size="sm" className="w-full" onClick={onEdit}>
        Edit options
      </Button>
      <p className="text-center text-[0.6875rem] text-muted-foreground">
        Or double-click the field on the canvas
      </p>
    </div>
  );
}
