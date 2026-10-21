import {
  and,
  isBooleanControl,
  optionIs,
  rankWith,
  type ControlProps,
  type RankedTester,
} from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Switch } from '@repo/ui/switch';
import { BooleanField } from './boolean-field';
import { switchSize } from './control-options';

/** A boolean control with `options.component: 'switch'` — outranks `checkboxTester` (doc 188 rule 4). */
export const switchTester: RankedTester = rankWith(
  2,
  and(isBooleanControl, optionIs('component', 'switch')),
);

/**
 * Renders a boolean `Control` as a `@repo/ui` `Switch` after its label (doc 188 rule 19); `options.size: 'sm'`
 * renders the small switch the Form Studio inspector uses. `checked` is `data === true`; toggling writes
 * `true` / `false` (rule 20).
 */
function SwitchControl(props: ControlProps) {
  const { data, path, uischema, handleChange } = props;
  return (
    <BooleanField control={props} placement="end">
      {(input) => (
        <Switch
          {...input}
          size={switchSize(uischema.options)}
          checked={data === true}
          onCheckedChange={(checked) => handleChange(path, checked)}
        />
      )}
    </BooleanField>
  );
}

export const SwitchControlRenderer = withJsonFormsControlProps(SwitchControl);
