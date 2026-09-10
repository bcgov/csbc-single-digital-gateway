import { computeLabel, type ControlProps } from '@jsonforms/core';
import { Field, FieldDescription, FieldError, FieldLabel } from '@repo/ui/field';
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
 */
export function ControlField({ control, children }: ControlFieldProps) {
  const { id, label, required, description, errors, enabled, visible, config } = control;
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

  return (
    <Field data-disabled={enabled ? undefined : true}>
      {label.trim() ? (
        <FieldLabel htmlFor={inputId}>
          {computeLabel(label, required === true, hideRequiredAsterisk)}
        </FieldLabel>
      ) : null}
      {children(input)}
      {descriptionId ? <FieldDescription id={descriptionId}>{description}</FieldDescription> : null}
      {errorId ? <FieldError id={errorId}>{errors}</FieldError> : null}
    </Field>
  );
}
