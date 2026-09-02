import { and, optionIs, rankWith, uiTypeIs } from '@jsonforms/core';
import type { LayoutProps, RankedTester } from '@jsonforms/core';
import { JsonFormsDispatch, useJsonForms, withJsonFormsLayoutProps } from '@jsonforms/react';
import { Button } from '@repo/ui/button';
import { PageHeader } from '@repo/ui/page-header';
import { useEffect, useRef, useState } from 'react';
import { FlowNav, FlowStepIndicator } from './flow-nav';
import { useFlowActions, type FlowActions } from './flow-actions-context';
import { useFlowStep } from './flow-step-context';
import {
  categoriesOf,
  clampStepIndex,
  flowNavTitle,
  resolveStepIndex,
  stepOwnsError,
  stepStatuses,
  FLOW_VARIANT,
  type FlowStep,
} from './model';

/**
 * The Categorization "flow" layout (feature 176) — a second presentation of the same uischema type,
 * opted into with `options.variant: 'flow'`.
 *
 * A left step rail beside a single-category content pane, with a pinned Back / Save & next /
 * Save & exit bar. Rank 2 beats the tabs renderer's rank 1, so **an absent or unrecognised variant
 * still falls through to tabs** — which is every Categorization authored to date.
 *
 * Registered in `renderers.tsx` only. The read-only display set keeps rendering categories as tabs:
 * a save bar and validation colours say nothing about data that cannot be edited.
 */
export const categorizationFlowTester: RankedTester = rankWith(
  2,
  and(uiTypeIs('Categorization'), optionIs('variant', FLOW_VARIANT)),
);

/** The pinned action bar. Split out so the renderer body stays readable. */
function FlowActionBar({
  actions,
  canGoBack,
  isLast,
  blocked,
  onBack,
  onNext,
  onSave,
  busy,
}: {
  actions: FlowActions | null;
  canGoBack: boolean;
  isLast: boolean;
  blocked: boolean;
  onBack: () => void;
  onNext: () => void;
  onSave: () => void;
  busy: boolean;
}) {
  return (
    // A real flex footer now, not a sticky overlay: the pane above owns the scrolling, so the bar
    // simply sits at the bottom of the column. Full-bleed with inner padding, so its top border runs
    // the full pane width like the banner header's divider does.
    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-background px-6 py-3">
      <Button type="button" variant="outline" disabled={!canGoBack} onClick={onBack}>
        Back
      </Button>
      {actions === null ? (
        // No host to save through — navigation only. The last step simply has nothing forward to
        // offer, so it renders no affordance rather than a button that would do nothing.
        isLast ? null : (
          <Button type="button" onClick={onNext}>
            Next
          </Button>
        )
      ) : (
        <Button type="button" disabled={blocked || busy} onClick={onSave}>
          {isLast ? 'Save & exit' : 'Save & next'}
        </Button>
      )}
    </div>
  );
}

function CategorizationFlowLayoutComponent({
  uischema,
  schema,
  path,
  enabled,
  visible,
}: LayoutProps) {
  // Every hook runs before any early return, so hook order is stable across a `visible` flip or a
  // definition that loses its categories (the same rule group-layout and section-layout follow).
  const ctx = useJsonForms();
  const actions = useFlowActions();
  const control = useFlowStep();
  const [current, setCurrent] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [busy, setBusy] = useState(false);

  const steps = categoriesOf(uischema);
  const total = steps.length;
  // Two sources, one shape. With a host mounted (feature 177) the step comes from OUTSIDE — the URL,
  // via `FlowStepProvider` — and this component never moves itself; without one it keeps its own
  // state, which is every other host (the builder preview, the citizen application, unit tests).
  // Clamped either way: a definition can shrink between renders, and the rail can jump.
  const index = clampStepIndex(
    control === null ? current : resolveStepIndex(steps, control.stepId),
    total,
  );
  const step: FlowStep | undefined = steps[index];

  const errors = ctx.core?.errors ?? [];
  // Gating is PER-STEP, not per-document: a required field on step 4 must never block saving
  // step 1. This is the save-button counterpart of feature 175's `scopedSchema`.
  const blocked = step === undefined ? false : stepOwnsError(step, errors);

  // Report the gate outward, so a host-rendered Save (the unsaved-changes dialog) can honour the
  // same rule as the bar below. Guarded by the last reported value, so an inline provider `value`
  // — a new object identity every render — still calls the host only when the flag actually flips.
  const report = control?.onBlockedChange;
  const reported = useRef<boolean | null>(null);
  useEffect(() => {
    if (report === undefined || reported.current === blocked) {
      return;
    }
    reported.current = blocked;
    report(blocked);
  }, [report, blocked]);

  if (visible === false) {
    return null;
  }
  if (step === undefined) {
    return <p className="text-sm text-muted-foreground">This section has no steps to show.</p>;
  }

  const data = (ctx.core?.data ?? {}) as Record<string, unknown>;
  const statuses = stepStatuses(steps, index, errors);
  const isLast = index >= total - 1;

  const goTo = (next: number) => {
    const clamped = clampStepIndex(next, total);
    const target = steps[clamped];
    if (control === null || target === undefined) {
      setCurrent(clamped);
      return;
    }
    // Request, don't move: the host navigates and hands the new step back through `stepId`.
    control.onStepChange(target.id);
  };

  const save = async () => {
    if (actions === null || blocked || busy) {
      return;
    }
    setBusy(true);
    try {
      // Awaited before navigating, so a rejected save can never silently skip a step — the user
      // stays put and the host surfaces the error.
      await actions.onSave(data);
      if (isLast) {
        actions.onExit();
      } else {
        goTo(index + 1);
      }
    } catch {
      // Swallowed deliberately: the host owns error presentation (it raised the rejection and holds
      // the mutation state). Rethrowing here would surface an unhandled rejection from a click.
    } finally {
      setBusy(false);
    }
  };

  // `h-full min-h-0` so a host that hands this a definite height (the section edit page, via
  // FormRunner's `fill`) gets a rail that stays put and a content pane that scrolls on its own.
  // With an auto-height host the percentage resolves to auto and it degrades to normal flow.
  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <FlowNav
        title={flowNavTitle(uischema)}
        steps={steps}
        statuses={statuses}
        onJump={goTo}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
      />

      {/* The column itself is UNPADDED — each child owns its horizontal padding instead. Putting
          `px-6` on the column would inset the scroll container too, so its scrollbar would float 24px
          off the pane's edge rather than riding it. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <FlowStepIndicator steps={steps} current={index} />
        {/* The wrapper's `px-6` exists solely for the banner header's `-mx-6` to cancel, so the gold
            divider spans the pane edge-to-edge while its title stays inset. */}
        <div className="shrink-0 px-6">
          <PageHeader
            title={step.label === '' ? `Step ${index + 1}` : step.label}
            variant="banner"
            {...(step.description === '' ? {} : { description: step.description })}
            fluid
          />
        </div>

        {/* The CONTENT scrolls, not the page: the rail and the action bar stay fixed either side.
            Full-bleed with INNER padding, so the scrollbar sits on the pane edge and the fields
            still line up with the header above and the bar below. */}
        <div className="relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          {step.elements.map((child, childIndex) => (
            <JsonFormsDispatch
              key={childIndex}
              uischema={child as never}
              schema={schema}
              path={path}
              enabled={enabled}
            />
          ))}
        </div>

        <FlowActionBar
          actions={actions}
          canGoBack={index > 0}
          isLast={isLast}
          blocked={blocked}
          busy={busy || actions?.saving === true}
          onBack={() => goTo(index - 1)}
          onNext={() => goTo(index + 1)}
          onSave={() => void save()}
        />
      </div>
    </div>
  );
}

export const CategorizationFlowLayoutRenderer = withJsonFormsLayoutProps(
  CategorizationFlowLayoutComponent,
);
