import { isBooleanControl, rankWith, type ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Checkbox } from '@repo/ui/checkbox';
import { BooleanField } from './boolean-field';

/** Any boolean Control, at the base rank (doc 237 rule 1). */
export const checkboxControlTester = rankWith(1, isBooleanControl);

/** A checkbox on the left, its label and description to the right (rule 11). */
export function CheckboxControl(props: ControlProps) {
  return (
    <BooleanField
      props={props}
      component="checkbox"
      renderControl={(slot) => <Checkbox {...slot} />}
    />
  );
}

export const checkboxControlEntry = {
  tester: checkboxControlTester,
  renderer: withJsonFormsControlProps(CheckboxControl),
};
