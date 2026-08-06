import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DatePicker, parseTypedDate } from '@ui/components/ui/date-picker';

const iso = (date: Date | undefined): string | undefined => {
  if (!date) return undefined;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

describe('parseTypedDate (MM/dd/yyyy mask)', () => {
  it('parses a complete MM/dd/yyyy string', () => {
    expect(iso(parseTypedDate('03/01/2026'))).toBe('2026-03-01');
    expect(iso(parseTypedDate('12/25/2026'))).toBe('2026-12-25');
  });

  it('returns undefined for empty, incomplete, or wrong-format text', () => {
    expect(parseTypedDate('')).toBeUndefined();
    expect(parseTypedDate('   ')).toBeUndefined();
    expect(parseTypedDate('03/01/____')).toBeUndefined();
    expect(parseTypedDate('2026-03-01')).toBeUndefined(); // ISO is not the masked format
    expect(parseTypedDate('not a date')).toBeUndefined();
  });
});

describe('DatePicker', () => {
  it('mounts without throwing and exposes a calendar trigger', () => {
    expect(() => render(<DatePicker value={undefined} onChange={vi.fn()} />)).not.toThrow();
    expect(screen.getByRole('button', { name: 'Open calendar' })).toBeInTheDocument();
  });

  it('shows the selected value formatted as MM/dd/yyyy', () => {
    render(<DatePicker value={new Date('2026-03-01T00:00:00')} onChange={vi.fn()} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(input.value).toBe('03/01/2026');
  });
});
