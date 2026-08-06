import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  DateTimePicker,
  combineDateTime,
  formatDateTime12Hour,
  splitDateTime,
} from '@ui/components/ui/datetime-picker';

const iso = (date: Date | undefined): string | undefined => {
  if (!date) return undefined;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

describe('datetime helpers', () => {
  it('splitDateTime splits into a local-midnight date + HH:MM', () => {
    const { date, time } = splitDateTime('2026-03-01T14:30');
    expect(iso(date)).toBe('2026-03-01');
    expect(time).toBe('14:30');
  });

  it('splitDateTime returns {} for empty/invalid', () => {
    expect(splitDateTime(undefined)).toEqual({});
    expect(splitDateTime('2026-03-01')).toEqual({}); // no time part
    expect(splitDateTime('2026-03-01T25:00')).toEqual({});
  });

  it('combineDateTime joins date + time, or undefined when a part is missing', () => {
    expect(combineDateTime(new Date('2026-03-01T00:00:00'), '14:30')).toBe('2026-03-01T14:30');
    expect(combineDateTime(undefined, '14:30')).toBeUndefined();
    expect(combineDateTime(new Date('2026-03-01T00:00:00'), undefined)).toBeUndefined();
  });

  it('formatDateTime12Hour renders MM/dd/yyyy h:mm AM', () => {
    expect(formatDateTime12Hour('2026-03-01T14:30')).toBe('03/01/2026 2:30 PM');
    expect(formatDateTime12Hour(undefined)).toBe('');
    expect(formatDateTime12Hour('2026-03-01')).toBe('');
  });
});

describe('DateTimePicker', () => {
  it('mounts with a date input and time (hour/minute/AM-PM) controls', () => {
    expect(() =>
      render(<DateTimePicker value="2026-03-01T14:30" onChange={vi.fn()} />),
    ).not.toThrow();
    expect(screen.getByRole('textbox')).toBeInTheDocument(); // date input
    expect(screen.getByLabelText('Hour')).toBeInTheDocument();
    expect(screen.getByLabelText('AM or PM')).toBeInTheDocument();
  });
});
