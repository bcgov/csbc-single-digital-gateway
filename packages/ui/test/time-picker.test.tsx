import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  TimePicker,
  compose24Hour,
  formatTime12Hour,
  parse24Hour,
} from '@ui/components/ui/time-picker';

describe('time helpers', () => {
  it('parse24Hour splits a 24h string into 12h parts', () => {
    expect(parse24Hour('14:30')).toEqual({ hour12: '2', minute: '30', period: 'PM' });
    expect(parse24Hour('00:05')).toEqual({ hour12: '12', minute: '05', period: 'AM' });
    expect(parse24Hour('12:00')).toEqual({ hour12: '12', minute: '00', period: 'PM' });
    expect(parse24Hour('09:15')).toEqual({ hour12: '9', minute: '15', period: 'AM' });
  });

  it('parse24Hour returns {} for empty/invalid', () => {
    expect(parse24Hour(undefined)).toEqual({});
    expect(parse24Hour('')).toEqual({});
    expect(parse24Hour('25:00')).toEqual({});
    expect(parse24Hour('2:30 PM')).toEqual({});
  });

  it('compose24Hour rebuilds a 24h string, or undefined when incomplete', () => {
    expect(compose24Hour({ hour12: '2', minute: '30', period: 'PM' })).toBe('14:30');
    expect(compose24Hour({ hour12: '12', minute: '00', period: 'AM' })).toBe('00:00');
    expect(compose24Hour({ hour12: '12', minute: '00', period: 'PM' })).toBe('12:00');
    expect(compose24Hour({ hour12: '2', minute: '30' })).toBeUndefined();
  });

  it('formatTime12Hour renders h:mm AM/PM', () => {
    expect(formatTime12Hour('14:30')).toBe('2:30 PM');
    expect(formatTime12Hour('00:05')).toBe('12:05 AM');
    expect(formatTime12Hour(undefined)).toBe('');
    expect(formatTime12Hour('nope')).toBe('');
  });
});

describe('TimePicker', () => {
  it('mounts with hour, minute and AM/PM controls', () => {
    expect(() => render(<TimePicker value="14:30" onChange={vi.fn()} />)).not.toThrow();
    expect(screen.getByLabelText('Hour')).toBeInTheDocument();
    expect(screen.getByLabelText('Minute')).toBeInTheDocument();
    expect(screen.getByLabelText('AM or PM')).toBeInTheDocument();
  });
});
