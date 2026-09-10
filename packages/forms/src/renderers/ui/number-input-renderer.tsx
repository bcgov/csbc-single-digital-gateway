import { isNumberControl, rankWith, type ControlProps, type RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { NumberInput } from '@repo/ui/number-input';
import { ControlField } from './control-field';
import { numberInputProps } from './control-options';

/**
 * Any `type: 'number'` control; `options.component: 'number'` is optional and ignored. `integer`
 * schemas are deliberately not matched (doc 182 rules 8, 10).
 */
export const numberInputTester: RankedTester = rankWith(1, isNumberControl);

/**
 * Renders a number `Control` with `@repo/ui`'s `NumberInput`. The form stores the raw number Base UI
 * parses — never the formatted text — and an emptied field writes `undefined` (doc 182 rule 16).
 */
function NumberInputControl(props: ControlProps) {
  const { data, path, schema, uischema, handleChange } = props;
  return (
    <ControlField control={props}>
      {(input) => (
        <NumberInput
          {...input}
          {...numberInputProps(schema, uischema.options)}
          value={typeof data === 'number' ? data : null}
          onValueChange={(value) => handleChange(path, value ?? undefined)}
        />
      )}
    </ControlField>
  );
}

export const NumberInputControlRenderer = withJsonFormsControlProps(NumberInputControl);
