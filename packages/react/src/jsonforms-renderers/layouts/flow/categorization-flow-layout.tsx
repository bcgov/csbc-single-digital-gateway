import { and, optionIs, rankWith, uiTypeIs } from '@jsonforms/core';
import type { LayoutProps, RankedTester } from '@jsonforms/core';
import { JsonFormsDispatch, useJsonForms, withJsonFormsLayoutProps } from '@jsonforms/react';
import { Button } from '@repo/ui/button';
import { PageHeader } from '@repo/ui/page-header';
import { useState } from 'react';
import { FlowNav, FlowStepIndicator } from './flow-nav';
import { useFlowActions, type FlowActions } from './flow-actions-context';
import {
  categoriesOf,
  clampStepIndex,
  flowNavTitle,
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
    <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border bg-background py-3">
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
  const [current, setCurrent] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [busy, setBusy] = useState(false);

  const steps = categoriesOf(uischema);
  const total = steps.length;
  // Clamped rather than trusted: a definition can shrink between renders, and the rail can jump.
  const index = clampStepIndex(current, total);
  const step: FlowStep | undefined = steps[index];

  if (visible === false) {
    return null;
  }
  if (step === undefined) {
    return <p className="text-sm text-muted-foreground">This section has no steps to show.</p>;
  }

  const errors = ctx.core?.errors ?? [];
  const data = (ctx.core?.data ?? {}) as Record<string, unknown>;
  const statuses = stepStatuses(steps, index, errors);
  const isLast = index >= total - 1;
  // Gating is PER-STEP, not per-document: a required field on step 4 must never block saving
  // step 1. This is the save-button counterpart of feature 175's `scopedSchema`.
  const blocked = stepOwnsError(step, errors);

  const goTo = (next: number) => setCurrent(clampStepIndex(next, total));

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

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      <FlowNav
        title={flowNavTitle(uischema)}
        steps={steps}
        statuses={statuses}
        onJump={goTo}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <FlowStepIndicator steps={steps} current={index} />
        <PageHeader
          title={step.label === '' ? `Step ${index + 1}` : step.label}
          variant="banner"
          {...(step.description === '' ? {} : { description: step.description })}
          fluid
        />

        <div className="flex flex-col gap-4">
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
