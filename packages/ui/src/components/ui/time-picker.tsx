'use client';

import * as React from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/components/ui/select';
import { cn } from '@ui/lib/utils';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1)); // '1'..'12'
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')); // '00'..'59'
const PERIODS = ['AM', 'PM'] as const;
type Period = (typeof PERIODS)[number];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

interface TimeParts {
  hour12?: string;
  minute?: string;
  period?: Period;
}

/** Split a 24-hour `'HH:MM'` string into 12-hour parts, or `{}` if it is empty/invalid. */
export function parse24Hour(value: string | undefined): TimeParts {
  if (!value || !TIME_RE.test(value)) {
    return {};
  }
  const [hh, mm] = value.split(':');
  const hour = Number(hh);
  const minute = mm ?? '00';
  const period: Period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return { hour12: String(hour12), minute, period };
}

/** Compose 12-hour parts back into a 24-hour `'HH:MM'` string, or `undefined` if incomplete. */
export function compose24Hour({ hour12, minute, period }: TimeParts): string | undefined {
  if (!hour12 || !minute || !period) {
    return undefined;
  }
  let hour = Number(hour12) % 12;
  if (period === 'PM') {
    hour += 12;
  }
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

/** Format a 24-hour `'HH:MM'` string for display as `'h:mm AM'`, or '' when empty/invalid. */
export function formatTime12Hour(value: string | undefined): string {
  const { hour12, minute, period } = parse24Hour(value);
  return hour12 && minute && period ? `${hour12}:${minute} ${period}` : '';
}

export interface TimePickerProps {
  value?: string | undefined;
  onChange: (value: string | undefined) => void;
  id?: string | undefined;
  disabled?: boolean | undefined;
  invalid?: boolean | undefined;
  className?: string | undefined;
}

/** A 12-hour time picker: hour (1–12) + minute (00–59) + AM/PM, emitting a 24-hour `'HH:MM'` string. */
export function TimePicker({ value, onChange, id, disabled, invalid, className }: TimePickerProps) {
  const parts = parse24Hour(value);
  const [hour12, setHour12] = React.useState(parts.hour12 ?? '');
  const [minute, setMinute] = React.useState(parts.minute ?? '');
  const [period, setPeriod] = React.useState<Period>(parts.period ?? 'AM');

  // Resync from an externally-set value (default seed, resumed draft) without clobbering local edits.
  React.useEffect(() => {
    const next = parse24Hour(value);
    if (next.hour12) setHour12(next.hour12);
    if (next.minute) setMinute(next.minute);
    if (next.period) setPeriod(next.period);
  }, [value]);

  const commit = (next: TimeParts) => onChange(compose24Hour({ hour12, minute, period, ...next }));

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select
        value={hour12 || null}
        disabled={disabled}
        onValueChange={(next: string | null) => {
          setHour12(next ?? '');
          commit({ hour12: next ?? '' });
        }}
      >
        <SelectTrigger
          id={id}
          aria-invalid={invalid || undefined}
          aria-label="Hour"
          className="w-16"
        >
          <SelectValue placeholder="hh" />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span aria-hidden className="text-muted-foreground">
        :
      </span>
      <Select
        value={minute || null}
        disabled={disabled}
        onValueChange={(next: string | null) => {
          setMinute(next ?? '');
          commit({ minute: next ?? '' });
        }}
      >
        <SelectTrigger aria-invalid={invalid || undefined} aria-label="Minute" className="w-16">
          <SelectValue placeholder="mm" />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={period}
        disabled={disabled}
        onValueChange={(next: string | null) => {
          const p = (next as Period | null) ?? 'AM';
          setPeriod(p);
          commit({ period: p });
        }}
      >
        <SelectTrigger aria-invalid={invalid || undefined} aria-label="AM or PM" className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
