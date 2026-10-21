import { and, rankWith, schemaMatches, uiTypeIs, type ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Field, FieldDescription } from '@repo/ui/field';
import { NumberInput, type NumberInputProps } from '@repo/ui/number-input';
import type { ReactNode } from 'react';
import { controlDescription } from './control-description';
import { ControlLabel, useHiddenLabel } from './control-label';
import { isPlainNumber, numberOptions } from './number-options';

/** A Control over a plain number or integer (doc 248 rules 1-2) — never a numeric choice, so rank 1 never ties. */
export const numberInputControlTester = rankWith(
  1,
  and(
    uiTypeIs('Control'),
    schemaMatches((schema) => isPlainNumber(schema)),
  ),
);

/** What a number field hands its input: the configured `NumberInput` props, and the ids to describe it by. */
export interface NumberInputSlot {
  input: NumberInputProps;
  describedBy: string[];
}

/**
 * A number field's shell (doc 248 rules 3-10, shared by Money, doc 286 rule 4): label (with a required marker),
 * description under it, then the input `renderInput` draws. The input writes the number Base UI parses, and
 * `undefined` — never `null` — when emptied.
 */
export function NumberControlField({
  props,
  renderInput = ({ input }) => <NumberInput {...input} />,
}: {
  props: ControlProps;
  renderInput?: (slot: NumberInputSlot) => ReactNode;
}) {
  const { data, handleChange, path, id, label, required, uischema, schema, enabled, visible } =
    props;
  const hiddenLabel = useHiddenLabel(uischema);
  if (!visible) return null;
  const description = controlDescription(uischema, schema);
  const descriptionId = `${id}-description`;
  const describedBy = description === undefined ? [] : [descriptionId];
  const input: NumberInputProps = {
    id,
    ...numberOptions(uischema, schema),
    value: typeof data === 'number' && Number.isFinite(data) ? data : null,
    disabled: !enabled,
    required: required === true,
    onValueChange: (value) => handleChange(path, value ?? undefined),
    ...(describedBy.length > 0 && { 'aria-describedby': describedBy.join(' ') }),
    ...(required === true && { 'aria-required': true }),
    ...(label === '' && { 'aria-label': path.split('.').at(-1) ?? path }),
  };
  return (
    <Field data-slot="number-field">
      {label !== '' && (
        <ControlLabel
          label={label}
          required={required === true}
          hiddenLabel={hiddenLabel}
          htmlFor={id}
        />
      )}
      {description !== undefined && (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      )}
      {renderInput({ input, describedBy })}
    </Field>
  );
}

/** A number control (doc 248): the shell around `@repo/ui`'s NumberInput. */
export function NumberInputControl(props: ControlProps) {
  return <NumberControlField props={props} />;
}

export const numberInputControlEntry = {
  tester: numberInputControlTester,
  renderer: withJsonFormsControlProps(NumberInputControl),
};
