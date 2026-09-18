import {
  isIntegerControl,
  isNumberControl,
  or,
  rankWith,
  type ControlProps,
  type RankedTester,
} from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { NumberInput } from '@repo/ui/number-input';
import { ControlField } from './control-field';
import { numberInputProps } from './control-options';

/**
 * Any `type: 'number'` OR `type: 'integer'` control; `options.component: 'number'` is optional and ignored.
 *
 * Doc 204 rule 17 amends doc 182 rule 10: an integer schema is what "Allow decimals: off" writes, so it must
 * render — and it renders as the same NumberInput, since `multipleOf`/`decimals` already decide the step and the
 * fraction digits. `isNumberControl` matches `type: 'number'` alone, so without `isIntegerControl` an integer
 * field would match NO control in the set and draw nothing at all.
 */
export const numberInputTester: RankedTester = rankWith(1, or(isNumberControl, isIntegerControl));

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
