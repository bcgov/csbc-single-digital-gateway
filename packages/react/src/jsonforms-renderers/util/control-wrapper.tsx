import type { ReactNode } from 'react';
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from '@repo/ui/field';

export interface ControlWrapperProps {
  /** The control id — used for the input element and the label's `htmlFor`. */
  id: string;
  /** Visible label text. JSONForms passes `false` when the label is suppressed. */
  label?: string | false | undefined;
  required?: boolean | undefined;
  description?: string | undefined;
  /** JSONForms joins validation messages into a single string ('' when valid). */
  errors?: string;
  /** Horizontal places the label beside the control (checkbox/switch); vertical stacks. */
  orientation?: 'vertical' | 'horizontal';
  /**
   * Horizontal only: which side the control sits on. `'left'` (default) = control then label
   * (checkbox); `'right'` = label then control, control pushed to the far edge (switch/toggle).
   */
  controlPosition?: 'left' | 'right';
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
/**
 * Deterministic id convention for a control's description/error text, so controls can wire their
 * real input's `aria-describedby` to the same ids `ControlWrapper` assigns below — screen readers
 * only reliably announce a description/error when it's linked via `aria-describedby` on the
 * focusable element itself, not merely rendered as a visual sibling.
 */
export function describedByIds(
  id: string,
  opts: { description?: string | undefined; errors?: string | undefined },
): string | undefined {
  const ids = [
    opts.description ? `${id}-description` : null,
    opts.errors ? `${id}-error` : null,
  ].filter((value): value is string => value !== null);
  return ids.length ? ids.join(' ') : undefined;
}

export function ControlWrapper({
  id,
  label,
  required,
  description,
  errors,
  orientation = 'vertical',
  controlPosition = 'left',
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
  const renderLabel = (extra?: string) => {
    return label === false || label === undefined || label === '' ? null : (
      <FieldLabel id={`${id}-label`} htmlFor={htmlFor} {...(extra ? { className: extra } : {})}>
        {label}
        {required ? ' *' : ''}
      </FieldLabel>
    );
  };
  const labelNode = renderLabel();

  const descriptionNode = description ? (
    <FieldDescription id={`${id}-description`}>{description}</FieldDescription>
  ) : null;
  const errorNode = <FieldError id={`${id}-error`} errors={errorList} />;
  const invalid = errorList.length > 0 ? true : undefined;

  // Horizontal controls stack the label + help text in a FieldContent column (flex-1) so the description
  // wraps to the next line beneath the label — not inline beside it. `controlPosition` decides the side:
  // 'left' → control then column (checkbox); 'right' → column then control, pushing it to the far edge
  // (switch/toggle).
  if (orientation === 'horizontal') {
    // `leading-normal` gives the checkbox/toggle row a bit more line-height than the default snug label.
    const content = (
      <FieldContent className="gap-1 leading-normal">
        {renderLabel('leading-normal')}
        {descriptionNode}
        {errorNode}
      </FieldContent>
    );
    return (
      <Field orientation="horizontal" data-invalid={invalid}>
        {controlPosition === 'right' ? (
          <>
            {content}
            {children}
          </>
        ) : (
          <>
            {children}
            {content}
          </>
        )}
      </Field>
    );
  }

  return (
    <Field orientation={orientation} data-invalid={invalid}>
      {labelNode}
      {children}
      {descriptionNode}
      {errorNode}
    </Field>
  );
}
