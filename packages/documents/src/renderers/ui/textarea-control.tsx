import { and, optionIs, rankWith, type ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Textarea } from '@repo/ui/textarea';
import { isPlainStringControl, TextField } from './text-field';

/** A plain string Control with `options.component: 'textarea'` — one above the Input it varies (doc 239 rule 1). */
export const textareaControlTester = rankWith(
  2,
  and(isPlainStringControl, optionIs('component', 'textarea')),
);

/** Fixed-height, so `rows` takes effect: `@repo/ui`'s Textarea otherwise grows with its content (rule 10). */
export function TextareaControl(props: ControlProps) {
  return (
    <TextField
      props={props}
      component="textarea"
      renderControl={({ onValueChange, ...slot }) => (
        <Textarea
          {...slot}
          className="field-sizing-fixed"
          onChange={(event) => onValueChange(event.target.value)}
        />
      )}
    />
  );
}

export const textareaControlEntry = {
  tester: textareaControlTester,
  renderer: withJsonFormsControlProps(TextareaControl),
};
