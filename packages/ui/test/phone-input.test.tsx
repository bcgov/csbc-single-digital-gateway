import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PhoneInput, formatPhone } from '@ui/inputs/phone-input';

describe('formatPhone', () => {
  it('formats a stored E.164 value into national format', () => {
    expect(formatPhone('+12505551234')).toMatch(/\(250\)\s*555-1234/);
  });

  it('returns an empty string for an empty value', () => {
    expect(formatPhone(undefined)).toBe('');
    expect(formatPhone('')).toBe('');
  });

  it('falls back to the raw value when it cannot be parsed', () => {
    expect(formatPhone('not-a-number')).toBe('not-a-number');
  });
});

describe('PhoneInput', () => {
  it('renders a phone number input and a country-selector button', () => {
    render(<PhoneInput value="+12505551234" onChange={() => {}} />);
    // A number input (textbox) + the country-selector trigger button (opens a Popover/Command list).
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select country/i })).toBeInTheDocument();
  });
});
