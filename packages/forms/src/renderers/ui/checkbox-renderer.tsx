import { isBooleanControl, rankWith, type ControlProps, type RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Checkbox } from '@repo/ui/checkbox';
import { BooleanField } from './boolean-field';

/** Any boolean control — `options.component` absent, `'checkbox'` or unrecognised (doc 188 rule 4). */
export const checkboxTester: RankedTester = rankWith(1, isBooleanControl);

/**
 * Renders a boolean `Control` as a `@repo/ui` `Checkbox` ahead of its label (doc 188 rule 18). `checked` is
 * `data === true`; toggling writes `true` / `false` (rule 20).
 */
function CheckboxControl(props: ControlProps) {
  const { data, path, handleChange } = props;
  return (
    <BooleanField control={props} placement="start">
      {(input) => (
        <Checkbox
          {...input}
          checked={data === true}
          onCheckedChange={(checked) => handleChange(path, checked)}
        />
      )}
    </BooleanField>
  );
}

export const CheckboxControlRenderer = withJsonFormsControlProps(CheckboxControl);
