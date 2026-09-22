import { and, optionIs, rankWith, type ControlProps, type RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Field, FieldLabel } from '@repo/ui/field';
import { RadioGroup, RadioGroupItem } from '@repo/ui/radio-group';
import { useMemo } from 'react';
import { choiceOptions, isChoiceControl } from './choice-control';
import { ControlField } from './control-field';
import { plainChoice } from './control-plain-value';

/** A choice control with `options.component: 'radio-group'` — outranks `comboboxTester` (doc 188 rule 4). */
export const radioGroupTester: RankedTester = rankWith(
  4,
  and(isChoiceControl, optionIs('component', 'radio-group')),
);

/**
 * Renders a choice `Control` as a `@repo/ui` `RadioGroup`, one radio per option (doc 188 rules 14-16). The group is
 * named by the control label (`aria-labelledby` — a group is not a labelable element); each radio is named by its
 * option's `FieldLabel`, which Base UI points at the radio's hidden input, so clicking a title selects it.
 * Selecting writes the option's const; data that is not an option checks nothing.
 */
function RadioGroupControl(props: ControlProps) {
  const { data, path, schema, handleChange } = props;
  const options = useMemo(() => choiceOptions(schema) ?? [], [schema]);
  const checked = options.find((option) => option.value === data)?.value ?? null;

  return (
    // Doc 202 rule 50: a RadioGroup has no HTML read-only, so read-only falls back to disabled.
    // Doc 211 rule 11: the same label the Combobox shows — one formatter, so the two cannot disagree.
    <ControlField control={props} noReadOnly plainValue={plainChoice(schema, data)}>
      {({ id, disabled, ...described }, { labelId }) => (
        <RadioGroup
          id={id}
          {...described}
          {...(labelId ? { 'aria-labelledby': labelId } : {})}
          value={checked}
          disabled={disabled}
          onValueChange={(value) => handleChange(path, value)}
        >
          {options.map((option, index) => {
            const itemId = `${id}-option-${index}`;
            return (
              <Field key={String(option.value)} orientation="horizontal">
                <RadioGroupItem id={itemId} value={option.value} />
                <FieldLabel htmlFor={itemId}>{option.label}</FieldLabel>
              </Field>
            );
          })}
        </RadioGroup>
      )}
    </ControlField>
  );
}

export const RadioGroupControlRenderer = withJsonFormsControlProps(RadioGroupControl);
