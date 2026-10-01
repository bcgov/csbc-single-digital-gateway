import type { ControlProps } from '@jsonforms/core';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@repo/ui/field';
import type { MouseEvent, ReactNode } from 'react';
import { controlDescription } from './control-description';

/** Where a click already toggles natively (Base UI): the control, its hidden input, a label — never toggled again. */
const NATIVE_TOGGLE = '[data-slot="checkbox"],[data-slot="switch"],label,input';

export type BooleanComponent = 'checkbox' | 'switch';

/** What the Checkbox / Switch put in the row: the control, given its id, state and wiring. */
export interface BooleanControlSlot {
  id: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
  'aria-describedby'?: string;
  'aria-label'?: string;
}

/**
 * A boolean control's row (doc 237 rules 3-10): a horizontal `Field` that toggles from a click ANYWHERE on it — except
 * where the click already toggles natively, which would double-toggle — with the label and description beside the
 * control. `component` orders it: a checkbox before its text, a switch after.
 */
export function BooleanField({
  props,
  component,
  renderControl,
}: {
  props: ControlProps;
  component: BooleanComponent;
  renderControl: (slot: BooleanControlSlot) => ReactNode;
}) {
  const { data, handleChange, path, id, label, uischema, schema, enabled, visible } = props;
  if (!visible) return null;
  const checked = data === true;
  const description = controlDescription(uischema, schema);
  const descriptionId = `${id}-description`;
  const set = (next: boolean) => {
    if (enabled) handleChange(path, next);
  };
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest(NATIVE_TOGGLE) !== null) return;
    set(!checked);
  };
  const control = renderControl({
    id,
    checked,
    disabled: !enabled,
    onCheckedChange: set,
    ...(description !== undefined && { 'aria-describedby': descriptionId }),
    ...(label === '' && { 'aria-label': path.split('.').at(-1) ?? path }),
  });
  const text = (
    <FieldContent>
      {label !== '' && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      {description !== undefined && (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      )}
    </FieldContent>
  );
  return (
    <Field
      orientation="horizontal"
      data-slot="boolean-field"
      data-component={component}
      data-disabled={enabled ? undefined : 'true'}
      className={enabled ? 'cursor-pointer' : 'cursor-not-allowed'}
      onClick={onClick}
    >
      {component === 'checkbox' ? (
        <>
          {control}
          {text}
        </>
      ) : (
        <>
          {text}
          {control}
        </>
      )}
    </Field>
  );
}
