import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { labelOf } from '../renderers/gridstack/element-label';
import * as defaults from '../renderers/default';
import { navigableStage, stageFormsOf } from './runner-position';
import type { RunnerData } from './criterion-match';

// The review page (doc 202 rules 49-53): every Form on the citizen's path, read-only, on one page before Submit.

export const REVIEW_TITLE = 'Review your answers';
export const REVIEW_DESCRIPTION =
  'Check your details before submitting. Use the steps on the left to change anything.';
/** Rule 48: what the step is called wherever it is listed. */
export const REVIEW_STEP_LABEL = 'Review';

/**
 * Rule 50: read-only for a whole subtree, through JSONForms' `config` — the channel `hideRequiredAsterisk`
 * already uses. Nothing in the authored uischema turns it on, and a control reads it through `isReadonly`.
 */
const READONLY_CONFIG = { readonly: true };

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
 * Rule 51: the rendered page — a header, a description and a gold border, with every Form of every projected
 * stage stacked under its stage's name.
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
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-lg border-2 border-bcgov-gold bg-card p-6"
    >
      <header className="flex flex-col gap-1">
        <h2 id="runner-review-title" className="text-h5 font-bold">
          {labelOf(flow, REVIEW_TITLE)}
        </h2>
        <p className="text-sm text-muted-foreground">{REVIEW_DESCRIPTION}</p>
      </header>

      {stages.map(({ stageId, stage }) => (
        <section key={stageId} data-slot="runner-review-stage" className="flex flex-col gap-3">
          <h3 className="border-b pb-1 text-sm font-semibold">{labelOf(stage, 'Stage')}</h3>
          {stageFormsOf(stage).map((form) => (
            <div key={form.id} data-slot="runner-review-form">
              <JsonForms
                schema={schema}
                uischema={form.element}
                data={data}
                renderers={RENDERERS}
                cells={defaults.cells}
                config={READONLY_CONFIG}
                validationMode="NoValidation"
              />
            </div>
          ))}
        </section>
      ))}
    </section>
  );
}
