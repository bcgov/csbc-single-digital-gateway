import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DateRangePicker, parseTypedRange } from '@ui/components/ui/date-range-picker';

const iso = (date: Date | undefined): string | undefined => {
  if (!date) return undefined;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

describe('parseTypedRange (mm/dd/yyyy - mm/dd/yyyy mask)', () => {
  it('parses both halves', () => {
    const range = parseTypedRange('03/01/2026 - 03/08/2026');
    expect(iso(range?.from)).toBe('2026-03-01');
    expect(iso(range?.to)).toBe('2026-03-08');
  });

  it('parses just the start when the end is still a placeholder', () => {
    const range = parseTypedRange('03/01/2026 - mm/dd/yyyy');
    expect(iso(range?.from)).toBe('2026-03-01');
    expect(range?.to).toBeUndefined();
  });

  it('returns undefined when neither half parses', () => {
    expect(parseTypedRange('mm/dd/yyyy - mm/dd/yyyy')).toBeUndefined();
    expect(parseTypedRange('')).toBeUndefined();
  });
});

describe('DateRangePicker', () => {
  it('mounts as a masked input with a calendar trigger', () => {
    expect(() => render(<DateRangePicker value={undefined} onChange={vi.fn()} />)).not.toThrow();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open calendar' })).toBeInTheDocument();
  });

  it('shows the selected range formatted MM/dd/yyyy - MM/dd/yyyy in the input', () => {
    render(
      <DateRangePicker
        value={{ from: new Date('2026-03-01T00:00:00'), to: new Date('2026-03-08T00:00:00') }}
        onChange={vi.fn()}
      />,
    );
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('03/01/2026 - 03/08/2026');
  });
});
