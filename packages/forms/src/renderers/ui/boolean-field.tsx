import { computeLabel, type ControlProps } from '@jsonforms/core';
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from '@repo/ui/field';
import type { MouseEvent, ReactNode } from 'react';
import { controlWiring, type ControlInputProps } from './control-field';

// Clicks here already toggle: the control itself, its hidden input, or a label (which forwards to the input).
const TOGGLES_NATIVELY = 'input, label, [role="checkbox"], [role="switch"]';

/** Doc 188 rule 20b: a click anywhere else on the field toggles its checkbox or switch. */
function toggleFromField(event: MouseEvent<HTMLDivElement>) {
  if (event.target instanceof Element && event.target.closest(TOGGLES_NATIVELY)) return;
  event.currentTarget.querySelector<HTMLElement>('[role="checkbox"], [role="switch"]')?.click();
}

/** What `BooleanField` hands its checkbox or switch: `ControlField`'s input props, named by the label. */
export type BooleanInputProps = ControlInputProps & { 'aria-labelledby'?: string };

interface BooleanFieldProps {
  readonly control: ControlProps;
  /** The control ahead of its label (Checkbox) or after it (Switch) — doc 188 rules 18-19. */
  readonly placement: 'start' | 'end';
  readonly children: (input: BooleanInputProps) => ReactNode;
}

/**
 * The chrome shared by the boolean controls (doc 188 rule 17): a horizontal `@repo/ui` `Field` holding the control
 * and a `FieldContent` of label, schema description and errors. Base UI's checkbox and switch are not labelable
 * elements, so the control is named by `aria-labelledby` as well as the label's `htmlFor`, and described by
 * whichever description and error rendered — the same ids `ControlField` uses. Hidden controls render nothing.
 */
export function BooleanField({ control, placement, children }: BooleanFieldProps) {
  const { label, required, description, errors, enabled, visible, config } = control;
  if (!visible) return null;

  const { ids, input } = controlWiring(control, false);
  const content = (
    <FieldContent>
      {ids.label ? (
        <FieldLabel id={ids.label} htmlFor={input.id}>
          {computeLabel(label, required === true, config?.hideRequiredAsterisk === true)}
        </FieldLabel>
      ) : null}
      {ids.description ? (
        <FieldDescription id={ids.description}>{description}</FieldDescription>
      ) : null}
      {ids.error ? <FieldError id={ids.error}>{errors}</FieldError> : null}
    </FieldContent>
  );
  const box = children({ ...input, ...(ids.label ? { 'aria-labelledby': ids.label } : {}) });

  return (
    // Keyboard users toggle through the focusable control itself; the field-wide click is a pointer convenience.
    <Field
      orientation="horizontal"
      data-disabled={enabled ? undefined : true}
      {...(enabled ? { className: 'cursor-pointer', onClick: toggleFromField } : {})}
    >
      {placement === 'start' ? box : content}
      {placement === 'start' ? content : box}
    </Field>
  );
}
