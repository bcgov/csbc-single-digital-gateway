import type { UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { useCallback, useMemo, useState } from 'react';
import * as defaults from '../renderers/default/index';
import { FORM_TYPE } from '../renderers/gridstack/grid-layouts';
import { FLOW_TYPE } from '../renderers/xyflow/flow-elements';
import type { FormRunnerProps } from '../types/index';
import type { RunnerData } from './criterion-match';
import { documentHasError, formHasError, type FormValidationError } from './form-errors';
import { RunnerActions } from './runner-actions';
import { RunnerProvider, type RunnerPort } from './runner-context';
import {
  isFinalStep,
  navigableStage,
  nextStep,
  stageFormsOf,
  startPosition,
  visitedWith,
  type RunnerPosition,
} from './runner-position';
import { SubmissionPreview } from './submission-preview';

// `<FormRunner>` (doc 202 rules 1-8, 24-28, 34-39) — the one stateful entry point of the package's fill side.
//
// It owns exactly three things: the position, the visited set, and whether a handler is in flight. The ANSWERS are
// the host's (rule 3, controlled `data`/`onChange`), and the graph is the document's — nothing here copies either.

/** Doc 202 rule 6: the runner accepts a document from a host, so it says so rather than rendering nothing. */
export const ROOT_MESSAGE = 'The form must be a Form or a Flow.';

const EMPTY_VISITED: ReadonlySet<string> = new Set<string>();

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
}: FormRunnerProps) {
  const isFlow = uischema.type === FLOW_TYPE;
  const isForm = uischema.type === FORM_TYPE;

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

  const context = useMemo(
    () => ({ flow: uischema, schema, data: data as RunnerData | undefined }),
    [uischema, schema, data],
  );

  // Rule 24: the gate reads only the errors the Form ON SCREEN owns. For a Form root that is the whole document.
  const current = formAt(uischema, position);
  const blocked =
    current === undefined
      ? isForm
        ? documentHasError(errors)
        : false
      : formHasError(current, schema, errors);
  const atEnd = position === null || !isFlow || isFinalStep(context, position);

  // Every update is functional, so `goTo` captures nothing and keeps one identity for the life of the runner —
  // which matters because it goes into the port below, and a new identity there re-renders the whole flow.
  const goTo = useCallback((next: RunnerPosition) => {
    setPosition((from) => {
      if (from !== null) setHistory((past) => [...past, from]);
      return next;
    });
    setVisited((seen) => visitedWith(seen, next.stageId));
  }, []);

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

  if (!isFlow && !isForm) {
    return (
      <p role="alert" data-slot="runner-root-error" className="text-sm text-destructive">
        {ROOT_MESSAGE}
      </p>
    );
  }

  const onNext = () => {
    if (position === null || blocked) return;
    const step = nextStep(context, position);
    if (step.kind === 'position') goTo(step.position);
  };

  const onBack = () => {
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
    // Rule 38: with no handler, Submit shows the payload that WOULD be submitted instead of doing nothing.
    if (onSubmit === undefined) {
      setPreviewing(true);
      return;
    }
    run(onSubmit);
  };

  return (
    <RunnerProvider value={port}>
      <div data-slot="form-runner" className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <JsonForms
            schema={schema}
            uischema={uischema}
            data={data}
            renderers={RENDERERS}
            cells={defaults.cells}
            onChange={({ data: next, errors: nextErrors }) => {
              setErrors(nextErrors ?? []);
              onChange(next as RunnerData);
            }}
          />
        </div>
        <RunnerActions
          canGoBack={history.length > 0}
          atEnd={atEnd}
          blocked={blocked}
          submitBlocked={documentHasError(errors)}
          busy={busy}
          canSaveDraft={onSaveDraft !== undefined}
          onBack={onBack}
          onNext={onNext}
          onSaveDraft={() => run(onSaveDraft)}
          onSubmit={onSubmitClicked}
        />
      </div>
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
