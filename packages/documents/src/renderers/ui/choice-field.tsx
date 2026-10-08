import type { ControlProps } from '@jsonforms/core';
import { Field, FieldDescription, FieldLabel } from '@repo/ui/field';
import type { ReactNode } from 'react';
import { controlDescription } from './control-description';
import { useHiddenLabel } from './control-label';

export type ChoiceComponent = 'select' | 'radio-group' | 'multi-select' | 'checkbox-group';

/** What a choice control receives from its field: its id and the label / description / required wiring. */
export interface ChoiceWiring {
  id: string;
  disabled: boolean;
  required: boolean;
  /** The `FieldLabel`'s id, when there is a label — a group is named through it (doc 244 rule 15). */
  labelId?: string;
  'aria-describedby'?: string;
  'aria-required'?: 'true';
  'aria-label'?: string;
}

/**
 * A choice control's field (doc 244 rules 9-11, doc 245 rule 8): a vertical Field of label (with a required
 * marker), description, then the control `children` draws from its wiring. Renders nothing when hidden.
 */
export function ChoiceField({
  props,
  component,
  children,
}: {
  props: ControlProps;
  component: ChoiceComponent;
  children: (wiring: ChoiceWiring) => ReactNode;
}) {
  const { path, id, label, required, uischema, schema, enabled, visible } = props;
  const hiddenLabel = useHiddenLabel(uischema);
  if (!visible) return null;
  const description = controlDescription(uischema, schema);
  const descriptionId = `${id}-description`;
  const labelId = `${id}-label`;
  const control = children({
    id,
    disabled: !enabled,
    required: required === true,
    ...(label !== '' && { labelId }),
    ...(description !== undefined && { 'aria-describedby': descriptionId }),
    ...(required === true && { 'aria-required': 'true' as const }),
    ...(label === '' && { 'aria-label': path.split('.').at(-1) ?? path }),
  });
  return (
    <Field data-slot="choice-field" data-component={component}>
      {label !== '' && (
        <FieldLabel id={labelId} htmlFor={id} {...hiddenLabel.labelProps}>
          {label}
          {required === true && (
            <span aria-hidden="true" className="text-destructive">
              {' '}
              *
            </span>
          )}
          {hiddenLabel.marker}
        </FieldLabel>
      )}
      {description !== undefined && (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      )}
      {control}
    </Field>
  );
}
