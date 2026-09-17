import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { mdiDockRight } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { useState } from 'react';
import { labelOf } from '../renderers/gridstack/element-label';
import { drawnNodes } from '../renderers/xyflow/flow-elements';
import {
  firstPositionIn,
  projectedStageIds,
  stageFormsOf,
  type RunnerFlow,
  type RunnerPosition,
} from './runner-position';

// The runner's step rail (doc 202 rules 9-13, 25, and rules 10c / 9b-9e). It derives every row from the Flow plus the
// answers and owns exactly ONE piece of state — whether it is expanded — which is presentation, not navigation.
//
// Deliberately NOT `@repo/ui`'s shadcn `Sidebar` (doc 202's Component Design note): `SidebarProvider` writes a
// `document.cookie`, registers a global Cmd/Ctrl+B listener and swaps to a `Sheet` on mobile — none of which belongs
// in a component embedded in both a citizen portal page and the studio's preview pane. Plain markup and `Button`.

/** Rule 13 / rule 25: why a listed stage may not be opened, or `null` when it may. */
type StageLock = 'placeholder' | 'unvisited' | null;

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
 * Rule 10c: the Stages the rail lists — the **projected path**, not the document's Stage order.
 *
 * `projectedStageIds` walks the graph from the start through the answers given so far and stops at the first
 * Condition it cannot yet decide, so the list holds only stages the citizen is actually required to enter. A branch
 * nobody has chosen contributes nothing: "Business" appears once "Applying as" selects it, and not before.
 *
 * This REPLACES the old `elements`-order listing, and with it rules 10 and 13's reach: a Stage that no edge leads to
 * is simply never projected, so the rail no longer draws unreachable or placeholder stages at all. Rule 10b's
 * Form-less Stages are skipped inside the walk, keeping the list and the traversal in agreement.
 *
 * `currentStageId` is a DEFENSIVE union, not part of the projection: the user can only be standing on a stage their
 * answers led them to, so it is normally already present. It is added if absent purely so the rail can never
 * contradict what is on screen — a list that omits the page you are looking at is the worse failure.
 */
export function sidebarStages(context: RunnerFlow, currentStageId?: string): SidebarStage[] {
  const ids = projectedStageIds(context);
  if (currentStageId !== undefined && !ids.includes(currentStageId)) ids.push(currentStageId);

  const byId = new Map(drawnNodes(context.flow).map((node) => [node.id, node] as const));
  return ids.flatMap((id) => {
    const node = byId.get(id);
    return node === undefined || node.kind !== 'stage'
      ? []
      : [
          {
            element: node.element,
            id,
            authored: node.authored,
            label: labelOf(node.element, 'Stage'),
          },
        ];
  });
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
 * Rule 9c: the rule running down the left of the list is the rows' own left borders, stacked with NO gap between
 * them — which is why the list sets no `gap` and every row is `border-l-2`. A gap would break the line into dashes.
 *
 * Only the current row is tinted. Two reasons it is a lookup rather than an interpolation: Tailwind only generates
 * class strings it can see whole in the source, and — as `@repo/react`'s `FlowNav` documents — the base row class
 * must not set a border colour of its own, or two utilities for one property would resolve by CSS source order
 * rather than by append order.
 */
const STAGE_BORDER: Record<'current' | 'rest', string> = {
  current: 'border-primary',
  rest: 'border-border',
};

/** Rule 9d: taller rows than the old rail — the step caption sits above the name, so each row is two lines. */
const STAGE_ROW =
  'h-auto w-full justify-start gap-3 rounded-none border-l-2 px-3 py-4 text-left font-normal';

const STEP_BADGE =
  'flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-sm tabular-nums';

export interface RunnerSidebarProps {
  /** The `Flow` root. Every row is derived from it — the rail keeps no copy of the graph. */
  readonly flow: UISchemaElement;
  /** Rule 10c: needed to resolve the fields a Condition names, so the projection can be computed. */
  readonly schema: JsonSchema;
  /** Rule 10c: the answers the projection is computed against. */
  readonly data: RunnerFlow['data'];
  /** Where the runner is, or `null` before a position resolves. */
  readonly position: RunnerPosition | null;
  /** Rule 25: the stages reached so far. A stage outside this set renders disabled. */
  readonly visited: ReadonlySet<string>;
  /** Rule 25: opening a visited stage. The runner validates and records the visit; this only asks. */
  onGoTo(position: RunnerPosition): void;
}

/**
 * Rule 9: the step rail beside the content pane, shown only once the fill PAGE is `sm` wide (doc 184 rule 17b's
 * `fill-page` container query, not the window) — a full-width column is most of a phone's screen, so below that it is replaced by `<RunnerStageIndicator>`, the posture `FlowNav` already takes. The two are separate
 * components (rather than one that reflows) because they sit in different places in the runner's layout.
 *
 * Rule 9b: the rail spans the runner's FULL height and the action bar sits only under the content, so `<FormRunner>`
 * renders this as a flex ROW sibling of the content column rather than inside it.
 */
export function RunnerSidebar({
  flow,
  schema,
  data,
  position,
  visited,
  onGoTo,
}: RunnerSidebarProps) {
  // Rule 9e: the ONLY state this component owns, and it is presentational. Navigation state stays the runner's.
  const [open, setOpen] = useState(true);
  const stages = sidebarStages({ flow, schema, data }, position?.stageId);

  return (
    <nav
      data-slot="runner-sidebar"
      aria-label="Steps"
      {...(open ? { 'data-open': '' } : {})}
      className={`hidden h-full shrink-0 flex-col border-r border-border @min-[40rem]/fill-page:flex ${
        open ? 'w-72' : 'w-16'
      }`}
    >
      <div
        data-slot="runner-sidebar-header"
        className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2"
      >
        {open ? <span className="min-w-0 flex-1 truncate font-semibold">Steps</span> : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          data-slot="runner-sidebar-toggle"
          aria-expanded={open}
          // Named by what the press DOES, so the control is unambiguous with the label hidden.
          aria-label={open ? 'Collapse steps' : 'Expand steps'}
          onClick={() => setOpen((was) => !was)}
        >
          <Icon path={mdiDockRight} size={0.8} />
        </Button>
      </div>

      {/* Rule 9c: `relative` because the rows carry absolutely-positioned `sr-only` text, which would otherwise
          escape this scroller and add layout overflow to a distant ancestor. No `gap`: see `STAGE_BORDER`. */}
      <ol
        data-slot="runner-step-list"
        className="relative m-3 flex min-h-0 flex-1 flex-col overflow-y-auto rounded-md border border-border p-2"
      >
        {stages.map((stage, index) => (
          <StageRow
            key={stage.id}
            stage={stage}
            index={index}
            open={open}
            current={position !== null && position.stageId === stage.id}
            lock={lockOf(stage, visited)}
            {...(position !== null ? { position } : {})}
            onOpen={() => {
              // ONE definition of "opening a stage" (`firstPositionIn`), shared with the start and with each
              // advance, so the rail can never land somewhere Next would not. `undefined` is unreachable for a
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
  /** Rule 9e: collapsed, a row is its number alone — no caption, no name, no Forms. */
  readonly open: boolean;
  readonly current: boolean;
  readonly lock: StageLock;
  /** Only passed when there IS one — needed solely to mark the current Form (rule 11). */
  readonly position?: RunnerPosition;
  onOpen(): void;
}

/**
 * One step: the status line, the step numeral, "Step n" above the stage name — and, when it is the current stage,
 * its Forms (rule 11).
 *
 * A locked stage renders a genuinely `disabled` button, not a styled-down one: rule 25 refuses the skip ahead because
 * a branch is decided by upstream answers, and a stage never reached may be one those answers would never select.
 */
function StageRow({ stage, index, open, current, lock, position, onOpen }: StageRowProps) {
  const locked = lock !== null;
  const border = current ? STAGE_BORDER.current : STAGE_BORDER.rest;

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
        // Collapsed, the name is not rendered, so the button needs an accessible name of its own.
        {...(open ? {} : { 'aria-label': `Step ${index + 1}: ${stage.label}` })}
        onClick={onOpen}
        className={`${STAGE_ROW} ${border} ${current ? 'bg-accent font-semibold' : ''}`}
      >
        <span className={STEP_BADGE}>{index + 1}</span>
        {open ? (
          <span className="flex min-w-0 flex-1 flex-col items-start">
            <span className="text-xs font-normal text-muted-foreground">Step {index + 1}</span>
            <span data-slot="runner-stage-name" className="w-full truncate">
              {stage.label}
            </span>
          </span>
        ) : null}
        {locked ? <span className="sr-only">{LOCK_HINT[lock]}</span> : null}
      </Button>

      {/* Rule 11: only the CURRENT stage expands, and only while the rail is open (rule 9e) — collapsed it is a
          column of numerals, so every label is withheld, not just some. */}
      {open && current && position !== undefined ? (
        <StageForms stage={stage} position={position} />
      ) : null}
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
    <ol className="flex flex-col gap-0.5 pb-2 pl-13">
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
 * It counts the SAME stages the rail lists (`sidebarStages`), so rule 10c's projection cannot make "Stage 2 of 4" and
 * a three-row list disagree. Presentational only: at this width navigation happens through the action bar's Back/Next.
 */
export function RunnerStageIndicator({
  flow,
  schema,
  data,
  position,
}: {
  readonly flow: UISchemaElement;
  readonly schema: JsonSchema;
  readonly data: RunnerFlow['data'];
  readonly position: RunnerPosition | null;
}) {
  const stages = sidebarStages({ flow, schema, data }, position?.stageId);
  const index = position === null ? -1 : stages.findIndex((stage) => stage.id === position.stageId);
  const stage = index < 0 ? undefined : stages[index];
  // Before a position resolves — or on a stage the list omits — there is no honest "n of m" to show.
  if (stage === undefined) return null;

  return (
    <p
      data-slot="runner-stage-indicator"
      className="px-6 py-2 text-xs text-muted-foreground @min-[40rem]/fill-page:hidden"
    >
      Stage {index + 1} of {stages.length} — {stage.label}
    </p>
  );
}
