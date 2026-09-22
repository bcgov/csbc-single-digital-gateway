import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { mdiDockRight } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { useState } from 'react';
import { labelOf } from '../renderers/gridstack/element-label';
import { drawnNodes } from '../renderers/xyflow/flow-elements';
import { listedStageIds, upcomingStepRange } from './runner-projection';
import {
  firstPositionIn,
  stageFormsOf,
  type RunnerFlow,
  type RunnerPosition,
} from './runner-position';
import { showsReview } from '../renderers/xyflow/flow-elements';
import { REVIEW_STEP_LABEL, ReviewRow } from './runner-review-row';
import { GhostStep } from './runner-ghost-step';
import { lockOf, StageRow, type SidebarStage } from './runner-step-rows';

export type { SidebarStage } from './runner-step-rows';

const NO_ERRORS: ReadonlySet<string> = new Set<string>();
const ALWAYS = () => true;

// The runner's step rail (doc 202 rules 9-13, 25, and rules 10c / 9b-9e). It derives every row from the Flow plus the
// answers and owns exactly ONE piece of state — whether it is expanded — which is presentation, not navigation.
//
// Deliberately NOT `@repo/ui`'s shadcn `Sidebar` (doc 202's Component Design note): `SidebarProvider` writes a
// `document.cookie`, registers a global Cmd/Ctrl+B listener and swaps to a `Sheet` on mobile — none of which belongs
// in a component embedded in both a citizen portal page and the studio's preview pane. Plain markup and `Button`.

/**
 * Rule 10c: the Stages the rail lists — the **projected path**, not the document's Stage order.
 *
 * `projectPath` walks the graph from the start through the answers given so far and stops at the first
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
export function sidebarStages(
  context: RunnerFlow,
  currentStageId?: string,
  visited?: ReadonlySet<string>,
): SidebarStage[] {
  // Rule 10e: `visited` lets the walk follow a route the citizen has already taken without answering.
  const ids = listedStageIds(context, currentStageId, visited);

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

export interface RunnerSidebarProps {
  /** The `Flow` root. Every row is derived from it — the rail keeps no copy of the graph. */
  readonly flow: UISchemaElement;
  /** Rule 10c: needed to resolve the fields a Condition names, so the projection can be computed. */
  readonly schema: JsonSchema;
  /** Rule 10c: the answers the projection is computed against. */
  readonly data: RunnerFlow['data'];
  /** Where the runner is, or `null` before a position resolves. */
  readonly position: RunnerPosition | null;
  /** Rule 25: the stages reached so far. */
  readonly visited: ReadonlySet<string>;
  /** Rule 27d: `formKey`s of the Forms to flag as having errors. Absent where nothing validates (no runner). */
  readonly errorForms?: ReadonlySet<string>;
  /** Rule 24b: whether the rail may open a page from where the citizen is. Absent where nothing validates. */
  readonly canOpen?: (target: RunnerPosition) => boolean;
  /** Rule 25: opening a visited stage. The runner validates and records the visit; this only asks. */
  onGoTo(position: RunnerPosition): void;
  /** Doc 202 rule 48b: whether the citizen is ON the review page, so its row reads as the current step. */
  readonly reviewing?: boolean;
  /** Rule 48b: opening the review from the rail. Absent where nothing can open it (no runner). */
  onOpenReview?: () => void;
  /**
   * Doc 211 rule 19b: whether the review counts as REACHED. False while a form is being filled in — the review
   * is a step still to come — and true in a submission view, where every step has already been taken.
   */
  readonly reviewReached?: boolean;
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
  errorForms = NO_ERRORS,
  canOpen = ALWAYS,
  onGoTo,
  reviewing = false,
  onOpenReview,
  reviewReached = false,
}: RunnerSidebarProps) {
  // Rule 9e: the ONLY state this component owns, and it is presentational. Navigation state stays the runner's.
  const [open, setOpen] = useState(true);
  const stages = sidebarStages({ flow, schema, data }, position?.stageId, visited);
  // Rule 10d: what an unmade choice may still add, or `undefined` when the path is fully decided.
  const upcoming = upcomingStepRange({ flow, schema, data }, visited);
  const openable = (target: RunnerPosition | undefined) => target === undefined || canOpen(target);
  // Rule 48b: the review is listed only when the Flow shows one, and only the runner can open it.
  const lastStage = stages.at(-1);
  const lastForm = lastStage === undefined ? undefined : stageFormsOf(lastStage.element).at(-1);
  // It sits after the last Form, so it opens exactly when that Form does — the same rule 24b gate, asked of the
  // page the citizen would have to pass through to reach it.
  const reviewLocked =
    !reviewing &&
    (lastStage === undefined ||
      lastForm === undefined ||
      !canOpen({ stageId: lastStage.id, formId: lastForm.id }));

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
          escape this scroller and add layout overflow to a distant ancestor. No `gap` (see `runner-step-rows`' `STAGE_BORDER`) and no padding: rule 9f puts the rows flush
          against the list's border. */}
      {/* Rule 9h: the box HUGS its rows (no `flex-1`), and `min-h-0` + `overflow-y-auto` let it shrink and scroll
          once the rows outgrow the rail. Collapsed, the 64px rail keeps a smaller margin. */}
      <ol
        data-slot="runner-step-list"
        className={`relative flex min-h-0 flex-col overflow-y-auto rounded-md border border-border ${
          open ? 'm-3' : 'm-1'
        }`}
      >
        {stages.map((stage, index) => (
          <StageRow
            key={stage.id}
            stage={stage}
            index={index}
            open={open}
            current={position !== null && position.stageId === stage.id}
            reached={visited.has(stage.id) || position?.stageId === stage.id}
            lock={lockOf(
              stage,
              visited.has(stage.id) || position?.stageId === stage.id,
              !openable(firstPositionIn(flow, stage.id)),
            )}
            errorForms={errorForms}
            {...(position !== null ? { position } : {})}
            onOpen={() => {
              // ONE definition of "opening a stage" (`firstPositionIn`), shared with the start and with each
              // advance, so the rail can never land somewhere Next would not. `undefined` is unreachable for a
              // listed stage — it is authored and holds a Form — but the guard keeps that an assumption, not a throw.
              const opened = firstPositionIn(flow, stage.id);
              if (opened !== undefined) onGoTo(opened);
            }}
            onGoToForm={onGoTo}
            canOpen={canOpen}
          />
        ))}
        {upcoming === undefined ? null : <GhostStep range={upcoming} open={open} />}
        {/* Rule 48b: last, AFTER the ghost — whatever an undecided branch may still add comes before the
            review, because the review is always the final step whatever the path turns out to be. */}
        {showsReview(flow) && onOpenReview !== undefined ? (
          <ReviewRow
            label={REVIEW_STEP_LABEL}
            index={stages.length}
            open={open}
            current={reviewing}
            locked={reviewLocked}
            reached={reviewReached}
            onOpen={onOpenReview}
          />
        ) : null}
      </ol>
    </nav>
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
  visited,
}: {
  readonly flow: UISchemaElement;
  readonly schema: JsonSchema;
  readonly data: RunnerFlow['data'];
  readonly position: RunnerPosition | null;
  /** Rule 10e: the same visited set the rail reads, so the two count the same stages. */
  readonly visited: ReadonlySet<string>;
}) {
  const stages = sidebarStages({ flow, schema, data }, position?.stageId, visited);
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
