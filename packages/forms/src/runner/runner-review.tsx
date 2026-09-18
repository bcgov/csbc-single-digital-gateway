import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { Heading } from '@repo/ui/heading';
import { labelOf } from '../renderers/gridstack/element-label';
import { formDescriptionOf } from '../renderers/gridstack/form-renderer';
import * as defaults from '../renderers/default';
import { navigableStage, stageFormsOf } from './runner-position';
import type { RunnerData } from './criterion-match';

// The review page (doc 202 rules 49-53): every Form on the citizen's path, read-only, on one page before Submit.

export { REVIEW_STEP_LABEL } from './runner-review-row';

export const REVIEW_TITLE = 'Review your answers';
export const REVIEW_DESCRIPTION =
  'Check your details before submitting. Use the steps on the left to change anything.';

/** The Flow's own description when it has one, else the standard line — the same fallback the title takes. */
const reviewDescription = (flow: UISchemaElement): string => {
  const authored = formDescriptionOf(flow);
  return authored === '' ? REVIEW_DESCRIPTION : authored;
};

/**
 * Rule 50: read-only for a whole subtree, through JSONForms' `config` — the channel `hideRequiredAsterisk`
 * already uses. Nothing in the authored uischema turns it on, and a control reads it through `isReadonly`.
 *
 * Rule 51b: `plainFormTitle` travels the same way. The review page draws ONE gold rule, under the document's own
 * title — a stack of Forms each drawing their own would make the page read as a pile of separate documents.
 */
const REVIEW_CONFIG = { readonly: true, plainFormTitle: true };

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
   * Rule 49: the PROJECTED path's stage ids, in path order — the same list the sidebar shows, never the
   * `visited` set. Visited records where the citizen HAS BEEN; change an answer late and a stage they visited
   * may no longer be on their branch, so reviewing it would show them data they are not submitting.
   */
  readonly stageIds: readonly string[];
}

/**
 * Rule 51: the rendered page — the document's title and description, a gold rule BENEATH them, and then every
 * Form of the projected path stacked below it.
 *
 * The rule sits between the heading and the content rather than around the page (user 2026-09-17): it is the
 * same treatment a fillable Form's own title bar gives (doc 201 rule 8), so the review reads as one more page of
 * the same document rather than as a boxed-off summary of it.
 *
 * Stages are NOT named here (user 2026-09-17). The rail already says which stage each page belonged to, and on a
 * single page the citizen is checking their ANSWERS, not the shape of the flow that collected them.
 *
 * Each Form gets its OWN `<JsonForms>` rather than one instance over a synthesised layout: `config` and
 * `validationMode` are per-instance props, and a synthesised parent would also have to invent a layout type
 * that the fill renderers would then lay out as if the author had written it. Rendering each Form as itself is
 * what makes this the same page the citizen filled in.
 *
 * `NoValidation` and no `onChange`: the page is read-only, so it has nothing to report and must not push errors
 * of its own into the runner's state (rule 52 — Submit's gate is unchanged, and it reads the real errors).
 */
export function RunnerReview({ flow, schema, data, stageIds }: RunnerReviewProps) {
  const stages = stageIds.flatMap((stageId) => {
    const stage = navigableStage(flow, stageId);
    return stage === undefined ? [] : [{ stageId, stage }];
  });

  return (
    <section
      data-slot="runner-review"
      aria-labelledby="runner-review-title"
      className="flex flex-col"
    >
      {/* The bar owns the rule and stretches edge to edge; the text inside owns the inset — doc 201 rule 8b's
          split, so the gold line runs the full width rather than being inset with the heading. */}
      <div data-slot="runner-review-title-bar" className="border-b-2 border-bcgov-gold">
        <div className="flex flex-col gap-2 p-6">
          <Heading level={1} size={1} id="runner-review-title">
            {labelOf(flow, REVIEW_TITLE)}
          </Heading>
          <p className="text-sm text-muted-foreground">{reviewDescription(flow)}</p>
        </div>
      </div>

      <div className="flex flex-col">
        {stages.flatMap(({ stageId, stage }) =>
          stageFormsOf(stage).map((form) => (
            <div key={`${stageId}/${form.id}`} data-slot="runner-review-form">
              <JsonForms
                schema={schema}
                uischema={form.element}
                data={data}
                renderers={RENDERERS}
                cells={defaults.cells}
                config={REVIEW_CONFIG}
                validationMode="NoValidation"
              />
            </div>
          )),
        )}
      </div>
    </section>
  );
}
