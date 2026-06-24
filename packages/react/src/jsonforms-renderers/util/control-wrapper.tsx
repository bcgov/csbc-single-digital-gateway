import type { ReactNode } from 'react';
import { Field, FieldDescription, FieldError, FieldLabel } from '@repo/ui/field';

export interface ControlWrapperProps {
  /** The control id — used for the input element and the label's `htmlFor`. */
  id: string;
  /** Visible label text. JSONForms passes `false` when the label is suppressed. */
  label?: string | false | undefined;
  required?: boolean | undefined;
  description?: string | undefined;
  /** JSONForms joins validation messages into a single string ('' when valid). */
  errors?: string;
  /** Horizontal places the label after the control (checkbox/switch); vertical stacks. */
  orientation?: 'vertical' | 'horizontal';
  /**
   * The element the label points at. Defaults to `id`; pass `false` for grouped controls
   * (radio group, multi-enum) where no single focusable element owns the label.
   */
  labelFor?: string | false;
  children: ReactNode;
}

/**
 * Wraps a control in the @repo/ui Field primitives so every renderer surfaces its label,
 * optional description (from `schema.description`) and JSONForms/Ajv validation messages
 * consistently. Validation flows one-way: the `errors` string drives both `FieldError`
 * and the control's `aria-invalid`.
 */
export function ControlWrapper({
  id,
  label,
  required,
  description,
  errors,
  orientation = 'vertical',
  labelFor,
  children,
}: ControlWrapperProps) {
  const errorList = errors
    ? errors
        .split('\n')
        .filter(Boolean)
        .map((message) => ({ message }))
    : [];
  const htmlFor = labelFor === false ? undefined : (labelFor ?? id);
  const labelNode =
    label === false || label === undefined || label === '' ? null : (
      <FieldLabel htmlFor={htmlFor}>
        {label}
        {required ? ' *' : ''}
      </FieldLabel>
    );

  return (
    <Field orientation={orientation} data-invalid={errorList.length > 0 ? true : undefined}>
      {orientation === 'horizontal' ? (
        <>
          {children}
          {labelNode}
        </>
      ) : (
        <>
          {labelNode}
          {children}
        </>
      )}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError errors={errorList} />
    </Field>
  );
}
