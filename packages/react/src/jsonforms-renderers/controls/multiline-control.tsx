import { isMultiLineControl, rankWith } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Textarea } from '@repo/ui/textarea';
import { ControlWrapper } from '../util/control-wrapper';

// `isMultiLineControl` matches a string control with `uischema.options.multi = true`;
// rank above the plain text control so it wins.
export const multilineControlTester: RankedTester = rankWith(3, isMultiLineControl);

function MultilineControlComponent({
  id,
  data,
  handleChange,
  path,
  label,
  description,
  errors,
  required,
  enabled,
  visible,
}: ControlProps) {
  if (visible === false) {
    return null;
  }
  return (
    <ControlWrapper
      id={id}
      label={label}
      required={required}
      {...(description ? { description } : {})}
      errors={errors}
    >
      <Textarea
        id={id}
        value={(data as string | undefined) ?? ''}
        disabled={enabled === false}
        aria-invalid={Boolean(errors)}
        onChange={(event) =>
          handleChange(path, event.target.value === '' ? undefined : event.target.value)
        }
      />
    </ControlWrapper>
  );
}

export const MultilineControl = withJsonFormsControlProps(MultilineControlComponent);
