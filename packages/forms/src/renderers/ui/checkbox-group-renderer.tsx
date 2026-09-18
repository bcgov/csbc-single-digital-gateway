import { and, optionIs, rankWith, type ControlProps, type RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Checkbox } from '@repo/ui/checkbox';
import { CheckboxGroup } from '@repo/ui/checkbox-group';
import { Field, FieldDescription, FieldLabel } from '@repo/ui/field';
import { useMemo } from 'react';
import type { ChoiceOption } from './choice-control';
import { ControlField } from './control-field';
import {
  chosenOptions,
  isMultiChoiceControl,
  multiChoiceOptions,
  storedChoices,
} from './multi-choice-control';

/** A multi-choice control with `options.component: 'checkbox-group'` — outranks the combobox (doc 205 rule 6). */
export const checkboxGroupTester: RankedTester = rankWith(
  6,
  and(isMultiChoiceControl, optionIs('component', 'checkbox-group')),
);

/**
 * Rule 24: Base UI's CheckboxGroup value is `string[]`, so a numeric-const schema is converted at THIS
 * boundary and mapped back on change. Storing `"1"` where the schema says `1` fails Ajv with a message about
 * allowed values rather than about types, which is a long way from the cause.
 */
const keyOf = (option: ChoiceOption) => String(option.value);

/**
 * Renders a multi-choice `Control` as a `@repo/ui` `CheckboxGroup`, one checkbox per option (doc 205 rules
 * 18-21). The group is named by the control label (`aria-labelledby` — a group is not a labelable element) and
 * carries the invalid state itself; each box is named by its own `FieldLabel`. Ticking writes the chosen consts
 * in authoring order; unticking the last one writes `undefined`, never `[]`.
 */
function CheckboxGroupControl(props: ControlProps) {
  const { data, path, schema, errors, handleChange } = props;
  const options = useMemo(() => multiChoiceOptions(schema) ?? [], [schema]);
  const chosen = chosenOptions(options, data);

  return (
    // Doc 202 rule 50: a checkbox group has no HTML read-only, so read-only falls back to disabled.
    <ControlField control={props} noReadOnly>
      {({ id, disabled, ...described }, { labelId }) => (
        <CheckboxGroup
          id={id}
          {...described}
          {...(labelId ? { 'aria-labelledby': labelId } : {})}
          // Rule 20: the group carries invalid, never its items — the set being under-filled is not the fault
          // of any one box, and this is the required a11y rule the old multi-enum control never wired.
          {...(errors ? { invalid: true } : {})}
          value={chosen.map(keyOf)}
          // Base UI propagates `disabled` to every item, so it is set once here.
          disabled={disabled}
          onValueChange={(next: string[]) =>
            handleChange(
              path,
              storedChoices(
                options,
                options.filter((option) => next.includes(keyOf(option))),
              ),
            )
          }
        >
          {options.map((option) => {
            const itemId = `${id}-option-${keyOf(option)}`;
            return (
              <Field key={keyOf(option)} orientation="horizontal">
                <Checkbox id={itemId} value={keyOf(option)} />
                <FieldLabel htmlFor={itemId}>
                  {option.label}
                  {/* Rule 18: the option's own help text, under its label. */}
                  {option.description === undefined ? null : (
                    <FieldDescription>{option.description}</FieldDescription>
                  )}
                </FieldLabel>
              </Field>
            );
          })}
        </CheckboxGroup>
      )}
    </ControlField>
  );
}

export const CheckboxGroupControlRenderer = withJsonFormsControlProps(CheckboxGroupControl);
