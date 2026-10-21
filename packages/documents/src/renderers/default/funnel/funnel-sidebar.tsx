import { mdiDockRight } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { useState } from 'react';
import type { StepRange } from './funnel-projection';
import { GhostStep, StepRow, type StepLock, type StepTone } from './funnel-step-rows';

// The Funnel's step rail (doc 274 rules 23-28) — a port of `@repo/forms`' `RunnerSidebar`. Plain markup, not
// `@repo/ui`'s `Sidebar` (which writes a cookie and binds a global shortcut). Its ONE piece of state is presentational.

export const SUMMARY_LABEL = 'Summary';

/** A listed step, derived by the runner. */
export interface RailStep {
  readonly id: string;
  readonly label: string;
  readonly current: boolean;
  readonly tone: StepTone;
  readonly lock: StepLock;
  readonly hasError: boolean;
}

export interface FunnelSidebarProps {
  readonly steps: readonly RailStep[];
  readonly upcoming: StepRange | undefined;
  /** Rule 26: absent when the Funnel shows no summary page. */
  readonly summary?: {
    readonly current: boolean;
    readonly locked: boolean;
    readonly tone: StepTone;
  };
  onOpen(formId: string): void;
  onOpenSummary(): void;
}

/** Rule 28: shown once the Funnel's container is 40rem wide; below that `FunnelStepIndicator` replaces it. */
export function FunnelSidebar({
  steps,
  upcoming,
  summary,
  onOpen,
  onOpenSummary,
}: FunnelSidebarProps) {
  const [open, setOpen] = useState(true);
  return (
    <nav
      data-slot="funnel-sidebar"
      aria-label="Steps"
      className={`hidden h-full shrink-0 flex-col border-r border-border @min-[40rem]/funnel:flex ${
        open ? 'w-72' : 'w-16'
      }`}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        {open ? <span className="min-w-0 flex-1 truncate font-semibold">Steps</span> : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-expanded={open}
          aria-label={open ? 'Collapse steps' : 'Expand steps'}
          onClick={() => setOpen((was) => !was)}
        >
          <Icon path={mdiDockRight} size={0.8} />
        </Button>
      </div>
      {/* `relative` keeps the rows' sr-only text inside this scroller; no gap, so the left rules join into a line. */}
      <ol
        data-slot="funnel-step-list"
        className={`relative flex min-h-0 flex-col overflow-y-auto rounded-md border border-border ${
          open ? 'm-3' : 'm-1'
        }`}
      >
        {steps.map((step, index) => (
          <StepRow
            key={step.id}
            slot="funnel-step"
            label={step.label}
            index={index}
            open={open}
            current={step.current}
            tone={step.tone}
            lock={step.lock}
            hasError={step.hasError}
            onOpen={() => onOpen(step.id)}
          />
        ))}
        {upcoming === undefined ? null : <GhostStep range={upcoming} open={open} />}
        {summary === undefined ? null : (
          <StepRow
            slot="funnel-summary-step"
            label={SUMMARY_LABEL}
            index={steps.length}
            open={open}
            current={summary.current}
            tone={summary.tone}
            lock={summary.locked ? 'upcoming' : null}
            onOpen={onOpenSummary}
          />
        )}
      </ol>
    </nav>
  );
}

/** Rule 28: the narrow replacement for the rail — "Step n of m — <label>". */
export function FunnelStepIndicator({ steps }: { readonly steps: readonly RailStep[] }) {
  const index = steps.findIndex((step) => step.current);
  const step = steps[index];
  if (step === undefined) return null;
  return (
    <p
      data-slot="funnel-step-indicator"
      className="px-6 pt-4 text-xs text-muted-foreground @min-[40rem]/funnel:hidden"
    >
      Step {index + 1} of {steps.length} — {step.label}
    </p>
  );
}
