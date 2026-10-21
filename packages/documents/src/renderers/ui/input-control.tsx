import { rankWith, type ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Input } from '@repo/ui/input';
import { isPlainStringControl, TextField } from './text-field';

/** Any plain string Control, at the base rank (doc 239 rule 1). */
export const inputControlTester = rankWith(1, isPlainStringControl);

export function InputControl(props: ControlProps) {
  return (
    <TextField
      props={props}
      component="input"
      renderControl={({ onValueChange, rows: _rows, ...slot }) => (
        <Input type="text" {...slot} onChange={(event) => onValueChange(event.target.value)} />
      )}
    />
  );
}

export const inputControlEntry = {
  tester: inputControlTester,
  renderer: withJsonFormsControlProps(InputControl),
};
