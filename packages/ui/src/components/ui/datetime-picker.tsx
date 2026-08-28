'use client';

import * as React from 'react';
import { format as formatDate } from 'date-fns';

import { DatePicker } from '@ui/components/ui/date-picker';
import { TimePicker, formatTime12Hour } from '@ui/components/ui/time-picker';
import { cn } from '@ui/lib/utils';

const DATETIME_RE = /^(\d{4}-\d{2}-\d{2})T(([01]\d|2[0-3]):[0-5]\d)$/;

interface DateTimeParts {
  date?: Date | undefined;
  time?: string | undefined;
}

/** Split a `'YYYY-MM-DDTHH:MM'` string into a local-midnight Date + `'HH:MM'`, or `{}` if invalid. */
export function splitDateTime(value: string | undefined): DateTimeParts {
  if (!value) {
    return {};
  }
  const match = DATETIME_RE.exec(value);
  if (!match) {
    return {};
  }
  return { date: new Date(`${match[1]}T00:00:00`), time: match[2] };
}

/** Combine a Date + `'HH:MM'` into `'YYYY-MM-DDTHH:MM'`, or `undefined` when either part is missing. */
export function combineDateTime(
  date: Date | undefined,
  time: string | undefined,
): string | undefined {
  return date && time ? `${formatDate(date, 'yyyy-MM-dd')}T${time}` : undefined;
}

/** Format a `'YYYY-MM-DDTHH:MM'` string for display as `'MM/dd/yyyy h:mm AM'`, or '' when empty. */
export function formatDateTime12Hour(value: string | undefined): string {
  const { date, time } = splitDateTime(value);
  return date && time ? `${formatDate(date, 'MM/dd/yyyy')} ${formatTime12Hour(time)}` : '';
}

export interface DateTimePickerProps {
  value?: string | undefined;
  onChange: (value: string | undefined) => void;
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  'aria-describedby'?: string | undefined;
}

/**
 * A combined date + time field. Reuses the {@link DatePicker} (MM/dd/yyyy masked input + calendar) and
 * {@link TimePicker} (12-hour + AM/PM), emitting a local wall-clock `'YYYY-MM-DDTHH:MM'` string once
 * BOTH parts are set. Local part-state preserves an in-progress date/time while the other is chosen.
 */
export function DateTimePicker({
  value,
  onChange,
  id,
  disabled,
  invalid,
  className,
  'aria-describedby': ariaDescribedBy,
}: DateTimePickerProps) {
  const initial = splitDateTime(value);
  const [datePart, setDatePart] = React.useState<Date | undefined>(initial.date);
  const [timePart, setTimePart] = React.useState<string | undefined>(initial.time);

  // Resync from an externally-set value without clobbering an in-progress local part.
  React.useEffect(() => {
    const next = splitDateTime(value);
    if (next.date) setDatePart(next.date);
    if (next.time) setTimePart(next.time);
  }, [value]);

  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-stretch', className)}>
      <DatePicker
        id={id}
        value={datePart}
        disabled={disabled}
        invalid={invalid}
        aria-describedby={ariaDescribedBy}
        onChange={(date) => {
          setDatePart(date);
          onChange(combineDateTime(date, timePart));
        }}
      />
      <TimePicker
        value={timePart}
        disabled={disabled}
        invalid={invalid}
        aria-describedby={ariaDescribedBy}
        onChange={(time) => {
          setTimePart(time);
          onChange(combineDateTime(datePart, time));
        }}
      />
    </div>
  );
}
