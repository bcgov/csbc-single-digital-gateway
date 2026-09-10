import { isStringControl, rankWith, type ControlProps, type RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Input } from '@repo/ui/input';
import { ControlField } from './control-field';
import { stringInputProps } from './control-options';

/** Any string control — `options.component` absent, `'input'` or unrecognised (doc 182 rule 8). */
export const inputTester: RankedTester = rankWith(1, isStringControl);

/**
 * Renders a string `Control` with `@repo/ui`'s `Input`. Clearing the field writes `undefined`, not
 * `''`, so the property is removed and a `required` constraint still fails (doc 182 rule 15).
 */
function InputControl(props: ControlProps) {
  const { data, path, schema, uischema, handleChange } = props;
  return (
    <ControlField control={props}>
      {(input) => (
        <Input
          {...input}
          {...stringInputProps(schema, uischema.options)}
          value={typeof data === 'string' ? data : ''}
          onChange={(event) => handleChange(path, event.target.value || undefined)}
        />
      )}
    </ControlField>
  );
}

export const InputControlRenderer = withJsonFormsControlProps(InputControl);
