import { mdiAlertCircle } from '@mdi/js';
import { Icon } from '@mdi/react';

// Small pieces shared by the step rail's stage rows and page items (doc 202 rules 24b, 27d), in their own module so
// neither row file has to import the other.

/** Rule 24b: why a forward page or stage is closed — it names what to do rather than just "unavailable". */
export const BLOCKED_HINT = 'complete the current page first';

/** Rule 27d: the spoken half of an error flag, so it is never conveyed by the red icon alone. */
export const HAS_ERRORS_HINT = 'has errors';

/** Rule 27d: the visible half — a destructive alert icon beside the flagged name. */
export function ErrorFlag() {
  return (
    <>
      <Icon
        path={mdiAlertCircle}
        size="16px"
        aria-hidden="true"
        data-slot="runner-error-flag"
        className="shrink-0 text-destructive"
      />
      <span className="sr-only">{HAS_ERRORS_HINT}</span>
    </>
  );
}

// The chrome every row of the rail wears (doc 202 rules 9c-9g). Shared, so a Stage row and the review row
// (rule 48b) cannot drift into looking like different KINDS of thing — to a citizen they are both steps.

/**
 * Rule 9c: the rule running down the left of the list is the rows' own left borders, stacked with NO gap between
 * them — which is why the list sets no `gap`. A gap would break the line into dashes.
 *
 * Rule 11b: a Stage the citizen has REACHED — visited, current included — draws a 4px primary border, so the line
 * thickens down the rail as they progress; a Stage still ahead keeps the 2px grey line. Width and colour live in one
 * literal per state: Tailwind only generates class strings it can see whole, and the base row class sets neither, or
 * two utilities for one property would resolve by CSS source order rather than by append order.
 *
 * The colour is the LEFT side's alone (`border-l-*`): `Button` gives every side a 1px transparent border, so an
 * all-sides `border-primary` drew a box around the row rather than a line down its left.
 */
export const STAGE_BORDER: Record<'reached' | 'ahead', string> = {
  reached: 'border-l-4 border-l-primary',
  ahead: 'border-l-2 border-l-border',
};

/**
 * Rule 9d: the step caption sits above the name, so each row is two lines. `border-y-0 border-r-0`: `Button`'s 1px
 * transparent top and bottom borders mitre into the thick left border's corners, notching the rail's line at every
 * row boundary (seen in the browser; rule 9c's line must be continuous).
 */
export const STAGE_ROW =
  'relative h-auto w-full rounded-none border-y-0 border-r-0 py-4 text-left font-normal disabled:opacity-100';

/**
 * Rule 9f: open, the row is a two-column grid — the numeral in the first column on the SECOND row, so it shares a
 * baseline with the stage name rather than centring across the caption and name. `Button` is `inline-flex`; its
 * `cn` merge lets `grid` replace that display outright.
 */
export const OPEN_LAYOUT =
  'grid grid-cols-[1.25rem_minmax(0,1fr)] items-baseline gap-x-3 gap-y-0 px-3';
/** Rule 9f: collapsed, the numeral alone, centred in the narrow rail. */
export const COLLAPSED_LAYOUT = 'justify-center px-0';

/** Rule 9g: the numeral, "Step n" and the stage name are bcgov-blue once reached (visited or current), grey while ahead. */
export const STAGE_TEXT: Record<'reached' | 'ahead', string> = {
  reached: 'text-bcgov-blue',
  // Rule 9g: the SAME grey as the upcoming stage's left border (`border-l-border`), so line and text read as one.
  ahead: 'text-border',
};

/** Rule 9f: no circle — a bold bcgov-blue numeral, as wide as the grid's first column so digits line up. */
export const STEP_NUMBER = 'w-5 text-center text-base font-bold tabular-nums';
