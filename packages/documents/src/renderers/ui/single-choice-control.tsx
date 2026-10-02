import { and, rankWith, schemaMatches, uiTypeIs, type ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { useMemo } from 'react';
import { ChoiceField, type ChoiceWiring } from './choice-field';
import { choiceOptions, isSingleChoice, type ChoiceOption } from './choice-options';
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

/** What the Select / Radio group receive: the options, the selected one, and the field's wiring. */
export interface ChoiceControlSlot extends ChoiceWiring {
  options: ChoiceOption[];
  /** The option whose value is the data, else `null` (rule 6). */
  selected: ChoiceOption | null;
  /** Writes a const, or `undefined` for a cleared Select (rule 7). */
  onValueChange: (value: string | undefined) => void;
}

/** `'radio-group'` → Radio group; absent, `'select'` or anything else → Select (rule 2). */
export function choiceComponent(uischema: unknown): 'select' | 'radio-group' {
  const options = (uischema as { options?: { component?: unknown } } | undefined)?.options;
  return options?.component === 'radio-group' ? 'radio-group' : 'select';
}

/** A single-choice control (doc 244 rules 6-11): the Select or Radio group for `options.component`, in its field. */
export function SingleChoiceControl(props: ControlProps) {
  const { data, handleChange, path, uischema, schema } = props;
  const options = useMemo(() => choiceOptions(schema) ?? [], [schema]);
  const component = choiceComponent(uischema);
  const selected = options.find((option) => option.value === data) ?? null;
  const onValueChange = (value: string | undefined) => handleChange(path, value);
  return (
    <ChoiceField props={props} component={component}>
      {(wiring) => {
        const slot: ChoiceControlSlot = { ...wiring, options, selected, onValueChange };
        return component === 'radio-group' ? (
          <RadioGroupChoice {...slot} />
        ) : (
          <SelectChoice {...slot} />
        );
      }}
    </ChoiceField>
  );
}

export const singleChoiceControlEntry = {
  tester: singleChoiceControlTester,
  renderer: withJsonFormsControlProps(SingleChoiceControl),
};
