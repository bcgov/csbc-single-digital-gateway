import type { JsonFormsRendererRegistryEntry, LayoutProps, UISchemaElement } from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';
import { useCallback, useMemo, useState } from 'react';
import { RunnerProvider, useRunner, type RunnerPort } from '../../runner/runner-context';
import { RunnerSidebar, RunnerStageIndicator } from '../../runner/runner-sidebar';
import {
  isFinalStep,
  navigableStage,
  stageFormsOf,
  startPosition,
  visitedWith,
  type RunnerPosition,
} from '../../runner/runner-position';
import { flowTester, STAGE_PLACEMENT_MESSAGE, stageTester } from '../xyflow/flow-elements';
import { FillPage } from './fill-page';

// The Flow and Stage entries of `renderers/default` (doc 202 rules 40-43, 46; doc 195 rule 19 as amended).
//
// Rule 40: a Flow is no longer "can't be filled in yet" — this entry renders the flow's CONTENT: the stage sidebar
// beside a content pane holding exactly ONE Form, the one the position names. The action bar is NOT here; it is the
// runner's chrome, outside the single `<JsonForms>` this entry is dispatched inside.
//
// Rule 42: only PURE modules are imported — `xyflow/flow-elements` for the testers and the Stage message, and the
// runner's own pure position modules. Nothing from `@xyflow/react`, and nothing from the non-pure `renderers/xyflow`
// modules; `test/renderers-default-flow.test.tsx` pins that.

const EMPTY_VISITED: ReadonlySet<string> = new Set<string>();

/**
 * The Form `position` names within `flow`, or `undefined` when its Stage is not navigable (doc 195 rule 8's
 * placeholder ids) or holds no Form by that id — which is what a document edited under the runner looks like.
 *
 * Deliberately a second, tiny copy of `form-runner.tsx`'s private `formAt`: the runner resolves a position to gate on
 * that Form's errors (rule 24), this entry resolves one to RENDER it, and neither owns the other's module.
 */
function formAt(
  flow: UISchemaElement,
  position: RunnerPosition | null,
): UISchemaElement | undefined {
  if (position === null) return undefined;
  const stage = navigableStage(flow, position.stageId);
  if (stage === undefined) return undefined;
  return stageFormsOf(stage).find((form) => form.id === position.formId)?.element;
}

function FillFlow(props: LayoutProps) {
  const { uischema, schema, path, enabled, renderers, cells, visible } = props;

  // Rule 40: the runner around this Flow, or `null` when there is none — the studio's preview, which renders
  // `previewRoot` through `renderers/default` and supplies nothing.
  const runner = useRunner();

  // The no-port case holds its own position and visited set, seeded from the document exactly as `FormRunner` seeds
  // its own (rule 18's `startPosition`, with every fallback living in `startStageId`). Seeded ONCE, so a keystroke in
  // the previewed form never sends the previewer back to the first Stage. The hooks run unconditionally and their
  // values are simply unused when a port is present — a hook may not be called behind a condition.
  const [local, setLocal] = useState<RunnerPosition | null>(() => startPosition(uischema) ?? null);
  const [visited, setVisited] = useState<ReadonlySet<string>>(() =>
    visitedWith(EMPTY_VISITED, startPosition(uischema)?.stageId),
  );

  // One identity for the life of the component (every update is functional), so the local port below is not rebuilt
  // on every render — the same discipline `FormRunner`'s `goTo` follows for the same reason.
  const goTo = useCallback((next: RunnerPosition) => {
    setLocal(next);
    setVisited((seen) => visitedWith(seen, next.stageId));
  }, []);

  // A local position that no longer resolves (the previewer edited the document under it) falls back to the start
  // rather than rendering an empty pane. Derived, not an effect: there is nothing to synchronise.
  const localPosition =
    formAt(uischema, local) === undefined ? (startPosition(uischema) ?? null) : local;

  const localPort: RunnerPort = useMemo(
    () => ({
      position: localPosition,
      goTo,
      visited,
      // No host `data` reaches a renderer's layout props, so a preview evaluates Conditions against no answers —
      // every one takes its default path (rule 22). The sidebar only ever offers VISITED Stages anyway (rule 25).
      data: undefined,
      // Nothing gates a preview: there is no action bar here to block (rules 24, 34).
      blocked: false,
      atEnd:
        localPosition === null ||
        isFinalStep({ flow: uischema, schema, data: undefined }, localPosition),
    }),
    [localPosition, goTo, visited, uischema, schema],
  );

  // The port every descendant reads, so the sidebar is written ONCE against `useRunner()` and cannot tell the two
  // cases apart. A real port is passed through by identity, so re-providing it re-renders nothing.
  const port = runner ?? localPort;
  const position = port.position;
  const form = formAt(uischema, position);

  if (!visible) return null;

  return (
    <RunnerProvider value={port}>
      {/* Doc 184 rule 17b: the page container, unless the runner around this Flow already declared it. */}
      <FillPage>
        {/* Rule 9b: no gap — the rail's own right border is the only separation, so the content starts at its edge. */}
        <div
          data-slot="fill-flow"
          data-layout-type={uischema.type}
          className="flex min-h-0 flex-col @min-[40rem]/fill-page:flex-row"
        >
          {/*
          Rule 40e: the rail is drawn here ONLY when there is no runner around us. Under a `<FormRunner>` the runner
          renders it instead, as a full-height sibling of the content column (rule 9b) — this copy sits INSIDE the
          single `<JsonForms>`, so a rail drawn here could never be taller than the content beside it, and the action
          bar would have to span it. Drawing both would simply duplicate the list.
        */}
          {runner === null ? (
            <RunnerSidebar
              flow={uischema}
              schema={schema}
              data={port.data}
              position={position}
              visited={port.visited}
              onGoTo={port.goTo}
            />
          ) : null}
          <div data-slot="runner-flow-content" className="min-w-0 flex-1">
            {/* Rule 9: below `sm` the rail is replaced by this line, which sits above the content rather than beside it. */}
            <RunnerStageIndicator
              flow={uischema}
              schema={schema}
              data={port.data}
              position={position}
              visited={port.visited}
            />
            {position === null || form === undefined ? null : (
              // Rule 40: the Form is dispatched through JSONForms, so it renders as a ROOT (doc 196 rule 12) and its
              // nested-Form check passes. The Stage element itself is never rendered — it is a graph node, not a layout.
              // Keyed by the position so moving between Forms mounts a fresh subtree rather than reusing the last one's.
              <JsonFormsDispatch
                key={`${position.stageId}/${position.formId}`}
                uischema={form}
                schema={schema}
                path={path}
                enabled={enabled}
                {...(renderers ? { renderers } : {})}
                {...(cells ? { cells } : {})}
              />
            )}
          </div>
        </div>
      </FillPage>
    </RunnerProvider>
  );
}

/** Rule 41: unchanged — a Stage outside a Flow is a placement error, since no Flow renderer placed it. */
function FillStage() {
  return (
    <p role="alert" data-slot="stage-placement-error" className="text-sm text-destructive">
      {STAGE_PLACEMENT_MESSAGE}
    </p>
  );
}

/** Rule 43: exactly TWO entries — the Flow entry is REPLACED, so `defaults.layoutRenderers` stays at 6. */
export const fillFlowRenderers: readonly JsonFormsRendererRegistryEntry[] = Object.freeze([
  { tester: flowTester, renderer: withJsonFormsLayoutProps(FillFlow) },
  { tester: stageTester, renderer: withJsonFormsLayoutProps(FillStage) },
]);
