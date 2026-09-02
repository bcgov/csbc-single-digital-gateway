import { isRangeControl, rankWith } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Slider } from '@repo/ui/slider';
import { ControlWrapper, describedByIds } from '../util/control-wrapper';

// `isRangeControl` = numeric control with `uischema.options.slider = true`.
export const sliderControlTester: RankedTester = rankWith(4, isRangeControl);

function SliderControlComponent({
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
  schema,
}: ControlProps) {
  if (visible === false) {
    return null;
  }
  const min = typeof schema.minimum === 'number' ? schema.minimum : 0;
  const max = typeof schema.maximum === 'number' ? schema.maximum : 100;
  const step = typeof schema.multipleOf === 'number' ? schema.multipleOf : undefined;
  const value = typeof data === 'number' ? data : min;

  return (
    <ControlWrapper
      id={id}
      label={label}
      required={required}
      {...(description ? { description } : {})}
      errors={errors}
    >
      <div className="flex items-center gap-3">
        <Slider
          id={id}
          value={value}
          min={min}
          max={max}
          {...(step ? { step } : {})}
          disabled={enabled === false}
          aria-invalid={Boolean(errors)}
          aria-describedby={describedByIds(id, { description, errors })}
          onValueChange={(next) => handleChange(path, Array.isArray(next) ? next[0] : next)}
        />
        <span className="text-xs tabular-nums text-muted-foreground">{value}</span>
      </div>
    </ControlWrapper>
  );
}

export const SliderControl = withJsonFormsControlProps(SliderControlComponent);
