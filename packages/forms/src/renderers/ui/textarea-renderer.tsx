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
import { plainText } from './control-plain-value';

/** A string control with `options.component: 'textarea'` — outranks `inputTester` (doc 182 rule 8). */
export const textareaTester: RankedTester = rankWith(
  2,
  and(isStringControl, optionIs('component', 'textarea')),
);

/**
 * Renders a string `Control` with `@repo/ui`'s `Textarea`; clearing writes `undefined` (rule 15). A
 * `maxLength` also shows the `<n>/<max>` counter under the textarea (rule 18b).
 */
function TextareaControl(props: ControlProps) {
  const { data, path, schema, uischema, handleChange } = props;
  const inputProps = stringInputProps(schema, uischema.options);
  return (
    // Doc 211 rule 11: no mask is read here — a Textarea has none (doc 204 rule 8). `PlainField` keeps the
    // line breaks.
    <ControlField
      control={props}
      maxLength={inputProps.maxLength}
      plainValue={plainText(data, undefined)}
    >
      {(input) => (
        <Textarea
          {...input}
          {...inputProps}
          value={typeof data === 'string' ? data : ''}
          onChange={(event) => handleChange(path, event.target.value || undefined)}
        />
      )}
    </ControlField>
  );
}

export const TextareaControlRenderer = withJsonFormsControlProps(TextareaControl);
