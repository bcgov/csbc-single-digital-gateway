import { and, rankWith, schemaMatches, uiTypeIs, type ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { useMemo } from 'react';
import { CheckboxGroupChoice } from './checkbox-group-choice';
import { ChoiceField, type ChoiceWiring } from './choice-field';
import {
  chosenOptions,
  isMultiChoice,
  multiChoiceOptions,
  storedChoices,
  type ChoiceOption,
} from './choice-options';
import { MultiSelectChoice } from './multi-select-choice';

/**
 * Any Control over a multiple string choice, whatever its `options.component` (doc 245 rules 1-2): one entry, so the
 * Multi-select and Checkbox group can never tie, and single choice needs `type: 'string'`, so rank 1 never ties.
 */
export const multiChoiceControlTester = rankWith(
  1,
  and(
    uiTypeIs('Control'),
    schemaMatches((schema) => isMultiChoice(schema)),
  ),
);

/** What the Multi-select / Checkbox group receive: the options, the chosen ones, and the field's wiring. */
export interface MultiChoiceControlSlot extends ChoiceWiring {
  options: ChoiceOption[];
  /** The options the data chooses, in authoring order (rule 5). */
  chosen: ChoiceOption[];
  /** Writes the picked consts in authoring order, or `undefined` for none (rule 6). */
  onValuesChange: (values: readonly string[]) => void;
}

/** `'checkbox-group'` → Checkbox group; absent, `'multi-select'` or anything else → Multi-select (rule 2). */
export function multiChoiceComponent(uischema: unknown): 'multi-select' | 'checkbox-group' {
  const options = (uischema as { options?: { component?: unknown } } | undefined)?.options;
  return options?.component === 'checkbox-group' ? 'checkbox-group' : 'multi-select';
}

/** A multiple-choice control (doc 245 rules 5-8): the Multi-select or Checkbox group, in its field. */
export function MultiChoiceControl(props: ControlProps) {
  const { data, handleChange, path, uischema, schema } = props;
  const options = useMemo(() => multiChoiceOptions(schema) ?? [], [schema]);
  const component = multiChoiceComponent(uischema);
  const chosen = chosenOptions(options, data);
  const onValuesChange = (values: readonly string[]) =>
    handleChange(path, storedChoices(options, values));
  return (
    <ChoiceField props={props} component={component}>
      {(wiring) => {
        const slot: MultiChoiceControlSlot = { ...wiring, options, chosen, onValuesChange };
        return component === 'checkbox-group' ? (
          <CheckboxGroupChoice {...slot} />
        ) : (
          <MultiSelectChoice {...slot} />
        );
      }}
    </ChoiceField>
  );
}

export const multiChoiceControlEntry = {
  tester: multiChoiceControlTester,
  renderer: withJsonFormsControlProps(MultiChoiceControl),
};
