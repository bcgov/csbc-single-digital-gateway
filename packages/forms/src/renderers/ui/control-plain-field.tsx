import { computeLabel, type ControlProps } from '@jsonforms/core';
import { Field, FieldDescription, FieldTitle } from '@repo/ui/field';
import type { ReactNode } from 'react';
import { plainFallback } from './control-plain-value';

// Doc 211 rules 5-9 — what a control draws in the `plain` presentation: its label, its answer, its description.
//
// Its own module rather than a branch inside `ControlField`: the fill path must be untouched by this feature,
// and both entry points into the control chrome — `ControlField` and `BooleanField` — return this same field,
// so the two can never draw a submission differently.

/** Rule 9: what an unanswered field says. One constant, so every control says it identically. */
export const NOT_ANSWERED = 'Not answered';

interface PlainFieldProps {
  readonly control: ControlProps;
  /**
   * Rule 8: the answer as the CONTROL formatted it — only the control knows its option labels, its mask and
   * its number format. `undefined` means "no answer" (rule 9); the control never passes the wording itself.
   *
   * With none passed, the stored value is shown as itself (`plainFallback`), which is also what every
   * formatter does for a value its schema no longer admits (rule 10) — so the two agree rather than compete.
   */
  readonly value?: ReactNode;
}

/**
 * Rules 5-7: label, value, description — and nothing else.
 *
 * NO character counter (rule 18b's `<n>/<max>` describes typing room, of which there is none), NO `FieldError`
 * and no `aria-invalid` (rule 16: the page never validates), and no input id wiring, because there is no input.
 *
 * Rule 7: `FieldTitle`, not `FieldLabel` — a `<label>` must point at a form control and there is none here.
 * The two are styled alike, so the page still reads as the page that was filled in; the size is matched
 * explicitly because `FieldTitle` is the smaller of the two by default.
 *
 * The asterisk is suppressed: on a submission, "required" is a rule that has already been met or not, and
 * marking a field required tells a reviewer nothing they can act on.
 */
export function PlainField({ control, value }: PlainFieldProps) {
  const { data, label, description, visible } = control;
  if (!visible) return null;

  const answer = value ?? plainFallback(data);
  const answered = answer !== undefined && answer !== null && answer !== '';

  return (
    <Field data-slot="plain-field">
      {label.trim() ? (
        <FieldTitle data-slot="plain-field-label" className="text-sm/relaxed">
          {computeLabel(label, false, true)}
        </FieldTitle>
      ) : null}
      {/* A `div`, not a `p`: a multi-choice answer is a list, and a `ul` inside a `p` is not valid markup.
          `whitespace-pre-line` is what keeps a Textarea answer's line breaks (rule 11). */}
      <div
        data-slot="plain-field-value"
        {...(answered ? {} : { 'data-empty': '' })}
        className={
          answered ? 'text-sm whitespace-pre-line' : 'text-sm text-muted-foreground italic'
        }
      >
        {answered ? answer : NOT_ANSWERED}
      </div>
      {description?.trim() ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
}

/**
 * Rule 11: several chosen labels as a list — the shape a multi-choice answer takes on the page.
 *
 * `undefined` in, `undefined` out, so a control can hand `plainMultiChoice`'s result straight through and an
 * empty selection still reaches rule 9's wording.
 */
export function PlainList(labels: string[] | undefined): ReactNode {
  if (labels === undefined || labels.length === 0) return undefined;
  return (
    <ul data-slot="plain-field-list" className="list-inside list-disc">
      {labels.map((label) => (
        <li key={label}>{label}</li>
      ))}
    </ul>
  );
}
