import type { UISchemaElement } from '@jsonforms/core';
import { Button } from '@repo/ui/button';
import { formKey } from './path-errors';
import { stageFormsOf, type RunnerPosition } from './runner-position';
import { BLOCKED_HINT, ErrorFlag, HAS_ERRORS_HINT } from './runner-row-parts';
import { StageForms } from './runner-stage-forms';

// The step rail's rows (doc 202 rules 9c-9g, 11-11e, 25b, 27d): a Stage and its Forms (the ghost step is its own module). Presentational
// only — `RunnerSidebar` derives everything and passes it in.

/** Rule 13: why a listed stage may not be opened, or `null` when it may. */
export type StageLock = 'placeholder' | 'upcoming' | 'blocked' | null;

/** A Stage as the rail draws it — everything derived once, so the nav and the compact line agree. */
export interface SidebarStage {
  readonly element: UISchemaElement;
  /** The node id `drawnNodes` assigned (doc 195 rule 8). */
  readonly id: string;
  /** Rule 10: `labelOf(stage, 'Stage')` — doc 201 rule 1, the ONE way a name is read off an element. */
  readonly label: string;
  /** Rule 13: a placeholder id is listed but never navigable, since no edge can address it. */
  readonly authored: boolean;
}

/**
 * Why a stage cannot be opened, or `null`. Rule 25c: only a REACHED stage (visited or current) opens; an upcoming one
 * is listed but locked, so Next — which gates on the current Form's errors (rule 24) — is the only way forward. Rule
 * 13's placeholder, which no edge can address, is locked too, and outranks it.
 */
export const lockOf = (stage: SidebarStage, reached: boolean, blocked = false): StageLock => {
  if (!stage.authored) return 'placeholder';
  if (!reached) return 'upcoming';
  // Rule 24b: a reached stage AHEAD of an unfinished page waits until that page is complete.
  return blocked ? 'blocked' : null;
};

/**
 * A visually-hidden reason per lock, so the list NEVER communicates state by colour (or by a greyed button) alone.
 * The current stage needs none — it already carries `aria-current="step"`.
 */
const LOCK_HINT: Record<'placeholder' | 'upcoming' | 'blocked', string> = {
  placeholder: 'not available',
  upcoming: 'upcoming',
  blocked: BLOCKED_HINT,
};

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
const STAGE_BORDER: Record<'reached' | 'ahead', string> = {
  reached: 'border-l-4 border-l-primary',
  ahead: 'border-l-2 border-l-border',
};

/**
 * Rule 9d: the step caption sits above the name, so each row is two lines. `border-y-0 border-r-0`: `Button`'s 1px
 * transparent top and bottom borders mitre into the thick left border's corners, notching the rail's line at every
 * row boundary (seen in the browser; rule 9c's line must be continuous).
 */
const STAGE_ROW =
  'relative h-auto w-full rounded-none border-y-0 border-r-0 py-4 text-left font-normal disabled:opacity-100';

/**
 * Rule 9f: open, the row is a two-column grid — the numeral in the first column on the SECOND row, so it shares a
 * baseline with the stage name rather than centring across the caption and name. `Button` is `inline-flex`; its
 * `cn` merge lets `grid` replace that display outright.
 */
const OPEN_LAYOUT = 'grid grid-cols-[1.25rem_minmax(0,1fr)] items-baseline gap-x-3 gap-y-0 px-3';
/** Rule 9f: collapsed, the numeral alone, centred in the narrow rail. */
const COLLAPSED_LAYOUT = 'justify-center px-0';

/** Rule 9g: the numeral, "Step n" and the stage name are bcgov-blue once reached (visited or current), grey while ahead. */
const STAGE_TEXT: Record<'reached' | 'ahead', string> = {
  reached: 'text-bcgov-blue',
  // Rule 9g: the SAME grey as the upcoming stage's left border (`border-l-border`), so line and text read as one.
  ahead: 'text-border',
};

/** Rule 9f: no circle — a bold bcgov-blue numeral, as wide as the grid's first column so digits line up. */
export const STEP_NUMBER = 'w-5 text-center text-base font-bold tabular-nums';

interface StageRowProps {
  readonly stage: SidebarStage;
  readonly index: number;
  /** Rule 9e: collapsed, a row is its number alone — no caption, no name, no Forms. */
  readonly open: boolean;
  readonly current: boolean;
  /** Rule 11b: visited or current. */
  readonly reached: boolean;
  readonly lock: StageLock;
  /** Rule 27d: `formKey`s of the flagged Forms; the stage is flagged when any of its own is. */
  readonly errorForms: ReadonlySet<string>;
  /** Only passed when there IS one — needed solely to mark the current Form (rule 11). */
  readonly position?: RunnerPosition;
  onOpen(): void;
  /** Rule 11f: opening one of the current stage's Forms. */
  onGoToForm(position: RunnerPosition): void;
  /** Rule 24b: whether a page may be opened from where the citizen is. */
  canOpen(target: RunnerPosition): boolean;
}

/**
 * One step: the status line, the step numeral, "Step n" above the stage name — and, when it is the current stage,
 * its Forms (rule 11).
 *
 * Rule 11d: the current stage row is tinted with the same `bg-accent` as the Form on screen (amending rule 11b, which
 * left it untinted). `aria-current="step"` stays on the stage.
 *
 * Rule 25c: an upcoming stage is a genuinely `disabled` button (superseding rule 25b), greyed (rule 9g) and saying
 * "upcoming" to assistive tech, so its state is never conveyed by colour alone. `disabled:opacity-100` stops
 * `Button` fading it further: the border grey is already the whole signal.
 */
export function StageRow({
  stage,
  index,
  open,
  current,
  reached,
  lock,
  errorForms,
  position,
  onOpen,
  onGoToForm,
  canOpen,
}: StageRowProps) {
  const locked = lock !== null;
  const hasError = stageFormsOf(stage.element).some((form) =>
    errorForms.has(formKey({ stageId: stage.id, formId: form.id })),
  );

  return (
    <li
      data-slot="runner-stage"
      data-stage-id={stage.id}
      {...(current ? { 'data-current': '' } : {})}
      {...(reached ? { 'data-reached': '' } : {})}
    >
      <Button
        type="button"
        variant="ghost"
        disabled={locked}
        // `disabled` already conveys it to assistive tech; `aria-disabled` makes the state explicit for tests and
        // for any consumer inspecting the row without reading the DOM property.
        {...(locked ? { 'aria-disabled': true } : {})}
        {...(current ? { 'aria-current': 'step' as const } : {})}
        // Collapsed, the name is not rendered, so the button needs an accessible name of its own.
        {...(open
          ? {}
          : {
              'aria-label': `Step ${index + 1}: ${stage.label}${hasError ? `, ${HAS_ERRORS_HINT}` : ''}`,
            })}
        onClick={onOpen}
        // Rule 11d: the CURRENT stage takes the same `bg-accent` as the Form on screen (hover included, so the ghost
        // variant's hover colour cannot replace it while the pointer is over the active row).
        className={`${STAGE_ROW} ${open ? OPEN_LAYOUT : COLLAPSED_LAYOUT} ${
          reached ? STAGE_BORDER.reached : STAGE_BORDER.ahead
        }${current ? ' bg-accent hover:bg-accent' : ''}`}
      >
        {open ? (
          <span
            data-slot="runner-step-caption"
            className={`col-start-2 text-xs font-normal ${reached ? STAGE_TEXT.reached : STAGE_TEXT.ahead}`}
          >
            Step {index + 1}
          </span>
        ) : null}
        <span
          data-slot="runner-step-number"
          // Rule 9g: the numeral follows progress like the caption and name — blue once reached, grey while ahead.
          className={`${STEP_NUMBER} col-start-1 row-start-2 ${
            reached ? STAGE_TEXT.reached : STAGE_TEXT.ahead
          }`}
        >
          {index + 1}
        </span>
        {open ? (
          <span className="col-start-2 row-start-2 flex min-w-0 items-center gap-1.5">
            <span
              data-slot="runner-stage-name"
              className={`truncate font-bold ${reached ? STAGE_TEXT.reached : STAGE_TEXT.ahead}`}
            >
              {stage.label}
            </span>
            {hasError ? <ErrorFlag /> : null}
          </span>
        ) : null}
        {/* Rule 27d: collapsed there is no name to sit beside, so a dot marks the numeral (the label says why). */}
        {!open && hasError ? (
          <span
            aria-hidden="true"
            data-slot="runner-error-dot"
            className="absolute top-3 right-3 size-2 rounded-full bg-destructive"
          />
        ) : null}
        {locked ? <span className="sr-only">{LOCK_HINT[lock]}</span> : null}
      </Button>

      {/* Rule 11: only the CURRENT stage expands, and only while the rail is open (rule 9e) — collapsed it is a
          column of numerals, so every label is withheld, not just some. */}
      {open && current && position !== undefined ? (
        <StageForms
          stage={stage}
          position={position}
          errorForms={errorForms}
          onGoTo={onGoToForm}
          canOpen={canOpen}
        />
      ) : null}
    </li>
  );
}
