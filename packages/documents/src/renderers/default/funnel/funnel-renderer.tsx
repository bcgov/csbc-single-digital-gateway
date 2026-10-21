import { rankWith, uiTypeIs, type LayoutProps, type UISchemaElement } from '@jsonforms/core';
import { JsonFormsDispatch, useJsonForms, withJsonFormsLayoutProps } from '@jsonforms/react';
import type { FunnelData } from './clause-match';
import type { FunnelElement } from './funnel-graph';
import { FunnelSidebar, FunnelStepIndicator } from './funnel-sidebar';
import { FunnelSummary } from './funnel-summary';
import { RunnerActions } from './runner-actions';
import { useDocumentRunner, useHostActions, type HostActions } from './runner-port';
import { SubmissionPreview } from './submission-preview';
import { useFunnelRunner, type FunnelRunner } from './use-funnel-runner';

/** `{ type: 'Funnel' }`, at the base rank (doc 274). */
export const funnelTester = rankWith(1, uiTypeIs('Funnel'));

const NO_START = 'This funnel has no form to start at.';

/**
 * A Funnel filled one Form at a time (doc 274 rules 14-30) — `@repo/forms`' `FormRunner` view, ported: the step rail
 * beside a scrolling content column whose page is the current Form (or the summary page), the action bar under the
 * content alone. Answers and Ajv errors come from the JSONForms instance around it; the runner state is its own.
 */
export function FunnelRenderer({ uischema, schema, path, visible, renderers, cells }: LayoutProps) {
  const ctx = useJsonForms();
  // Rule 35: the same renderer under `DocumentRunner` (the host's handlers) or a bare `<JsonForms>` (none).
  const host = useHostActions(useDocumentRunner(), ctx.core?.data);
  const runner = useFunnelRunner(
    uischema as unknown as FunnelElement,
    (ctx.core?.schema ?? schema) as Record<string, unknown>,
    ctx.core?.data as FunnelData | undefined,
    ctx.core?.errors ?? [],
    host.finish,
    host.freeNavigation,
  );
  if (!visible) return null;
  if (runner.current === null)
    return (
      <p data-slot="funnel-empty" className="p-8 text-center text-sm text-muted-foreground">
        {NO_START}
      </p>
    );
  const dispatch = {
    schema,
    path,
    ...(renderers !== undefined && { renderers }),
    ...(cells !== undefined && { cells }),
  };
  return (
    // Rule 28: the Funnel's own container decides whether the rail shows, never the window.
    <div data-slot="funnel" className="@container/funnel flex h-full min-h-0">
      <FunnelSidebar
        steps={runner.steps}
        upcoming={runner.upcoming}
        {...(runner.summaryStep !== undefined && { summary: runner.summaryStep })}
        onOpen={runner.open}
        onOpenSummary={runner.openSummary}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <FunnelContent runner={runner} dispatch={dispatch} />
        {host.actions && <FunnelBar runner={runner} host={host} />}
      </div>
      <SubmissionPreview
        open={host.previewing}
        onOpenChange={host.setPreviewing}
        data={ctx.core?.data}
      />
    </div>
  );
}

/** Rule 29-30: the scrolling content column — the current Form, or the summary page — on a centred page. */
function FunnelContent({
  runner,
  dispatch,
}: {
  readonly runner: FunnelRunner;
  readonly dispatch: Pick<LayoutProps, 'schema' | 'path' | 'renderers' | 'cells'>;
}) {
  return (
    <div data-slot="funnel-content" className="min-h-0 flex-1 overflow-y-auto">
      <FunnelStepIndicator steps={runner.steps} />
      <div className="w-full">
        {runner.summary ? (
          <FunnelSummary forms={runner.pathForms} {...dispatch} />
        ) : (
          <JsonFormsDispatch
            uischema={runner.current as unknown as UISchemaElement}
            {...dispatch}
          />
        )}
      </div>
    </div>
  );
}

/** Rule 15: the action bar — the Funnel's navigation, and the host's Save draft (rule 37). */
function FunnelBar({
  runner,
  host,
}: {
  readonly runner: FunnelRunner;
  readonly host: HostActions;
}) {
  return (
    <RunnerActions
      hasBack
      canGoBack={runner.canGoBack}
      atEnd={runner.atEnd}
      blocked={runner.blocked}
      submitBlocked={runner.submitBlocked || host.disabled}
      busy={host.busy}
      canSaveDraft={host.canSaveDraft}
      showSubmit={host.submit}
      onBack={runner.back}
      onNext={runner.next}
      onSaveDraft={host.saveDraft}
      onSubmit={runner.submit}
    />
  );
}

export const funnelEntry = {
  tester: funnelTester,
  renderer: withJsonFormsLayoutProps(FunnelRenderer),
};
