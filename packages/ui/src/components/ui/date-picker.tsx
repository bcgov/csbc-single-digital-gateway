'use client';

import * as React from 'react';
import { format as formatDate, isValid, parse } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { useMaskInput } from 'use-mask-input';

import { Calendar } from '@ui/components/ui/calendar';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@ui/components/ui/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '@ui/components/ui/popover';

// The typed input is masked to MM/dd/yyyy (use-mask-input / inputmask `datetime` alias), so parsing +
// formatting use exactly that format. Typing is a convenience — the calendar (with month/year
// dropdowns) is the primary affordance — so a parse failure never throws or clears.
export const DATE_MASK_FORMAT = 'MM/dd/yyyy';

/** Parse a MM/dd/yyyy string into a Date, or `undefined` if it is empty/incomplete/invalid. */
export function parseTypedDate(text: string): Date | undefined {
  const trimmed = text.trim();
  if (trimmed === '') {
    return undefined;
  }
  const parsed = parse(trimmed, DATE_MASK_FORMAT, new Date());
  return isValid(parsed) ? parsed : undefined;
}

const displayValue = (date: Date | undefined): string =>
  date ? formatDate(date, DATE_MASK_FORMAT) : '';

export interface DatePickerProps {
  value?: Date | undefined;
  onChange: (date: Date | undefined) => void;
  id?: string | undefined;
  disabled?: boolean | undefined;
  invalid?: boolean | undefined;
  placeholder?: string | undefined;
  className?: string | undefined;
}

/**
 * The shadcn "Input" date picker: a typeable text input (browser-locale format) paired with a
 * calendar popover whose caption uses `captionLayout="dropdown"` — so the month and year are
 * clickable dropdowns. Typing parses on the fly; blur normalises the text to the committed value.
 */
export function DatePicker({
  value,
  onChange,
  id,
  disabled,
  invalid,
  placeholder = 'mm/dd/yyyy',
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState(() => displayValue(value));
  const focused = React.useRef(false);
  // Mask the input to MM/dd/yyyy. `useMaskInput` returns a stable ref callback that inputmask attaches
  // to the underlying DOM input (InputGroupInput forwards the ref through Base UI's input).
  const maskRef = useMaskInput({ mask: 'datetime', options: { inputFormat: 'mm/dd/yyyy' } });

  // Reflect external value changes (calendar pick, form default seed) into the text — but never while
  // the field is focused, so typing isn't reformatted out from under the user mid-keystroke.
  React.useEffect(() => {
    if (!focused.current) {
      setText(displayValue(value));
    }
  }, [value]);

  const onType = (next: string) => {
    setText(next);
    if (next.trim() === '') {
      onChange(undefined);
      return;
    }
    const parsed = parseTypedDate(next);
    if (parsed !== undefined) {
      onChange(parsed);
    }
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
          onFocus={() => {
            focused.current = true;
          }}
          onBlur={() => {
            focused.current = false;
            setText(displayValue(value));
          }}
          onChange={(event) => onType(event.target.value)}
        />
        <InputGroupAddon align="inline-end">
          {value && !disabled ? (
            <InputGroupButton
              type="button"
              aria-label="Clear"
              onClick={() => {
                onChange(undefined);
                setText('');
              }}
            >
              <X className="size-3.5" aria-hidden />
            </InputGroupButton>
          ) : null}
          <PopoverTrigger
            render={<InputGroupButton aria-label="Open calendar" disabled={disabled} />}
          >
            <CalendarIcon className="size-3.5" aria-hidden />
          </PopoverTrigger>
        </InputGroupAddon>
      </InputGroup>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={value}
          onSelect={(date: Date | undefined) => {
            onChange(date ?? undefined);
            setText(displayValue(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
