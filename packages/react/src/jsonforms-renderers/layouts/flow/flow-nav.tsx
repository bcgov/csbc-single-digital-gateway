import { Button } from '@repo/ui/button';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { FlowStep, FlowStepStatus } from './model';

/**
 * The Categorization "flow" layout's step rail (feature 176) — purely presentational: it takes the
 * derived steps, their statuses and the handlers, and owns no state of its own.
 *
 * Each item runs left to right: a thick status border, the step numeral, then a stacked
 * `Step <n>` / category label.
 */

/**
 * Status → left-border colour.
 *
 * **The base item class must not set a border colour of its own.** `@repo/react` has no
 * `tailwind-merge`, so classes are concatenated verbatim and two utilities for the same property
 * resolve by CSS source order rather than by which was appended last — a base `border-transparent`
 * would beat the active colour unpredictably. Setting the property per-state only is what keeps the
 * rail's colours deterministic (the same trap the console sidebar's `!border-bcgov-blue` documents).
 */
const STATUS_BORDER: Record<FlowStepStatus, string> = {
  current: 'border-bcgov-blue',
  upcoming: 'border-border',
  valid: 'border-success-border',
  invalid: 'border-danger-border',
};

/**
 * A visually-hidden word per resolved status, so the rail never communicates by colour alone.
 * `current` needs none — it already carries `aria-current="step"`.
 */
const STATUS_LABEL: Record<FlowStepStatus, string> = {
  current: '',
  upcoming: '',
  valid: 'complete',
  invalid: 'needs attention',
};

const NUMERAL =
  'flex size-7 shrink-0 items-center justify-center text-sm font-semibold tabular-nums';

export interface FlowNavProps {
  /** Header-bar title, sitting above the steps. */
  title: string;
  steps: readonly FlowStep[];
  /** Parallel to `steps` — carries which one is current, so the rail needs no index of its own. */
  statuses: readonly FlowStepStatus[];
  onJump: (index: number) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/** The label a step shows when it was authored without one — never a blank row. */
const stepLabel = (step: FlowStep, index: number): string =>
  step.label === '' ? `Step ${index + 1}` : step.label;

export function FlowNav({
  title,
  steps,
  statuses,
  onJump,
  collapsed,
  onToggleCollapsed,
}: FlowNavProps) {
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const toggleLabel = collapsed ? 'Expand step list' : 'Collapse step list';

  return (
    <nav
      aria-label="Form steps"
      // `border-r` separates the rail from the content pane; the enclosing flex `gap` then sits
      // BETWEEN that divider and the content, so the border reads as belonging to the rail.
      className={`hidden shrink-0 flex-col border-border lg:flex lg:border-r ${
        collapsed ? 'lg:w-16' : 'lg:w-60'
      }`}
      // The rail does NOT scroll with the content — the pane beside it owns the scrolling. Only a
      // step list too long for the height scrolls, and only within the list itself.
    >
      {/* Header bar: title on the left, the collapse control on its right. Collapsed, the title is
          dropped and the control centres so the bar keeps to the rail's narrow width.

          Styled to match the service console's own sidebar header (`ServiceSidebar`), which is the
          rail this one sits next to in the same product: a 58px row, `px-4`, a `text-sm font-semibold`
          truncating title, and a ghost icon-sm toggle. Two collapsible rails a click apart should not
          have two different header treatments. */}
      <div
        className={`flex h-[58px] shrink-0 items-center gap-2 ${
          collapsed ? 'justify-center px-0' : 'px-4'
        }`}
      >
        {collapsed ? null : (
          <h2 className="flex-1 truncate text-sm font-semibold" title={title}>
            {title}
          </h2>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          type="button"
          className="shrink-0"
          aria-label={toggleLabel}
          aria-pressed={collapsed}
          onClick={onToggleCollapsed}
        >
          <ToggleIcon className="size-4" aria-hidden />
        </Button>
      </div>

      {/* `relative`: the step buttons carry `sr-only` status text, which is absolutely positioned and
          would otherwise escape this scroller and add layout overflow to a distant ancestor. */}
      <ol className="relative flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {steps.map((step, index) => {
          const status = statuses[index] ?? 'upcoming';
          const label = stepLabel(step, index);
          const hint = STATUS_LABEL[status];
          return (
            <li key={index}>
              <button
                type="button"
                onClick={() => onJump(index)}
                aria-current={status === 'current' ? 'step' : undefined}
                // Collapsed items lose their visible text, so the accessible name has to come from
                // somewhere — `aria-label` carries it, `title` gives sighted users the tooltip.
                {...(collapsed ? { 'aria-label': label, title: label } : {})}
                className={`flex w-full items-center gap-3 border-l-4 py-2 text-left transition-colors hover:bg-accent ${
                  collapsed ? 'justify-center px-1' : 'px-3'
                } ${STATUS_BORDER[status]} ${status === 'current' ? 'bg-accent' : ''}`}
              >
                <span className={NUMERAL}>{index + 1}</span>
                {collapsed ? null : (
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      Step {index + 1}
                    </span>
                    <span
                      className={`truncate text-sm ${
                        status === 'current' ? 'font-semibold text-bcgov-blue' : 'text-foreground'
                      }`}
                    >
                      {label}
                    </span>
                  </span>
                )}
                {hint === '' ? null : <span className="sr-only">{hint}</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * The below-`lg` replacement for the rail: a compact "Step n of m" line plus the current label.
 *
 * The rail is `hidden lg:flex` because a 60-unit column is most of a phone's width — the same
 * responsive posture `StageLegend` takes in the form runner. Navigation at this size happens through
 * the save bar's Back / Next, so this indicator is presentational only.
 */
export function FlowStepIndicator({
  steps,
  current,
}: {
  steps: readonly FlowStep[];
  current: number;
}) {
  const step = steps[current];
  if (step === undefined) {
    return null;
  }
  return (
    <p className="text-xs text-muted-foreground lg:hidden">
      Step {current + 1} of {steps.length} — {stepLabel(step, current)}
    </p>
  );
}
