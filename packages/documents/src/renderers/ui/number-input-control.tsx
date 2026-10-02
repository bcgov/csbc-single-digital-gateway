import { and, rankWith, schemaMatches, uiTypeIs, type ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Field, FieldDescription, FieldLabel } from '@repo/ui/field';
import { NumberInput } from '@repo/ui/number-input';
import { controlDescription } from './control-description';
import { isPlainNumber, numberOptions } from './number-options';

/** A Control over a plain number or integer (doc 248 rules 1-2) — never a numeric choice, so rank 1 never ties. */
export const numberInputControlTester = rankWith(
  1,
  and(
    uiTypeIs('Control'),
    schemaMatches((schema) => isPlainNumber(schema)),
  ),
);

/**
 * A number control (doc 248 rules 3-10): label (with a required marker), description under it, then `@repo/ui`'s
 * NumberInput. It writes the number Base UI parses, and `undefined` — never `null` — when emptied.
 */
export function NumberInputControl(props: ControlProps) {
  const { data, handleChange, path, id, label, required, uischema, schema, enabled, visible } =
    props;
  if (!visible) return null;
  const description = controlDescription(uischema, schema);
  const descriptionId = `${id}-description`;
  return (
    <Field data-slot="number-field">
      {label !== '' && (
        <FieldLabel htmlFor={id}>
          {label}
          {required === true && <span aria-hidden="true"> *</span>}
        </FieldLabel>
      )}
      {description !== undefined && (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      )}
      <NumberInput
        id={id}
        {...numberOptions(uischema, schema)}
        value={typeof data === 'number' && Number.isFinite(data) ? data : null}
        disabled={!enabled}
        required={required === true}
        onValueChange={(value) => handleChange(path, value ?? undefined)}
        {...(description !== undefined && { 'aria-describedby': descriptionId })}
        {...(required === true && { 'aria-required': true })}
        {...(label === '' && { 'aria-label': path.split('.').at(-1) ?? path })}
      />
    </Field>
  );
}

export const numberInputControlEntry = {
  tester: numberInputControlTester,
  renderer: withJsonFormsControlProps(NumberInputControl),
};
