import type { UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { useCallback, useMemo, useState } from 'react';
import * as defaults from '../renderers/default/index';
import { FillPage } from '../renderers/default/fill-page';
import { isPageRoot } from '../renderers/gridstack/grid-layouts';
import { FLOW_TYPE } from '../renderers/xyflow/flow-elements';
import type { FormRunnerProps } from '../types/index';
import type { RunnerData } from './criterion-match';
import { documentHasError, formHasError, type FormValidationError } from './form-errors';
import { formKey, mayOpen, pathErrors } from './path-errors';
import { RunnerActions } from './runner-actions';
import { RunnerProvider, type RunnerPort } from './runner-context';
import { visitedAfterPathChange } from './path-reset';
import { listedStageIds } from './runner-projection';
import { RunnerSidebar } from './runner-sidebar';
import {
  isFinalStep,
  navigableStage,
  nextStep,
  stageFormsOf,
  startPosition,
  visitedWith,
  type RunnerPosition,
} from './runner-position';
import { RunnerReview } from './runner-review';
import { SubmissionPreview } from './submission-preview';

// `<FormRunner>` (doc 202 rules 1-8, 24-28, 34-39) — the one stateful entry point of the package's fill side.
//
// It owns exactly three things: the position, the visited set, and whether a handler is in flight. The ANSWERS are
// the host's (rule 3, controlled `data`/`onChange`), and the graph is the document's — nothing here copies either.

/** Doc 202 rule 6: the runner accepts a document from a host, so it says so rather than rendering nothing. */
export const ROOT_MESSAGE = 'The form must be a Form, a Service or a Flow.';

const EMPTY_VISITED: ReadonlySet<string> = new Set<string>();
const NO_STAGES: readonly string[] = [];

/**
 * Doc 218 rule 6: how a disabled runner draws its controls — the `'readonly'` position of the presentation axis
 * (`renderers/ui/control-presentation.ts`), which every ui control already implements for doc 202 rule 50 and which
 * has had no caller since doc 211 superseded that rule for the review page. Real inputs at full contrast, `readOnly`
 * where HTML has it and `disabled` where it does not — NOT a new presentation, and not the `plain` one a submission
 * uses, which draws answers as text and would say the wrong thing about an empty template.
 */
const READONLY_CONFIG = { readonly: true } as const;

/** The Form element the position names, for the error gate. `null` for a Form root, which is its own form. */
function formAt(
  uischema: UISchemaElement,
  position: RunnerPosition | null,
): UISchemaElement | undefined {
  if (position === null) return undefined;
  const stage = navigableStage(uischema, position.stageId);
  if (stage === undefined) return undefined;
  return stageFormsOf(stage).find((form) => form.id === position.formId)?.element;
}

export function FormRunner({
  schema,
  uischema,
  data,
  onChange,
  onSaveDraft,
  onSubmit,
  disabled = false,
}: FormRunnerProps) {
  const isFlow = uischema.type === FLOW_TYPE;
  // Doc 215 rule 16: a Service root is one page of elements exactly as a Form root is, which is all this ever meant.
  const isPage = isPageRoot(uischema.type);

  // The position is seeded from the document once and then moves only through `goTo`, so a re-render caused by a
  // keystroke never resets where the citizen is.
  const [position, setPosition] = useState<RunnerPosition | null>(() =>
    isFlow ? (startPosition(uischema) ?? null) : null,
  );
  const [visited, setVisited] = useState<ReadonlySet<string>>(() =>
    visitedWith(EMPTY_VISITED, isFlow ? position?.stageId : undefined),
  );
  // Rule 26: Back is history, not a reverse traversal — a branch is not reversible by re-evaluating it.
  const [history, setHistory] = useState<readonly RunnerPosition[]>([]);
  const [errors, setErrors] = useState<readonly FormValidationError[]>([]);
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  // Rule 27d: the Forms the citizen has had on screen, and whether Submit has been tried — together they decide which
  // Forms the rail flags. Flagging every unfilled Form from the first page would paint the whole path red.
  const [seenForms, setSeenForms] = useState<ReadonlySet<string>>(() =>
    position === null ? new Set() : new Set([formKey(position)]),
  );
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // Doc 202 rule 48: the review page is a STEP, so being on it is position-like state. It is held separately
  // from `position` rather than folded into it: the citizen's place in the flow does not change when they open
  // the review, which is what lets Back return there and the rail keep showing where they were.
  const [reviewing, setReviewing] = useState(false);

  const context = useMemo(
    () => ({ flow: uischema, schema, data: data as RunnerData | undefined }),
    [uischema, schema, data],
  );

  // Rule 24: the gate reads only the errors the Form ON SCREEN owns. For a Form root that is the whole document.
  const current = formAt(uischema, position);
  // Doc 218 rule 8: a document nobody can fill must not gate on emptiness, or a disabled Flow is stuck on its first
  // stage for ever. Nothing here is a validity CLAIM — with rule 7's `NoValidation` there are no errors to read.
  const blocked = disabled
    ? false
    : current === undefined
      ? isPage
        ? documentHasError(errors)
        : false
      : formHasError(current, schema, errors);
  // Rule 48: with review on, the last Form's Next opens the review and SUBMIT LIVES THERE — so the last Form is
  // no longer the end, and the review page is.
  const atEnd = reviewing || position === null || !isFlow || isFinalStep(context, position);

  // Every update is functional, so `goTo` captures nothing and keeps one identity for the life of the runner —
  // which matters because it goes into the port below, and a new identity there re-renders the whole flow.
  const goTo = useCallback((next: RunnerPosition) => {
    // Doc 202 rule 48c: going to a POSITION leaves the review. Without this the rail moved the position while
    // the review page stayed on screen, so every row looked dead — the one thing the review is meant to make
    // easy (going back to change an answer) was the one thing it prevented.
    setReviewing(false);
    setPosition((from) => {
      if (from !== null) setHistory((past) => [...past, from]);
      return next;
    });
    setVisited((seen) => visitedWith(seen, next.stageId));
    setSeenForms((seen) => (seen.has(formKey(next)) ? seen : new Set([...seen, formKey(next)])));
  }, []);

  // The stages the rail lists — one list for error attribution (rule 27b) and the progress reset (rule 10g).
  const listed = isFlow ? listedStageIds(context, position?.stageId, visited) : NO_STAGES;

  // Rule 10g: when an answer changes the path, progress past the change resets to upcoming. Adjusted DURING render
  // (React's "storing information from previous renders" pattern), not in an effect, so the rail never paints the
  // stale progress for a frame. It converges: `visited` only ever shrinks here.
  const [lastListed, setLastListed] = useState<readonly string[]>(listed);
  if (lastListed.join('|') !== listed.join('|')) {
    setLastListed(listed);
    const kept = visitedAfterPathChange(lastListed, listed, visited, position?.stageId);
    if (kept !== visited) {
      setVisited(kept);
      setSeenForms(
        (seen) => new Set([...seen].filter((key) => kept.has(key.slice(0, key.indexOf('/'))))),
      );
    }
  }

  // Rules 27b-27d: errors attributed to the Forms on the path the rail lists.
  const flowErrors = isFlow ? pathErrors(uischema, listed, schema, errors) : undefined;
  // Before Submit is tried, only Forms the citizen has LEFT are flagged: the one on screen already shows its messages.
  const onScreen = position === null ? undefined : formKey(position);
  const flaggedForms: ReadonlySet<string> = new Set(
    [...(flowErrors?.erroredForms ?? [])].filter(
      (key) => submitAttempted || (seenForms.has(key) && key !== onScreen),
    ),
  );

  const port: RunnerPort = useMemo(
    () => ({
      position,
      goTo,
      visited,
      data: data as RunnerData | undefined,
      blocked,
      atEnd,
    }),
    [position, goTo, visited, data, blocked, atEnd],
  );

  if (!isFlow && !isPage) {
    return (
      <p role="alert" data-slot="runner-root-error" className="text-sm text-destructive">
        {ROOT_MESSAGE}
      </p>
    );
  }

  const onNext = () => {
    if (position === null || blocked || reviewing) return;
    const step = nextStep(context, position);
    if (step.kind === 'position') goTo(step.position);
    // Rule 48: the review is opened WITHOUT moving the position, so Back returns to the Form still on the rail.
    if (step.kind === 'review') setReviewing(true);
  };

  const onBack = () => {
    // Rule 48: from the review page, Back is leaving it — the position never moved, so there is nothing to pop.
    if (reviewing) {
      setReviewing(false);
      return;
    }
    const previous = history.at(-1);
    if (previous === undefined) return;
    // Rule 26: Back never validates, and it pops rather than re-walking.
    setHistory((past) => past.slice(0, -1));
    setPosition(previous);
  };

  /** Rules 35-36: awaited and busy-stated; a rejection leaves the citizen exactly where they are. */
  const run = (handler: ((answers: RunnerData) => void | Promise<void>) | undefined) => {
    if (handler === undefined || busy) return;
    setBusy(true);
    void Promise.resolve(handler((data ?? {}) as RunnerData))
      .catch(() => {
        // Swallowed deliberately: the host raised it and owns its presentation (the discipline
        // categorization-flow-layout already follows). Rethrowing would surface an unhandled rejection from a click.
      })
      .finally(() => setBusy(false));
  };

  const onSubmitClicked = () => {
    // Rule 27c: a blocked Flow Submit is a way TO the problem, not a dead button — it opens the first Form on the path
    // that has an error, whose messages then show, and from here on the rail flags every errored Form (rule 27d).
    if (flowErrors?.submitBlocked) {
      setSubmitAttempted(true);
      const target = flowErrors.firstError;
      if (target !== undefined && (position === null || formKey(position) !== formKey(target))) {
        goTo({ stageId: target.stageId, formId: target.formId });
      }
      return;
    }
    // Rule 38: with no handler, Submit shows the payload that WOULD be submitted instead of doing nothing.
    if (onSubmit === undefined) {
      setPreviewing(true);
      return;
    }
    run(onSubmit);
  };

  return (
    <RunnerProvider value={port}>
      {/*
        Rule 9b: a flex ROW. The rail is a sibling of the content column, not part of it, so it spans the runner's
        full height while the action bar stays under the CONTENT alone. The rail cannot live where the Flow renderer
        entry draws it (rule 40) and still do this — that copy is inside the single `<JsonForms>`, which the action
        bar sits outside of (rule 40b) — so the runner renders its own and the entry stands down (rule 40e).
      */}
      {/* Doc 184 rule 17b: the runner is the outermost fillable root, so it declares the page container. */}
      <FillPage className="h-full min-h-0">
        <div data-slot="form-runner" className="flex h-full min-h-0">
          {isFlow ? (
            <RunnerSidebar
              flow={uischema}
              schema={schema}
              data={data as RunnerData | undefined}
              position={position}
              visited={visited}
              errorForms={flaggedForms}
              // Rule 24b: forward moves wait for the pages in between; `flowErrors` always exists for a Flow.
              // Doc 218 rule 8: no gate at all while disabled — every Stage opens, for the same reason `blocked` does.
              {...(disabled || flowErrors === undefined
                ? {}
                : { canOpen: (target: RunnerPosition) => mayOpen(flowErrors, position, target) })}
              onGoTo={goTo}
              reviewing={reviewing}
              onOpenReview={() => setReviewing(true)}
            />
          ) : null}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              {reviewing ? (
                // Rules 49-51: the review page replaces the form in the content column — the rail and the action
                // bar are siblings of it, so both stay exactly as they are.
                <RunnerReview
                  flow={uischema}
                  schema={schema}
                  data={data as RunnerData | undefined}
                  stageIds={listed}
                />
              ) : (
                <JsonForms
                  schema={schema}
                  uischema={uischema}
                  data={data}
                  renderers={RENDERERS}
                  cells={defaults.cells}
                  // Doc 218 rules 6-7. `NoValidation` is not cosmetic: JSONForms validates on mount, so without it a
                  // blank published template paints every required field red before anyone has touched it — the same
                  // escape the studio canvas takes (doc 187).
                  {...(disabled
                    ? { config: READONLY_CONFIG, validationMode: 'NoValidation' as const }
                    : {})}
                  onChange={({ data: next, errors: nextErrors }) => {
                    setErrors(nextErrors ?? []);
                    onChange(next as RunnerData);
                  }}
                />
              )}
            </div>
            <RunnerActions
              // Rule 34b: a `Form` root has no Back at all. `history` only ever grows through `goTo`, which only Flow
              // navigation calls, so for a Form the button could never become enabled by any prop — dead chrome rather
              // than a temporarily unavailable action, which is what separates it from Save draft (rule 37).
              hasBack={isFlow}
              canGoBack={reviewing || history.length > 0}
              atEnd={atEnd}
              blocked={blocked}
              // Rule 27c: a Flow's Submit stays pressable while there is an errored Form to take the citizen to; it is
              // disabled only for errors no Form owns, which have nowhere to go (rule 32). A Form root keeps rule 27.
              // Doc 218 rule 9: both forward actions are refused while disabled, and the handlers are ignored — there
              // is nothing to save or submit on a document that cannot be answered.
              submitBlocked={
                disabled ||
                (flowErrors === undefined
                  ? documentHasError(errors)
                  : flowErrors.submitBlocked && flowErrors.firstError === undefined)
              }
              busy={busy}
              canSaveDraft={!disabled && onSaveDraft !== undefined}
              onBack={onBack}
              onNext={onNext}
              onSaveDraft={() => run(onSaveDraft)}
              onSubmit={onSubmitClicked}
            />
          </div>
        </div>
      </FillPage>
      <SubmissionPreview
        open={previewing}
        onOpenChange={setPreviewing}
        data={data as RunnerData | undefined}
      />
    </RunnerProvider>
  );
}

// Built once at module load: a new array per render would make JSONForms re-dispatch everything (the reason
// StudioCanvas hoists its own registries).
const RENDERERS = [
  ...defaults.controlRenderers,
  ...defaults.displayRenderers,
  ...defaults.layoutRenderers,
];
