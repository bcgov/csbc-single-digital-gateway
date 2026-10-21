import { describe, expect, it } from 'vitest';
import { numberInputProps } from '../src/renderers/ui/control-options';

// Doc 204 rules 11, 14-16 — `options.decimals` derived into the EXISTING Intl format path. The renderer
// wiring and the integer dispatch are in number-format-render.test.tsx and integer-control.test.tsx.

const fixed = (digits: number) => ({
  minimumFractionDigits: digits,
  maximumFractionDigits: digits,
});

describe('numberInputProps — decimals (rules 14-15)', () => {
  it('derives fixed fraction digits from options.decimals', () => {
    expect(numberInputProps({}, { decimals: 2 })).toStrictEqual({ format: fixed(2) });
  });

  it('fixes the digits exactly, so 2 shows 1.50 rather than 1.5', () => {
    const { format, locale } = numberInputProps({}, { decimals: 2, locale: 'en-CA' });
    expect(new Intl.NumberFormat(locale, format).format(1.5)).toBe('1.50');
  });

  it('accepts 0 decimals as a real value, not an absent one', () => {
    expect(numberInputProps({}, { decimals: 0 })).toStrictEqual({ format: fixed(0) });
  });

  it('ignores a negative, fractional, out-of-range or non-numeric decimals', () => {
    for (const decimals of [-1, 1.5, 11, '2', null, true, Number.NaN]) {
      expect(numberInputProps({}, { decimals }), String(decimals)).toStrictEqual({});
    }
  });

  it('keeps every other authored format key and overrides only the fraction digits', () => {
    expect(
      numberInputProps(
        {},
        {
          decimals: 2,
          format: { style: 'currency', currency: 'CAD', maximumFractionDigits: 5 },
          locale: 'en-CA',
        },
      ),
    ).toStrictEqual({
      locale: 'en-CA',
      format: { style: 'currency', currency: 'CAD', ...fixed(2) },
    });
  });

  it('leaves the authored format untouched when decimals is unusable', () => {
    expect(numberInputProps({}, { decimals: 'two', format: { style: 'percent' } })).toStrictEqual({
      format: { style: 'percent' },
    });
  });
});

describe('numberInputProps — style through the existing format key (rule 16)', () => {
  it('formats as currency with the authored currency', () => {
    const { format, locale } = numberInputProps(
      {},
      { format: { style: 'currency', currency: 'CAD' }, locale: 'en-CA', decimals: 2 },
    );
    expect(new Intl.NumberFormat(locale, format).format(1234.5)).toBe('$1,234.50');
  });

  it('formats as a percentage', () => {
    const { format, locale } = numberInputProps(
      {},
      { format: { style: 'percent' }, locale: 'en-CA', decimals: 0 },
    );
    expect(new Intl.NumberFormat(locale, format).format(0.25)).toBe('25%');
  });

  it('emits no format at all when neither style nor decimals is authored', () => {
    expect(numberInputProps({ type: 'number' }, undefined)).toStrictEqual({});
  });

  it('drops a format Intl rejects, keeping the locale (doc 182 rule 22)', () => {
    // `style: 'currency'` with no `currency` throws inside Intl — the form must not go down with it.
    expect(numberInputProps({}, { format: { style: 'currency' }, locale: 'en-CA' })).toStrictEqual({
      locale: 'en-CA',
    });
  });

  it('drops a decimals-derived format only if Intl rejects the merged object', () => {
    expect(
      numberInputProps({}, { decimals: 2, format: { style: 'currency' }, locale: 'en-CA' }),
    ).toStrictEqual({ locale: 'en-CA' });
  });
});

describe('existing number options are unchanged (rule 11)', () => {
  it('still reads min, max, step, smallStep, largeStep, allowWheelScrub and snapOnStep', () => {
    expect(
      numberInputProps(
        { minimum: 0, maximum: 100, multipleOf: 2 },
        { smallStep: 1, largeStep: 10, allowWheelScrub: true, snapOnStep: false, decimals: 2 },
      ),
    ).toStrictEqual({
      min: 0,
      max: 100,
      step: 2,
      smallStep: 1,
      largeStep: 10,
      allowWheelScrub: true,
      snapOnStep: false,
      format: fixed(2),
    });
  });
});
