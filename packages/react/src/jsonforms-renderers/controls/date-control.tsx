import { isDateControl, rankWith } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Button } from '@repo/ui/button';
import { Calendar } from '@repo/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/popover';
import { ControlWrapper } from '../util/control-wrapper';

export const dateControlTester: RankedTester = rankWith(3, isDateControl);

// JSON Schema `format: date` ↔ a calendar; data is an ISO 'YYYY-MM-DD' string. Build the
// Date at local midnight so the round-trip never drifts across a timezone boundary.
const toISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  const selected = typeof data === 'string' && data ? new Date(`${data}T00:00:00`) : undefined;

  return (
    <ControlWrapper
      id={id}
      label={label}
      required={required}
      {...(description ? { description } : {})}
      errors={errors}
    >
      <Popover>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              disabled={enabled === false}
              aria-invalid={Boolean(errors)}
              className="w-full justify-start font-normal"
            />
          }
        >
          {selected ? selected.toLocaleDateString() : 'Pick a date'}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date: Date | undefined) =>
              handleChange(path, date ? toISODate(date) : undefined)
            }
          />
        </PopoverContent>
      </Popover>
    </ControlWrapper>
  );
}

export const DateControl = withJsonFormsControlProps(DateControlComponent);
