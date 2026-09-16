import type { UISchemaElement } from '@jsonforms/core';
import { Button } from '@repo/ui/button';
import { labelOf } from '../renderers/gridstack/element-label';
import { drawnNodes } from '../renderers/xyflow/flow-elements';
import { firstPositionIn, stageFormsOf, type RunnerPosition } from './runner-position';

// The runner's stage sidebar (doc 202 rules 9-13, 25). Presentational: it takes the Flow, the position and the
// visited set, and owns NO state — the runner owns both (the Data Model table), so this file has no hooks at all.
//
// Deliberately NOT `@repo/ui`'s shadcn `Sidebar` (doc 202's Component Design note): `SidebarProvider` writes a
// `document.cookie`, registers a global Cmd/Ctrl+B listener and swaps to a `Sheet` on mobile — none of which belongs
// in a component embedded in both a citizen portal page and the studio's preview pane. Plain markup and `Button`.

/** Rule 13 / rule 25: why a listed stage may not be opened, or `null` when it may. */
type StageLock = 'placeholder' | 'unvisited' | null;

/** A Stage as the sidebar draws it — everything derived once, so the nav and the compact line agree. */
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
 * Rules 10, 10b and 12: the Stages the sidebar lists — in `elements` order (`Stage.options.position` is inert since
 * doc 198 and is never read for ordering), Conditions excluded (they are traversed, never visited), and **a Stage
 * holding no Forms omitted entirely**.
 *
 * That last omission is rule 10b, and it is the half that must agree with the traversal: `nextStageId` walks straight
 * past a Form-less Stage because there is nothing to land on, so listing it would show a step that can never become
 * current. Listing it while refusing to navigate to it is exactly the inconsistency the rule exists to prevent.
 *
 * Exported so the compact below-`sm` line counts the same steps the nav draws, and so a test can assert the list
 * without mounting anything.
 */
export function sidebarStages(flow: UISchemaElement): SidebarStage[] {
  return drawnNodes(flow).flatMap(({ element, id, authored, kind }) =>
    kind === 'stage' && stageFormsOf(element).length > 0
      ? [{ element, id, authored, label: labelOf(element, 'Stage') }]
      : [],
  );
}

/** Why a stage cannot be opened, or `null`. Rule 13 outranks rule 25: a placeholder is never navigable at all. */
const lockOf = (stage: SidebarStage, visited: ReadonlySet<string>): StageLock => {
  if (!stage.authored) return 'placeholder';
  return visited.has(stage.id) ? null : 'unvisited';
};

/**
 * A visually-hidden reason per lock, so the list NEVER communicates state by colour (or by a greyed button) alone.
 * The current stage needs none — it already carries `aria-current="step"`.
 */
const LOCK_HINT: Record<'placeholder' | 'unvisited', string> = {
  placeholder: 'not available',
  unvisited: 'not yet reached',
};

/**
 * Status → left-border colour, as a literal class per state.
 *
 * Two reasons it is a lookup rather than an interpolation: Tailwind only generates class strings it can see whole in
 * the source, and — as `@repo/react`'s `FlowNav` documents — the base row class must not set a border colour of its
 * own, or two utilities for one property would resolve by CSS source order rather than by append order.
 */
const STAGE_BORDER: Record<'current' | 'open' | 'locked', string> = {
  current: 'border-primary',
  open: 'border-border',
  locked: 'border-transparent',
};

const STAGE_ROW =
  'h-auto w-full justify-start gap-3 rounded-none border-l-4 px-3 py-2 text-left font-normal';

export interface RunnerSidebarProps {
  /** The `Flow` root. Every row is derived from it — the sidebar keeps no copy of the graph. */
  readonly flow: UISchemaElement;
  /** Where the runner is, or `null` before a position resolves. */
  readonly position: RunnerPosition | null;
  /** Rule 25: the stages reached so far. A stage outside this set renders disabled. */
  readonly visited: ReadonlySet<string>;
  /** Rule 25: opening a visited stage. The runner validates and records the visit; this only asks. */
  onGoTo(position: RunnerPosition): void;
}

/**
 * Rule 9: the stage rail beside the content pane, `hidden sm:flex` — a full-width column is most of a phone's screen,
 * so below `sm` it is replaced by `<RunnerStageIndicator>`, the posture `FlowNav` already takes. The two are separate
 * components (rather than one that reflows) because they sit in different places in the runner's layout.
 *
 * The rail does not scroll with the content: the pane beside it owns that, and only an over-long list scrolls here.
 */
export function RunnerSidebar({ flow, position, visited, onGoTo }: RunnerSidebarProps) {
  const stages = sidebarStages(flow);

  return (
    <nav
      data-slot="runner-sidebar"
      aria-label="Form stages"
      className="hidden w-60 shrink-0 flex-col border-r border-border sm:flex"
    >
      {/* `relative`: the rows carry absolutely-positioned `sr-only` text, which would otherwise escape this
          scroller and add layout overflow to a distant ancestor. */}
      <ol className="relative flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto py-2">
        {stages.map((stage, index) => (
          <StageRow
            key={stage.id}
            stage={stage}
            index={index}
            current={position !== null && position.stageId === stage.id}
            lock={lockOf(stage, visited)}
            {...(position !== null ? { position } : {})}
            onOpen={() => {
              // ONE definition of "opening a stage" (`firstPositionIn`), shared with the start and with each
              // advance, so the sidebar can never land somewhere Next would not. `undefined` is unreachable for a
              // listed stage — it is authored and holds a Form — but the guard keeps that an assumption, not a throw.
              const opened = firstPositionIn(flow, stage.id);
              if (opened !== undefined) onGoTo(opened);
            }}
          />
        ))}
      </ol>
    </nav>
  );
}

interface StageRowProps {
  readonly stage: SidebarStage;
  readonly index: number;
  readonly current: boolean;
  readonly lock: StageLock;
  /** Only passed when there IS one — needed solely to mark the current Form (rule 11). */
  readonly position?: RunnerPosition;
  onOpen(): void;
}

/**
 * One stage: a status border, the step numeral, the name — and, when it is the current stage, its Forms (rule 11).
 *
 * A locked stage renders a genuinely `disabled` button, not a styled-down one: rule 25 refuses the skip ahead because
 * a branch is decided by upstream answers, and a stage never reached may be one those answers would never select.
 * Rule 13's placeholder is locked the same way — no edge can address it, so it is unreachable by definition.
 */
function StageRow({ stage, index, current, lock, position, onOpen }: StageRowProps) {
  const locked = lock !== null;
  const border = current ? STAGE_BORDER.current : locked ? STAGE_BORDER.locked : STAGE_BORDER.open;

  return (
    <li
      data-slot="runner-stage"
      data-stage-id={stage.id}
      {...(current ? { 'data-current': '' } : {})}
    >
      <Button
        type="button"
        variant="ghost"
        disabled={locked}
        // `disabled` already conveys it to assistive tech; `aria-disabled` makes the state explicit for tests and
        // for any consumer inspecting the row without reading the DOM property.
        {...(locked ? { 'aria-disabled': true } : {})}
        {...(current ? { 'aria-current': 'step' as const } : {})}
        onClick={onOpen}
        className={`${STAGE_ROW} ${border} ${current ? 'bg-accent font-semibold' : ''}`}
      >
        <span className="flex size-6 shrink-0 items-center justify-center text-sm tabular-nums">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 truncate">{stage.label}</span>
        {locked ? <span className="sr-only">{LOCK_HINT[lock]}</span> : null}
      </Button>

      {/* Rule 11: only the CURRENT stage expands. Every other stage shows its name alone, so the rail stays a list
          of stages rather than of every Form in the document. */}
      {current && position !== undefined ? <StageForms stage={stage} position={position} /> : null}
    </li>
  );
}

/**
 * Rule 11: the current stage's Forms by title (`labelOf(form, 'Form')`), the one on screen marked `aria-current="page"`.
 *
 * The rows are NOT controls, deliberately. Rule 24 blocks Next on the current Form's own errors, so a clickable row
 * would be a way around the gate in the one direction the gate exists for; and rule 25's affordance is stage-level.
 * Moving within a stage is Back / Next, which validate (rule 24) and record history (rule 26).
 */
function StageForms({ stage, position }: { stage: SidebarStage; position: RunnerPosition }) {
  const forms = stageFormsOf(stage.element);

  return (
    <ol className="flex flex-col gap-0.5 py-1 pl-10">
      {forms.map((form) => {
        const currentForm = form.id === position.formId;
        return (
          <li
            key={form.id}
            data-slot="runner-stage-form"
            {...(currentForm ? { 'data-current': '', 'aria-current': 'page' as const } : {})}
            className={`truncate text-sm ${
              currentForm ? 'font-medium text-foreground' : 'text-muted-foreground'
            }`}
          >
            {labelOf(form.element, 'Form')}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Rule 9's below-`sm` replacement for the rail: a compact "Stage n of m — <name>" line.
 *
 * It counts the SAME stages the rail lists (`sidebarStages`), so rule 10b's omission cannot make "Stage 2 of 4" and a
 * three-row list disagree. Presentational only: at this width navigation happens through the action bar's Back / Next.
 */
export function RunnerStageIndicator({
  flow,
  position,
}: {
  readonly flow: UISchemaElement;
  readonly position: RunnerPosition | null;
}) {
  const stages = sidebarStages(flow);
  const index = position === null ? -1 : stages.findIndex((stage) => stage.id === position.stageId);
  const stage = index < 0 ? undefined : stages[index];
  // Before a position resolves — or on a stage the list omits — there is no honest "n of m" to show.
  if (stage === undefined) return null;

  return (
    <p
      data-slot="runner-stage-indicator"
      className="px-6 py-2 text-xs text-muted-foreground sm:hidden"
    >
      Stage {index + 1} of {stages.length} — {stage.label}
    </p>
  );
}
