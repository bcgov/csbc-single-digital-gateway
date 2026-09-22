import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import * as defaults from '../renderers/default';
import { PLAIN_CONFIG } from '../renderers/ui/control-presentation';
import type { RunnerData } from './criterion-match';
import { reviewDocument } from './review-document';

// The review page (doc 202 rules 49-53, rebuilt by doc 213): every Form on the citizen's path, read-only, on
// one page before Submit.
//
// It is now ONE `<JsonForms>` over ONE synthesised document (`review-document.ts`) — a `Form` whose children
// are a `Section` per path Form. It used to be one instance PER FORM under a hand-built title bar, because a
// `Form` may not nest (doc 192 rule 5) and so no legal document could hold the whole path; doc 212's `Section`
// removed that obstacle. What the page SHOWS is unchanged.
//
// Doc 213 rules 12-14: what went with the rebuild — `plainFormTitle` (the flag that stopped each stacked Form
// drawing its own gold rule; there are no stacked Forms now), the hand-built `runner-review-title-bar` and its
// `Heading` and `RichTextView` (the root Form's own title bar IS that treatment, doc 201 rule 8), and the
// `runner-review-form` wrapper. Doc 202 rules 51 and 51b are superseded.

export { REVIEW_STEP_LABEL } from './runner-review-row';
export { REVIEW_TITLE } from './review-document';

/**
 * Doc 202 rule 50: read-only for a whole subtree, through JSONForms' `config` — the channel
 * `hideRequiredAsterisk` already uses. Nothing in the authored uischema turns it on, and a control reads it
 * through `isReadonly`.
 */
const REVIEW_CONFIG = { readonly: true };

/** Doc 211 rules 21, 23: the same page as plain text rather than as read-only inputs. */
const PLAIN_REVIEW_CONFIG = PLAIN_CONFIG;

// Built once at module load, exactly as the runner's own registry is: a new array per render makes JSONForms
// re-dispatch everything below it.
const RENDERERS = [
  ...defaults.controlRenderers,
  ...defaults.displayRenderers,
  ...defaults.layoutRenderers,
];

interface RunnerReviewProps {
  readonly flow: UISchemaElement;
  readonly schema: JsonSchema;
  readonly data: RunnerData | undefined;
  /**
   * Doc 202 rule 49: the PROJECTED path's stage ids, in path order — the same list the sidebar shows, never the
   * `visited` set. Visited records where the citizen HAS BEEN; change an answer late and a stage they visited
   * may no longer be on their branch, so reviewing it would show them data they are not submitting.
   */
  readonly stageIds: readonly string[];
  /**
   * Doc 211 rule 23: how the answers are drawn. Defaults to `readonly` so the runner's review page is
   * unchanged; `<SubmissionView>` passes `plain`.
   */
  readonly presentation?: 'readonly' | 'plain';
}

/**
 * Doc 213 rules 8-11: the synthesis, one `<JsonForms>`, and the choice of config.
 *
 * The page's title, its description and the single gold rule beneath them are the synthesised Form's own title
 * bar (doc 201 rule 8) — so the treatment doc 202 rule 51 described by hand is now drawn by the renderer that
 * draws every other Form title, and cannot drift from it.
 *
 * `NoValidation` and no `onChange` (rule 10): the page is read-only, so it has nothing to report and must not
 * push errors of its own into the runner's state. Submit's gate is unchanged, and it reads the real errors.
 *
 * Rule 15: the `runner-review` wrapper stays. It is what the rail finds the page by, and what doc 202 rule 48c's
 * "the review and a Form share one slot" refers to.
 */
export function RunnerReview({
  flow,
  schema,
  data,
  stageIds,
  presentation = 'readonly',
}: RunnerReviewProps) {
  return (
    <section data-slot="runner-review" className="flex flex-col">
      <JsonForms
        schema={schema}
        uischema={reviewDocument(flow, stageIds)}
        data={data}
        renderers={RENDERERS}
        cells={defaults.cells}
        config={presentation === 'plain' ? PLAIN_REVIEW_CONFIG : REVIEW_CONFIG}
        validationMode="NoValidation"
      />
    </section>
  );
}
