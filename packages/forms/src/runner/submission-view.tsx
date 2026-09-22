import { JsonForms } from '@jsonforms/react';
import { useCallback, useMemo, useState } from 'react';
import * as defaults from '../renderers/default/index';
import { FillPage } from '../renderers/default/fill-page';
import { FORM_TYPE } from '../renderers/gridstack/grid-layouts';
import { FLOW_TYPE } from '../renderers/xyflow/flow-elements';
import { PLAIN_CONFIG } from '../renderers/ui/control-presentation';
import type { SubmissionViewProps } from '../types/index';
import type { RunnerData } from './criterion-match';
import { ROOT_MESSAGE } from './form-runner';
import { RunnerProvider, type RunnerPort } from './runner-context';
import { listedStageIds } from './runner-projection';
import { RunnerReview } from './runner-review';
import { RunnerSidebar } from './runner-sidebar';
import { startPosition, type RunnerPosition } from './runner-position';

// `<SubmissionView>` (doc 211 rules 14-26) — the same document `<FormRunner>` fills in, shown as ANSWERS.
//
// It is a separate component rather than a mode on the runner (doc 211 Architecture): the runner exists to own
// the position, the visited set, the history, the errors, the in-flight handler and the submit attempt, and a
// view of a finished submission has none of them. What it DOES share, it shares by reuse — the same renderer
// registry, the same rail, the same review page, the same pure projection — so a submission reads as the pages
// it was filled in on.
//
// The whole document is mounted in ONE `<JsonForms>`, exactly as the runner mounts it: `renderers/default`'s
// Flow entry draws the Form the position names, reading the port below.

const NO_STAGES: readonly string[] = [];

export function SubmissionView({ schema, uischema, data }: SubmissionViewProps) {
  const isFlow = uischema.type === FLOW_TYPE;
  const isForm = uischema.type === FORM_TYPE;

  /**
   * Rule 18: the ONLY state — which page is on screen. Seeded from the document once, so a re-render never
   * sends a reviewer back to the first stage.
   *
   * `reviewing` is held beside the position rather than folded into it for doc 202 rule 48's reason: opening
   * the review does not change where in the flow you are, which is what lets the rail keep showing it.
   */
  const [position, setPosition] = useState<RunnerPosition | null>(() =>
    isFlow ? (startPosition(uischema) ?? null) : null,
  );
  const [reviewing, setReviewing] = useState(false);

  const context = useMemo(
    () => ({ flow: uischema, schema, data: data as RunnerData | undefined }),
    [uischema, schema, data],
  );

  /**
   * Rule 20: the PROJECTED path (doc 202 rule 10c), walked against the COMPLETE answers — so this is the exact
   * list of stages the submission went through. A branch the answers did not take is not listed, which is the
   * whole reason the rail can be unlocked: there is nothing on it the citizen did not reach.
   *
   * No `visited` is passed: the walk needs one only to follow a route not yet decided by the answers, and here
   * the answers are all in.
   */
  const listed = isFlow ? listedStageIds(context, position?.stageId) : NO_STAGES;

  /**
   * Rule 19: every listed stage counts as reached, so `lockOf` unlocks every authored row.
   *
   * Memoised on the JOINED list rather than on `listed` itself, which is a fresh array every render: the set
   * goes into the port below, and a new identity there re-renders the whole flow on every keystroke-free
   * re-render the host causes.
   */
  const listedKey = listed.join('|');
  const visited: ReadonlySet<string> = useMemo(
    () => new Set(listedKey === '' ? [] : listedKey.split('|')),
    [listedKey],
  );

  // One identity for the life of the component, as the runner's `goTo` has: it goes into the port, and a new
  // identity there re-renders the whole flow.
  const goTo = useCallback((next: RunnerPosition) => {
    // Doc 202 rule 48c: the review and a Form share one slot, so going to a position leaves the review.
    setReviewing(false);
    setPosition(next);
  }, []);

  const port: RunnerPort = useMemo(
    () => ({
      position,
      goTo,
      visited,
      data: data as RunnerData | undefined,
      // Rules 19, 22: nothing is gated, because nothing can be filled in and there is no bar to block.
      blocked: false,
      atEnd: true,
    }),
    [position, goTo, visited, data],
  );

  // Rule 15: the runner's own words for the same condition — a document this cannot show is not a different
  // problem here than it is there.
  if (!isFlow && !isForm) {
    return (
      <p role="alert" data-slot="submission-view-root-error" className="text-sm text-destructive">
        {ROOT_MESSAGE}
      </p>
    );
  }

  return (
    <RunnerProvider value={port}>
      {/* Doc 184 rule 17b: the outermost fillable root declares the page container. */}
      <FillPage className="h-full min-h-0">
        {/* Rule 24: the rail is navigation, so it does not print. The row becomes a plain block, leaving the
            content to flow down the page on its own. */}
        <div data-slot="submission-view" className="flex h-full min-h-0 print:block print:h-auto">
          {isFlow ? (
            <RunnerSidebar
              flow={uischema}
              schema={schema}
              data={data as RunnerData | undefined}
              position={position}
              visited={visited}
              // Rule 19: no `canOpen` and no `errorForms`. Both already default to "nothing is refused and
              // nothing is flagged", so an unlocked rail is a matter of what is NOT passed.
              onGoTo={goTo}
              reviewing={reviewing}
              onOpenReview={() => setReviewing(true)}
              // Rule 19b: the review is a step already taken, not one still ahead, so it wears the reached tone
              // like every other row. Drawn `ahead` it READ as unavailable while being perfectly clickable.
              reviewReached
            />
          ) : null}
          {/* Rule 25: nothing that prints sits in a scroll container. On screen the column scrolls; in print
              its height and overflow are released so the answers flow across sheets. */}
          <div
            data-slot="submission-view-content"
            className="min-h-0 min-w-0 flex-1 overflow-y-auto print:overflow-visible"
          >
            {reviewing ? (
              // Rules 21, 23: the review page, in the plain presentation — every Form of the path on one page,
              // which is also the whole-submission printout (rule 26).
              <RunnerReview
                flow={uischema}
                schema={schema}
                data={data as RunnerData | undefined}
                stageIds={listed}
                presentation="plain"
              />
            ) : (
              // Rule 16: no `onChange` and nothing validates. The page has nothing to report and nothing to
              // write, and a value the schema refuses is SHOWN rather than flagged (rule 10).
              <JsonForms
                schema={schema}
                uischema={uischema}
                data={data}
                renderers={RENDERERS}
                cells={defaults.cells}
                config={PLAIN_CONFIG}
                validationMode="NoValidation"
              />
            )}
          </div>
        </div>
      </FillPage>
    </RunnerProvider>
  );
}

// Built once at module load, for the reason the runner's own registry is: a new array per render makes
// JSONForms re-dispatch everything below it.
const RENDERERS = [
  ...defaults.controlRenderers,
  ...defaults.displayRenderers,
  ...defaults.layoutRenderers,
];
