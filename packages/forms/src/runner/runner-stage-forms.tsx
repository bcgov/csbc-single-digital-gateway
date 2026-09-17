import { labelOf } from '../renderers/gridstack/element-label';
import { formKey } from './path-errors';
import { stageFormsOf, type RunnerPosition } from './runner-position';
import { BLOCKED_HINT, ErrorFlag } from './runner-row-parts';
import type { SidebarStage } from './runner-step-rows';

// The current stage's page items in the step rail (doc 202 rules 11, 11c, 11e, 11f, 24b), split out of
// `runner-step-rows` at the file-size gate.

/**
 * Rule 11: the current stage's Forms by title (`labelOf(form, 'Form')`), the one on screen marked `aria-current="page"`.
 * Rule 11c: every row draws a THIN grey left border positioned under the centre of the stage's numeral, and the rows
 * stack with no gap, so the line reads as a connector running down from the step number above. The current row keeps
 * the accent tint, and rule 11e marks it with a bcgov-blue line and bold bcgov-blue text (rule 11b's 4px primary bar is
 * superseded).
 *
 * Rule 11f: each row is a BUTTON that opens that Form, recorded in history like any other move (superseding the old
 * "rows are not controls"). Skipping the Next gate this way is the same trade rule 25b already makes for stages: a
 * Form left with errors is flagged in the rail (rule 27d), and Submit takes the citizen back to it (rule 27c).
 * `aria-current="page"` sits on the button; the row keeps the visual state.
 */
export function StageForms({
  stage,
  position,
  errorForms,
  onGoTo,
  canOpen,
}: {
  stage: SidebarStage;
  position: RunnerPosition;
  errorForms: ReadonlySet<string>;
  onGoTo(position: RunnerPosition): void;
  canOpen(target: RunnerPosition): boolean;
}) {
  const forms = stageFormsOf(stage.element);

  return (
    // `ml-6.5` (26px) = the stage row's 4px left border + `px-3` + half the 20px numeral column: the line starts under
    // the numeral's centre. It starts BELOW the stage row, never pulled up into it — a negative margin overlapped the
    // stage item (user report 2026-09-17). No bottom margin either: the next stage follows the last Form directly.
    <ol data-slot="runner-stage-forms" className="ml-6.5 flex flex-col">
      {forms.map((form) => {
        const currentForm = form.id === position.formId;
        const target = { stageId: stage.id, formId: form.id };
        // Rule 24b: a page AFTER an unfinished one stays closed, exactly as Next would refuse it.
        const closed = !currentForm && !canOpen(target);
        return (
          <li
            key={form.id}
            data-slot="runner-stage-form"
            {...(currentForm ? { 'data-current': '' } : {})}
            // Rule 11e: the selected Form's thin line and text turn bcgov-blue and the text bold. The tint alone was
            // not enough once the active stage shared it (rule 11d): stage and Form read as one block.
            className={`border-l text-sm ${
              currentForm
                ? 'border-l-bcgov-blue bg-accent font-bold text-bcgov-blue'
                : closed
                  ? 'border-l-border text-border'
                  : 'border-l-border text-muted-foreground hover:bg-accent'
            }`}
          >
            <button
              type="button"
              data-slot="runner-stage-form-button"
              {...(currentForm ? { 'aria-current': 'page' as const } : {})}
              disabled={closed}
              onClick={() => onGoTo(target)}
              className="flex w-full min-w-0 cursor-pointer items-center gap-1.5 px-4 py-2 text-left disabled:cursor-default"
            >
              <span className="min-w-0 truncate">{labelOf(form.element, 'Form')}</span>
              {closed ? <span className="sr-only">{BLOCKED_HINT}</span> : null}
              {errorForms.has(formKey(target)) ? <ErrorFlag /> : null}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
