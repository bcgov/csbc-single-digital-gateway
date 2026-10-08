import { and, schemaMatches, uiTypeIs, type ControlProps } from '@jsonforms/core';
import { Field, FieldDescription, FieldLabel } from '@repo/ui/field';
import type { ReactNode } from 'react';
import { controlDescription } from './control-description';
import { useHiddenLabel } from './control-label';
import { isPlainString, stringOptions, type StringOptions } from './string-options';

/** A Control over a plain string (doc 239 rule 2). */
export const isPlainStringControl = and(
  uiTypeIs('Control'),
  schemaMatches((schema) => isPlainString(schema)),
);

export type TextComponent = 'input' | 'textarea';

/** What the Input / Textarea receive: the value, its wiring and the sanitised options. */
export interface TextControlSlot extends Omit<StringOptions, 'rows'> {
  id: string;
  value: string;
  disabled: boolean;
  required: boolean;
  rows: number;
  onValueChange: (text: string) => void;
  'aria-describedby'?: string;
  'aria-required'?: 'true';
  'aria-label'?: string;
}

/**
 * A string control (doc 239 rules 3-11): label (with a required marker), description under it, the control, then a
 * right-aligned `n/max` counter when a `maxLength` is set. An emptied field writes `undefined`, never `''` (rule 4).
 */
export function TextField({
  props,
  component,
  renderControl,
}: {
  props: ControlProps;
  component: TextComponent;
  renderControl: (slot: TextControlSlot) => ReactNode;
}) {
  const { data, handleChange, path, id, label, required, uischema, schema, enabled, visible } =
    props;
  const hiddenLabel = useHiddenLabel(uischema);
  if (!visible) return null;
  const value = typeof data === 'string' ? data : '';
  const { rows, ...limits } = stringOptions(uischema, schema);
  const description = controlDescription(uischema, schema);
  const descriptionId = `${id}-description`;
  const counterId = `${id}-count`;
  const describedBy = [
    ...(limits.maxLength !== undefined ? [counterId] : []),
    ...(description !== undefined ? [descriptionId] : []),
  ].join(' ');
  const control = renderControl({
    id,
    value,
    disabled: !enabled,
    required: required === true,
    rows,
    ...limits,
    onValueChange: (text) => handleChange(path, text === '' ? undefined : text),
    ...(describedBy !== '' && { 'aria-describedby': describedBy }),
    ...(required === true && { 'aria-required': 'true' as const }),
    ...(label === '' && { 'aria-label': path.split('.').at(-1) ?? path }),
  });
  return (
    <Field data-slot="text-field" data-component={component}>
      {label !== '' && (
        <FieldLabel htmlFor={id} {...hiddenLabel.labelProps}>
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
      {limits.maxLength !== undefined && (
        <p
          id={counterId}
          data-slot="character-count"
          className="text-right text-xs text-muted-foreground"
        >
          {value.length}/{limits.maxLength}
        </p>
      )}
    </Field>
  );
}
