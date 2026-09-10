import {
  and,
  isStringControl,
  optionIs,
  rankWith,
  type ControlProps,
  type RankedTester,
} from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Textarea } from '@repo/ui/textarea';
import { ControlField } from './control-field';
import { stringInputProps } from './control-options';

/** A string control with `options.component: 'textarea'` — outranks `inputTester` (doc 182 rule 8). */
export const textareaTester: RankedTester = rankWith(
  2,
  and(isStringControl, optionIs('component', 'textarea')),
);

/** Renders a string `Control` with `@repo/ui`'s `Textarea`; clearing writes `undefined` (rule 15). */
function TextareaControl(props: ControlProps) {
  const { data, path, schema, uischema, handleChange } = props;
  return (
    <ControlField control={props}>
      {(input) => (
        <Textarea
          {...input}
          {...stringInputProps(schema, uischema.options)}
          value={typeof data === 'string' ? data : ''}
          onChange={(event) => handleChange(path, event.target.value || undefined)}
        />
      )}
    </ControlField>
  );
}

export const TextareaControlRenderer = withJsonFormsControlProps(TextareaControl);
