import { and, rankWith, schemaMatches, uiTypeIs, type ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Field, FieldDescription, FieldLabel } from '@repo/ui/field';
import { useMemo, type ReactNode } from 'react';
import { choiceOptions, isSingleChoice, type ChoiceOption } from './choice-options';
import { controlDescription } from './control-description';
import { RadioGroupChoice } from './radio-group-choice';
import { SelectChoice } from './select-choice';

/**
 * Any Control over a single string choice, whatever its `options.component` (doc 244 rules 1-2): one entry, so the
 * Select and Radio group can never tie. Plain strings exclude `oneOf` (doc 239 rule 2), so rank 1 never ties either.
 */
export const singleChoiceControlTester = rankWith(
  1,
  and(
    uiTypeIs('Control'),
    schemaMatches((schema) => isSingleChoice(schema)),
  ),
);

export type ChoiceComponent = 'select' | 'radio-group';

/** What the Select / Radio group receive: the options, the selected value, and the control's wiring. */
export interface ChoiceControlSlot {
  id: string;
  options: ChoiceOption[];
  /** The option whose value is the data, else `null` (rule 6). */
  selected: ChoiceOption | null;
  disabled: boolean;
  required: boolean;
  /** Writes a const, or `undefined` for a cleared Select (rule 7). */
  onValueChange: (value: string | undefined) => void;
  /** The `FieldLabel`'s id, when there is a label — a radio group is named through it (rule 15). */
  labelId?: string;
  'aria-describedby'?: string;
  'aria-required'?: 'true';
  'aria-label'?: string;
}

/** `'radio-group'` → Radio group; absent, `'select'` or anything else → Select (rule 2). */
export function choiceComponent(uischema: unknown): ChoiceComponent {
  const options = (uischema as { options?: { component?: unknown } } | undefined)?.options;
  return options?.component === 'radio-group' ? 'radio-group' : 'select';
}

/**
 * A single-choice control (doc 244 rules 6-11): a vertical Field of label (with a required marker), description,
 * then the Select or Radio group for `options.component`.
 */
export function SingleChoiceControl(props: ControlProps) {
  const { data, handleChange, path, id, label, required, uischema, schema, enabled, visible } =
    props;
  const options = useMemo(() => choiceOptions(schema) ?? [], [schema]);
  if (!visible) return null;
  const component = choiceComponent(uischema);
  const description = controlDescription(uischema, schema);
  const descriptionId = `${id}-description`;
  const labelId = `${id}-label`;
  const slot: ChoiceControlSlot = {
    id,
    options,
    selected: options.find((option) => option.value === data) ?? null,
    disabled: !enabled,
    required: required === true,
    onValueChange: (value) => handleChange(path, value),
    ...(label !== '' && { labelId }),
    ...(description !== undefined && { 'aria-describedby': descriptionId }),
    ...(required === true && { 'aria-required': 'true' as const }),
    ...(label === '' && { 'aria-label': path.split('.').at(-1) ?? path }),
  };
  const control: ReactNode =
    component === 'radio-group' ? <RadioGroupChoice {...slot} /> : <SelectChoice {...slot} />;
  return (
    <Field data-slot="choice-field" data-component={component}>
      {label !== '' && (
        <FieldLabel id={labelId} htmlFor={id}>
          {label}
          {required === true && <span aria-hidden="true"> *</span>}
        </FieldLabel>
      )}
      {description !== undefined && (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      )}
      {control}
    </Field>
  );
}

export const singleChoiceControlEntry = {
  tester: singleChoiceControlTester,
  renderer: withJsonFormsControlProps(SingleChoiceControl),
};
