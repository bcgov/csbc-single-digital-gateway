import { isDateControl, rankWith } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { DatePicker } from '@repo/ui/date-picker';
import { ControlWrapper } from '../util/control-wrapper';
import { parseISODate, toISODate } from './date-util';

export const dateControlTester: RankedTester = rankWith(3, isDateControl);

function DateControlComponent({
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
  const selected = parseISODate(data);

  return (
    <ControlWrapper
      id={id}
      label={label}
      required={required}
      {...(description ? { description } : {})}
      errors={errors}
    >
      <DatePicker
        id={id}
        value={selected}
        disabled={enabled === false}
        invalid={Boolean(errors)}
        onChange={(date) => handleChange(path, date ? toISODate(date) : undefined)}
      />
    </ControlWrapper>
  );
}

export const DateControl = withJsonFormsControlProps(DateControlComponent);
