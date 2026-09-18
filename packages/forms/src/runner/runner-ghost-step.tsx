import type { StepRange } from './runner-projection';
import { STEP_NUMBER } from './runner-row-parts';

// The ghost step (doc 202 rule 10d): what an unmade choice may still add, after the listed steps.

const stages = (count: number) => `${count} more ${count === 1 ? 'stage' : 'stages'}`;

/**
 * Rule 10d: the ghost step's caption — "3 more stages" when every branch agrees, "Up to 3 more stages" when some
 * branch adds none, else the range "2–4 more stages". It counts STAGES, the unit the rail lists.
 */
export function ghostCaption({ min, max }: StepRange): string {
  if (min === max) return stages(max);
  if (min === 0) return `Up to ${stages(max)}`;
  return `${min}–${stages(max)}`;
}

/**
 * Rule 10d: one faded, non-interactive row after the projected path, standing in for the Stages an unmade choice may
 * still add. Its line is DASHED and its numeral is an ellipsis in the numeral's column (rule 9f dropped the circles), so
 * it can never be mistaken for a real step; collapsed, only the centred ellipsis shows and the caption stays for
 * assistive tech.
 */
export function GhostStep({ range, open }: { readonly range: StepRange; readonly open: boolean }) {
  const caption = ghostCaption(range);
  return (
    <li
      data-slot="runner-step-ghost"
      className={`flex items-baseline gap-3 border-l-2 border-dashed border-border py-4 text-sm text-muted-foreground ${
        open ? 'px-3' : 'justify-center px-0'
      }`}
    >
      <span aria-hidden="true" className={STEP_NUMBER}>
        …
      </span>
      <span className={open ? 'min-w-0 flex-1 truncate' : 'sr-only'}>{caption}</span>
    </li>
  );
}
