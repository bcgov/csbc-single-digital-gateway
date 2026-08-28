'use client';

import * as React from 'react';
import { format as formatDate } from 'date-fns';
import { mdiCalendar } from '@mdi/js';
import { Icon } from '@mdi/react';
import type { DateRange } from 'react-day-picker';
import { useMaskInput } from 'use-mask-input';

import { Calendar } from '@ui/components/ui/calendar';
import { parseTypedDate } from '@ui/components/ui/date-picker';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@ui/components/ui/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '@ui/components/ui/popover';

export type { DateRange };

const RANGE_SEPARATOR = ' - ';
const fmt = (date: Date | undefined): string => (date ? formatDate(date, 'MM/dd/yyyy') : '');

/** The masked input string for a range, e.g. `'03/01/2026 - 03/08/2026'` (blank when no start). */
function rangeText(range: DateRange | undefined): string {
  if (!range?.from) {
    return '';
  }
  return range.to ? `${fmt(range.from)}${RANGE_SEPARATOR}${fmt(range.to)}` : fmt(range.from);
}

/** Parse the two MM/dd/yyyy halves of the masked input into a DateRange (undefined if neither parses). */
export function parseTypedRange(text: string): DateRange | undefined {
  const [rawFrom, rawTo] = text.split(RANGE_SEPARATOR);
  const from = parseTypedDate(rawFrom ?? '');
  const to = parseTypedDate(rawTo ?? '');
  if (!from && !to) {
    return undefined;
  }
  return { from, to };
}

export interface DateRangePickerProps {
  value?: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  id?: string | undefined;
  disabled?: boolean | undefined;
  invalid?: boolean | undefined;
  placeholder?: string | undefined;
  className?: string | undefined;
  'aria-describedby'?: string | undefined;
}

/**
 * A date range picker mirroring {@link DatePicker}: a single `mm/dd/yyyy - mm/dd/yyyy` masked input
 * (`use-mask-input`) plus a calendar-icon button that opens a two-month range calendar whose caption
 * uses `captionLayout="dropdown"` (clickable month/year). Typing parses both halves; the calendar fills
 * them; blur normalises the text to the committed value.
 */
export function DateRangePicker({
  value,
  onChange,
  id,
  disabled,
  invalid,
  placeholder = 'mm/dd/yyyy - mm/dd/yyyy',
  className,
  'aria-describedby': ariaDescribedBy,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState(() => rangeText(value));
  const focused = React.useRef(false);
  const maskRef = useMaskInput({
    mask: '99/99/9999 - 99/99/9999',
    options: { placeholder: 'mm/dd/yyyy - mm/dd/yyyy' },
  });

  React.useEffect(() => {
    if (!focused.current) {
      setText(rangeText(value));
    }
  }, [value]);

  const onType = (next: string) => {
    setText(next);
    onChange(parseTypedRange(next));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <InputGroup className={className}>
        <InputGroupInput
          ref={maskRef}
          id={id}
          value={text}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={ariaDescribedBy}
          onFocus={() => {
            focused.current = true;
          }}
          onBlur={() => {
            focused.current = false;
            setText(rangeText(value));
          }}
          onChange={(event) => onType(event.target.value)}
        />
        <InputGroupAddon align="inline-end">
          <PopoverTrigger
            render={<InputGroupButton aria-label="Open calendar" disabled={disabled} />}
          >
            <Icon path={mdiCalendar} size="14px" aria-hidden />
          </PopoverTrigger>
        </InputGroupAddon>
      </InputGroup>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          captionLayout="dropdown"
          numberOfMonths={2}
          selected={value}
          onSelect={(range: DateRange | undefined) => {
            onChange(range);
            setText(rangeText(range));
            // react-day-picker's FIRST range click returns `{ from, to: from }` (min=0), so only
            // auto-close once a genuine multi-day range (from ≠ to) is picked — otherwise the popover
            // would close after a single click, before the user can choose the end date.
            if (range?.from && range.to && range.from.getTime() !== range.to.getTime()) {
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
