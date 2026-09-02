import { and, optionIs, rankWith, uiTypeIs } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { TimePicker } from '@repo/ui/time-picker';
import { ControlWrapper, describedByIds } from '../util/control-wrapper';

// Dispatched by `options.format: 'time'`; the data is a 24-hour `'HH:MM'` string (pattern-validated).
export const timeControlTester: RankedTester = rankWith(
  4,
  and(uiTypeIs('Control'), optionIs('format', 'time')),
);

function TimeControlComponent({
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
      <TimePicker
        id={id}
        value={typeof data === 'string' ? data : undefined}
        disabled={enabled === false}
        invalid={Boolean(errors)}
        aria-describedby={describedByIds(id, { description, errors })}
        onChange={(next) => handleChange(path, next)}
      />
    </ControlWrapper>
  );
}

export const TimeControl = withJsonFormsControlProps(TimeControlComponent);
