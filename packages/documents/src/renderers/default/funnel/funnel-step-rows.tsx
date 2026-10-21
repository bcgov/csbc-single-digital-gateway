import { mdiAlertCircle } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import type { StepRange } from './funnel-projection';

// The step rail's rows (doc 274 rules 23-26) — a port of `@repo/forms`' runner rows (doc 202 rules 9c-9g, 10d, 11b,
// 25c, 27d, 48b) with a Form as the whole step. Presentational only: `FunnelSidebar` derives everything.

/** Rule 22: why a forward step is closed. */
export const BLOCKED_HINT = 'complete the current page first';
const HAS_ERRORS_HINT = 'has errors';

/** Why a listed step may not be opened, or `null` when it may (rules 22, 24). */
export type StepLock = 'upcoming' | 'blocked' | null;

const LOCK_HINT: Record<'upcoming' | 'blocked', string> = {
  upcoming: 'upcoming',
  blocked: BLOCKED_HINT,
};

/**
 * Rule 23: the path up to and including the CURRENT step is BC Gov blue (the current one also tinted); a step visited
 * but PAST the current one (the citizen went Back) is a lighter blue (BC DS `blue-70`); a step not yet reached is grey.
 * The left rule is the left side's alone (Button borders every side): 4px once reached, 2px ahead.
 */
export type StepTone = 'current' | 'passed' | 'visited' | 'ahead';
const STEP_BORDER: Record<StepTone, string> = {
  current: 'border-l-4 border-l-primary',
  passed: 'border-l-4 border-l-primary',
  visited: 'border-l-4 border-l-blue-70',
  ahead: 'border-l-2 border-l-border',
};
const STEP_TEXT: Record<StepTone, string> = {
  current: 'text-bcgov-blue',
  passed: 'text-bcgov-blue',
  visited: 'text-blue-70',
  ahead: 'text-border',
};
const STEP_ROW =
  'relative h-auto w-full rounded-none border-y-0 border-r-0 py-4 text-left font-normal disabled:opacity-100';
const OPEN_LAYOUT = 'grid grid-cols-[1.25rem_minmax(0,1fr)] items-baseline gap-x-3 gap-y-0 px-3';
const COLLAPSED_LAYOUT = 'justify-center px-0';
const STEP_NUMBER = 'w-5 text-center text-base font-bold tabular-nums';

function ErrorFlag() {
  return (
    <>
      <Icon
        path={mdiAlertCircle}
        size="16px"
        aria-hidden="true"
        data-slot="funnel-error-flag"
        className="shrink-0 text-destructive"
      />
      <span className="sr-only">{HAS_ERRORS_HINT}</span>
    </>
  );
}

export interface StepRowProps {
  readonly slot: 'funnel-step' | 'funnel-summary-step';
  readonly label: string;
  readonly index: number;
  /** Rule 27: collapsed, a row is its numeral alone. */
  readonly open: boolean;
  readonly current: boolean;
  /** Rule 23's tone, decided by the runner from the step's place relative to the current one. */
  readonly tone: StepTone;
  readonly lock: StepLock;
  readonly hasError?: boolean;
  onOpen(): void;
}

/** One step: "Step n" over the name, the numeral beside it; current = accent tint + `aria-current="step"`. */
export function StepRow({
  slot,
  label,
  index,
  open,
  current,
  tone,
  lock,
  hasError = false,
  onOpen,
}: StepRowProps) {
  const name = `Step ${index + 1}: ${label}${hasError ? `, ${HAS_ERRORS_HINT}` : ''}`;
  return (
    <li data-slot={slot} {...(current ? { 'data-current': '' } : {})}>
      <Button
        type="button"
        variant="ghost"
        disabled={lock !== null}
        {...(lock !== null ? { 'aria-disabled': true } : {})}
        {...(current ? { 'aria-current': 'step' as const } : {})}
        {...(open ? {} : { 'aria-label': name })}
        onClick={onOpen}
        className={`${STEP_ROW} ${open ? OPEN_LAYOUT : COLLAPSED_LAYOUT} ${STEP_BORDER[tone]}${
          current ? ' bg-accent hover:bg-accent' : ''
        }`}
      >
        {open ? (
          <span className={`col-start-2 text-xs font-normal ${STEP_TEXT[tone]}`}>
            Step {index + 1}
          </span>
        ) : null}
        <span className={`${STEP_NUMBER} col-start-1 row-start-2 ${STEP_TEXT[tone]}`}>
          {index + 1}
        </span>
        {open ? (
          <span className="col-start-2 row-start-2 flex min-w-0 items-center gap-1.5">
            <span data-slot="funnel-step-name" className={`truncate font-bold ${STEP_TEXT[tone]}`}>
              {label}
            </span>
            {hasError ? <ErrorFlag /> : null}
          </span>
        ) : null}
        {!open && hasError ? (
          <span
            aria-hidden="true"
            className="absolute top-3 right-3 size-2 rounded-full bg-destructive"
          />
        ) : null}
        {lock !== null ? <span className="sr-only">{LOCK_HINT[lock]}</span> : null}
      </Button>
    </li>
  );
}

const steps = (count: number) => `${count} more ${count === 1 ? 'step' : 'steps'}`;

/** Rule 25: "2 more steps", "Up to 2 more steps", or "1–3 more steps". */
export function ghostCaption({ min, max }: StepRange): string {
  if (min === max) return steps(max);
  if (min === 0) return `Up to ${steps(max)}`;
  return `${min}–${steps(max)}`;
}

/** Rule 25: a faded, dashed, non-interactive row for what an undecided branch may still add. */
export function GhostStep({ range, open }: { readonly range: StepRange; readonly open: boolean }) {
  return (
    <li
      data-slot="funnel-step-ghost"
      className={`flex items-baseline gap-3 border-l-2 border-dashed border-border py-4 text-sm text-muted-foreground ${
        open ? 'px-3' : 'justify-center px-0'
      }`}
    >
      <span aria-hidden="true" className={STEP_NUMBER}>
        …
      </span>
      <span className={open ? 'min-w-0 flex-1 truncate' : 'sr-only'}>{ghostCaption(range)}</span>
    </li>
  );
}
