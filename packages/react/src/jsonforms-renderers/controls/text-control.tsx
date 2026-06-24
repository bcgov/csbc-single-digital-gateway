import { isStringControl, rankWith } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Input } from '@repo/ui/input';
import { ControlWrapper } from '../util/control-wrapper';

export const textControlTester: RankedTester = rankWith(1, isStringControl);

function TextControlComponent({
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
      <Input
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

export const TextControl = withJsonFormsControlProps(TextControlComponent);
