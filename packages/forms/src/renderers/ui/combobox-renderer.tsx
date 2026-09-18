import { rankWith, type ControlProps, type RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@repo/ui/combobox';
import { useMemo } from 'react';
import { choiceOptions, isChoiceControl, type ChoiceOption } from './choice-control';
import { ControlField } from './control-field';
import { choiceInputProps } from './control-options';

/**
 * Any choice control — `options.component` absent, `'combobox'` or unrecognised. Rank 3 outranks Input, Textarea
 * and NumberInput, so a choice schema never renders a plain field (doc 188 rules 4-5).
 */
export const comboboxTester: RankedTester = rankWith(3, isChoiceControl);

// `choiceOptions` builds fresh option objects, so items are matched by value, never by identity.
const isSameOption = (item: ChoiceOption, value: ChoiceOption) => item.value === value.value;
const optionLabel = (option: ChoiceOption) => option.label;

/**
 * Renders a choice `Control` as a filterable `@repo/ui` `Combobox` of its options (doc 188 rules 9-13). Picking
 * writes the option's const, clearing writes `undefined`, and data that is not an option shows an empty input.
 */
function ComboboxControl(props: ControlProps) {
  const { data, path, schema, uischema, enabled, handleChange } = props;
  const options = useMemo(() => choiceOptions(schema) ?? [], [schema]);
  const selected = options.find((option) => option.value === data) ?? null;

  return (
    // Doc 202 rule 50: a Combobox has no HTML read-only, so read-only falls back to disabled.
    <ControlField control={props} noReadOnly>
      {(input) => (
        <Combobox
          items={options}
          value={selected}
          isItemEqualToValue={isSameOption}
          itemToStringLabel={optionLabel}
          autoHighlight
          disabled={!enabled}
          onValueChange={(next) => handleChange(path, next?.value)}
        >
          <ComboboxInput
            {...input}
            {...choiceInputProps(uischema.options)}
            showClear
            clearLabel="Clear"
          />
          <ComboboxContent>
            <ComboboxEmpty>No options found.</ComboboxEmpty>
            <ComboboxList>
              {(option: ChoiceOption) => (
                <ComboboxItem key={String(option.value)} value={option}>
                  {option.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      )}
    </ControlField>
  );
}

export const ComboboxControlRenderer = withJsonFormsControlProps(ComboboxControl);
