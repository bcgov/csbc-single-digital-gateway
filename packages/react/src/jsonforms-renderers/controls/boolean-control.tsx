import { isBooleanControl, rankWith } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Checkbox } from '@repo/ui/checkbox';
import { ControlWrapper } from '../util/control-wrapper';

export const booleanControlTester: RankedTester = rankWith(2, isBooleanControl);

function BooleanControlComponent({
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
      orientation="horizontal"
    >
      <Checkbox
        id={id}
        checked={Boolean(data)}
        disabled={enabled === false}
        aria-invalid={Boolean(errors)}
        onCheckedChange={(checked) => handleChange(path, checked)}
      />
    </ControlWrapper>
  );
}

export const BooleanControl = withJsonFormsControlProps(BooleanControlComponent);
