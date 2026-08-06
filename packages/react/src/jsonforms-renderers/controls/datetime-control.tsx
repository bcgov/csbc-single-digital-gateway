import { and, optionIs, rankWith, uiTypeIs } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { DateTimePicker } from '@repo/ui/datetime-picker';
import { ControlWrapper } from '../util/control-wrapper';

// Dispatched by `options.format: 'datetime'`; the data is a local `'YYYY-MM-DDTHH:MM'` string.
export const dateTimeControlTester: RankedTester = rankWith(
  4,
  and(uiTypeIs('Control'), optionIs('format', 'datetime')),
);

function DateTimeControlComponent({
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
      <DateTimePicker
        id={id}
        value={typeof data === 'string' ? data : undefined}
        disabled={enabled === false}
        invalid={Boolean(errors)}
        onChange={(next) => handleChange(path, next)}
      />
    </ControlWrapper>
  );
}

export const DateTimeControl = withJsonFormsControlProps(DateTimeControlComponent);
