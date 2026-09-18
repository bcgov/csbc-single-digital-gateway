import { computeLabel, type ControlProps } from '@jsonforms/core';
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from '@repo/ui/field';
import type { ReactNode } from 'react';

/** What `ControlField` hands its input: the id the label points at, plus state and aria wiring. */
export interface ControlInputProps {
  id: string;
  disabled: boolean;
  /**
   * Doc 202 rule 50: READ-ONLY, which is not the same as disabled. A read-only field keeps full contrast and
   * stays focusable, so a citizen reviewing their answers can read them and tab through them, where a disabled
   * one is dimmed and skipped by the keyboard — which reads as "this form is locked".
   *
   * Only set for controls with a real HTML `readOnly`: a text input, a textarea, a number input. A checkbox,
   * radio group, switch or native select has no read-only mode in HTML, so `disabled` is the honest fallback
   * for those (`readonlyFallsBackToDisabled`).
   */
  readOnly?: true;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
}

/**
 * Doc 202 rule 50: whether this subtree is being shown read-only. It travels through JSONForms' `config` prop
 * — the channel `hideRequiredAsterisk` already uses — so a whole page turns it on without any authored uischema
 * saying so, and nothing an author wrote can accidentally set it.
 */
export const isReadonly = (config: unknown): boolean =>
  typeof config === 'object' &&
  config !== null &&
  (config as { readonly?: unknown }).readonly === true;

/** The label's id, for an input named by `aria-labelledby` rather than `htmlFor` (doc 188 rule 8). */
export interface ControlLabelIds {
  labelId: string | undefined;
}

interface ControlFieldProps {
  readonly control: ControlProps;
  /** A text control's sanitised `maxLength` (rule 18) — shows the `<n>/<max>` counter (rule 18b). */
  readonly maxLength?: number | undefined;
  /**
   * Doc 202 rule 50: set by a control whose input has no HTML `readOnly` — a Combobox, a RadioGroup — so
   * read-only falls back to `disabled`. Without it the flag would be spread onto a component that does not
   * take it, and React would warn about an unknown attribute on whatever DOM node it reached.
   */
  readonly noReadOnly?: boolean;
  readonly children: (input: ControlInputProps, ids: ControlLabelIds) => ReactNode;
}

/**
 * The ids of whichever label, counter, description and error render, and the input props pointing at them. The
 * counter is described first, so the count is read on focus before the description and errors (rule 18b).
 */
export function controlWiring(
  { id, label, description, errors, enabled, config }: ControlProps,
  hasCounter: boolean,
  /**
   * Doc 202 rule 50: `false` for a control with no HTML read-only mode — a checkbox, radio group, switch or
   * native select — which falls back to `disabled` so it cannot be changed either way.
   */
  readonlyFallsBackToDisabled = false,
) {
  const inputId = `${id}-input`;
  const ids = {
    label: label.trim() ? `${inputId}-label` : undefined,
    counter: hasCounter ? `${inputId}-counter` : undefined,
    description: description?.trim() ? `${inputId}-description` : undefined,
    error: errors ? `${inputId}-error` : undefined,
  };
  const describedBy = [ids.counter, ids.description, ids.error].filter(Boolean).join(' ');
  const readonly = isReadonly(config);
  const input: ControlInputProps = {
    id: inputId,
    // TRAP: JSONForms itself reads `config.readonly` and reports `enabled: false` for it, so `!enabled` is
    // ALWAYS true in a read-only subtree — taking it here would mark every field disabled as well as read-only,
    // and the first build did exactly that (both attributes on one input). In a read-only subtree `disabled` is
    // therefore decided ONLY by whether this control has an HTML read-only mode.
    disabled: readonly ? readonlyFallsBackToDisabled : !enabled,
    ...(readonly && !readonlyFallsBackToDisabled ? { readOnly: true } : {}),
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    ...(ids.error ? { 'aria-invalid': true } : {}),
  };
  return { ids, input };
}

/**
 * Rule 18b: `<n>/<max>` on its own right-aligned line under the input — muted, or destructive once the value is
 * longer than max (only data set in code can be, since the input's `maxlength` caps typing).
 */
function CharacterCounter({ id, length, max }: { id: string; length: number; max: number }) {
  const tone = length > max ? 'text-destructive' : 'text-muted-foreground';
  return (
    <p
      id={id}
      data-slot="control-field-counter"
      className={`text-right text-xs tabular-nums ${tone}`}
    >
      {length}/{max}
    </p>
  );
}

/**
 * The chrome shared by every renderers/ui control (doc 182 rules 12-14): a `@repo/ui` `Field` with
 * the label, the input, the character counter, the schema description and the validation errors, in that order.
 *
 * The input is a render prop so this component owns the ids — the label's `htmlFor`, and the
 * `aria-describedby` / `aria-invalid` that point at whichever counter, description and error actually
 * rendered. Hidden controls render nothing; an empty label (uischema `label: false`) renders no
 * `<label>`. A `maxLength` adds the `<n>/<max>` counter under the input (rule 18b).
 *
 * `options.orientation: 'horizontal'` (rule 13b) lays the field out label-left, input-right instead: the
 * label, description and errors stack in a `FieldContent` beside a narrow input box, which also holds the
 * counter. The Form Studio inspector uses it for number fields (doc 187 rule 9b).
 */
export function ControlField({ control, maxLength, noReadOnly, children }: ControlFieldProps) {
  const { data, label, required, description, errors, enabled, visible, config, uischema } =
    control;
  if (!visible) return null;
  // Rule 50: `data-disabled` dims the whole Field, and JSONForms reports `enabled: false` for a read-only
  // subtree — so the flag is read through `dimmed`, which is false when the field is merely read-only. The
  // point of read-only is that the answers stay legible.
  const dimmed = !enabled && !isReadonly(config);

  const { ids, input } = controlWiring(control, maxLength !== undefined, noReadOnly === true);
  const labelIds: ControlLabelIds = { labelId: ids.label };
  const fieldLabel = ids.label ? (
    <FieldLabel id={ids.label} htmlFor={input.id}>
      {computeLabel(label, required === true, config?.hideRequiredAsterisk === true)}
    </FieldLabel>
  ) : null;
  const length = typeof data === 'string' ? data.length : 0;
  const counter = ids.counter && maxLength !== undefined && (
    <CharacterCounter id={ids.counter} length={length} max={maxLength} />
  );
  const fieldDescription = ids.description ? (
    <FieldDescription id={ids.description}>{description}</FieldDescription>
  ) : null;
  const fieldError = ids.error ? <FieldError id={ids.error}>{errors}</FieldError> : null;

  if (uischema.options?.['orientation'] === 'horizontal') {
    return (
      <Field orientation="horizontal" data-disabled={dimmed ? true : undefined}>
        <FieldContent>
          {fieldLabel}
          {fieldDescription}
          {fieldError}
        </FieldContent>
        <div data-slot="control-field-input" className="w-24 shrink-0">
          {children(input, labelIds)}
          {counter}
        </div>
      </Field>
    );
  }

  return (
    <Field data-disabled={dimmed ? true : undefined}>
      {fieldLabel}
      {children(input, labelIds)}
      {counter}
      {fieldDescription}
      {fieldError}
    </Field>
  );
}
