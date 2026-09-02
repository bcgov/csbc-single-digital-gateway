import { and, isBooleanControl, optionIs, rankWith } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Switch } from '@repo/ui/switch';
import { ControlWrapper, describedByIds } from '../util/control-wrapper';

// Opt in per-control with `uischema.options.toggle = true`; outranks the checkbox renderer.
export const booleanToggleControlTester: RankedTester = rankWith(
  3,
  and(isBooleanControl, optionIs('toggle', true)),
);

function BooleanToggleControlComponent({
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
      controlPosition="right"
    >
      <Switch
        id={id}
        checked={Boolean(data)}
        disabled={enabled === false}
        aria-invalid={Boolean(errors)}
        aria-describedby={describedByIds(id, { description, errors })}
        onCheckedChange={(checked) => handleChange(path, checked)}
      />
    </ControlWrapper>
  );
}

export const BooleanToggleControl = withJsonFormsControlProps(BooleanToggleControlComponent);
