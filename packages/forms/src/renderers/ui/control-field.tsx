import { computeLabel, type ControlProps } from '@jsonforms/core';
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from '@repo/ui/field';
import type { ReactNode } from 'react';

/** What `ControlField` hands its input: the id the label points at, plus state and aria wiring. */
export interface ControlInputProps {
  id: string;
  disabled: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
}

interface ControlFieldProps {
  readonly control: ControlProps;
  readonly children: (input: ControlInputProps) => ReactNode;
}

/**
 * The chrome shared by every renderers/ui control (doc 182 rules 12-14): a `@repo/ui` `Field` with
 * the label, the input, the schema description and the validation errors, in that order.
 *
 * The input is a render prop so this component owns the ids — the label's `htmlFor`, and the
 * `aria-describedby` / `aria-invalid` that point at whichever description and error actually
 * rendered. Hidden controls render nothing; an empty label (uischema `label: false`) renders no
 * `<label>`.
 *
 * `options.orientation: 'horizontal'` (rule 13b) lays the field out label-left, input-right instead: the
 * label, description and errors stack in a `FieldContent` beside a narrow input box. The Form Studio
 * inspector uses it for number fields (doc 187 rule 9b).
 */
export function ControlField({ control, children }: ControlFieldProps) {
  const { id, label, required, description, errors, enabled, visible, config, uischema } = control;
  if (!visible) return null;

  const inputId = `${id}-input`;
  const descriptionId = description?.trim() ? `${inputId}-description` : undefined;
  const errorId = errors ? `${inputId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ');
  const hideRequiredAsterisk = config?.hideRequiredAsterisk === true;

  const input: ControlInputProps = {
    id: inputId,
    disabled: !enabled,
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    ...(errorId ? { 'aria-invalid': true } : {}),
  };
  const fieldLabel = label.trim() ? (
    <FieldLabel htmlFor={inputId}>
      {computeLabel(label, required === true, hideRequiredAsterisk)}
    </FieldLabel>
  ) : null;
  const fieldDescription = descriptionId ? (
    <FieldDescription id={descriptionId}>{description}</FieldDescription>
  ) : null;
  const fieldError = errorId ? <FieldError id={errorId}>{errors}</FieldError> : null;

  if (uischema.options?.['orientation'] === 'horizontal') {
    return (
      <Field orientation="horizontal" data-disabled={enabled ? undefined : true}>
        <FieldContent>
          {fieldLabel}
          {fieldDescription}
          {fieldError}
        </FieldContent>
        <div data-slot="control-field-input" className="w-24 shrink-0">
          {children(input)}
        </div>
      </Field>
    );
  }

  return (
    <Field data-disabled={enabled ? undefined : true}>
      {fieldLabel}
      {children(input)}
      {fieldDescription}
      {fieldError}
    </Field>
  );
}
