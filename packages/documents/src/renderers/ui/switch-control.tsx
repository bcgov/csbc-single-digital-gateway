import { and, isBooleanControl, optionIs, rankWith, type ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Switch } from '@repo/ui/switch';
import { BooleanField } from './boolean-field';

/** A boolean Control with `options.component: 'switch'` — one above the Checkbox it varies (doc 237 rule 1). */
export const switchControlTester = rankWith(
  2,
  and(isBooleanControl, optionIs('component', 'switch')),
);

/** Its label and description on the left, the switch on the right (rule 12). */
export function SwitchControl(props: ControlProps) {
  return (
    <BooleanField props={props} component="switch" renderControl={(slot) => <Switch {...slot} />} />
  );
}

export const switchControlEntry = {
  tester: switchControlTester,
  renderer: withJsonFormsControlProps(SwitchControl),
};
