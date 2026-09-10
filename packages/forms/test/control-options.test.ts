import { describe, expect, it } from 'vitest';
import {
  numberInputProps,
  resolveNumberFormat,
  stringInputProps,
} from '../src/renderers/ui/control-options';

// Doc 182 rules 17-22b — sanitising schema constraints and uischema options.

describe('stringInputProps', () => {
  it('returns an empty object when nothing is authored', () => {
    expect(stringInputProps({ type: 'string' }, undefined)).toStrictEqual({});
  });

  it('keeps a non-empty string placeholder and drops anything else', () => {
    expect(stringInputProps({}, { placeholder: 'Jane' })).toStrictEqual({ placeholder: 'Jane' });
    for (const placeholder of ['', 42, null, true, ['a']]) {
      expect(stringInputProps({}, { placeholder }), String(placeholder)).toStrictEqual({});
    }
  });

  it('keeps schema maxLength only as a non-negative integer', () => {
    expect(stringInputProps({ maxLength: 80 }, undefined)).toStrictEqual({ maxLength: 80 });
    expect(stringInputProps({ maxLength: 0 }, undefined)).toStrictEqual({ maxLength: 0 });
    for (const maxLength of [-1, 2.5, Number.NaN, Number.POSITIVE_INFINITY, '80']) {
      const schema = { maxLength } as unknown as Parameters<typeof stringInputProps>[0];
      expect(stringInputProps(schema, undefined), String(maxLength)).toStrictEqual({});
    }
  });
});

describe('numberInputProps', () => {
  it('returns an empty object when nothing is authored', () => {
    expect(numberInputProps({ type: 'number' }, undefined)).toStrictEqual({});
  });

  it('maps finite schema minimum/maximum to min/max and drops non-finite or non-numbers', () => {
    expect(numberInputProps({ minimum: 0, maximum: 100 }, undefined)).toStrictEqual({
      min: 0,
      max: 100,
    });
    const bad = { minimum: Number.NEGATIVE_INFINITY, maximum: '5' } as unknown as Parameters<
      typeof numberInputProps
    >[0];
    expect(numberInputProps(bad, undefined)).toStrictEqual({});
  });

  it('prefers a positive options.step over schema multipleOf', () => {
    expect(numberInputProps({ multipleOf: 2 }, { step: 5 })).toStrictEqual({ step: 5 });
  });

  it('falls back to a positive schema multipleOf when options.step is absent or invalid', () => {
    expect(numberInputProps({ multipleOf: 2 }, undefined)).toStrictEqual({ step: 2 });
    for (const step of [0, -1, 'x', Number.NaN]) {
      expect(numberInputProps({ multipleOf: 2 }, { step }), String(step)).toStrictEqual({
        step: 2,
      });
    }
    expect(numberInputProps({ multipleOf: 0 }, undefined)).toStrictEqual({});
  });

  it('keeps positive smallStep/largeStep and boolean allowWheelScrub/snapOnStep', () => {
    expect(
      numberInputProps(
        {},
        { smallStep: 0.5, largeStep: 20, allowWheelScrub: true, snapOnStep: false },
      ),
    ).toStrictEqual({ smallStep: 0.5, largeStep: 20, allowWheelScrub: true, snapOnStep: false });
    expect(
      numberInputProps({}, { smallStep: 0, largeStep: -5, allowWheelScrub: 'yes', snapOnStep: 1 }),
    ).toStrictEqual({});
  });

  it('keeps a non-empty string placeholder', () => {
    expect(numberInputProps({}, { placeholder: '0' })).toStrictEqual({ placeholder: '0' });
    expect(numberInputProps({}, { placeholder: 0 })).toStrictEqual({});
  });

  it('passes format and locale through resolveNumberFormat', () => {
    expect(
      numberInputProps({}, { format: { style: 'currency', currency: 'CAD' }, locale: 'en-CA' }),
    ).toStrictEqual({ format: { style: 'currency', currency: 'CAD' }, locale: 'en-CA' });
    expect(numberInputProps({}, { format: { style: 'currency' }, locale: 'en-CA' })).toStrictEqual({
      locale: 'en-CA',
    });
  });
});

describe('resolveNumberFormat', () => {
  it('keeps a valid format and locale', () => {
    expect(resolveNumberFormat({ style: 'percent' }, 'fr-CA')).toStrictEqual({
      format: { style: 'percent' },
      locale: 'fr-CA',
    });
  });

  it('returns an empty object when neither is authored', () => {
    expect(resolveNumberFormat(undefined, undefined)).toStrictEqual({});
  });

  it('drops a format Intl rejects but keeps a valid locale', () => {
    expect(resolveNumberFormat({ style: 'currency' }, 'en-CA')).toStrictEqual({ locale: 'en-CA' });
  });

  it('drops a locale Intl rejects but keeps a valid format', () => {
    expect(resolveNumberFormat({ style: 'percent' }, 'not a locale!!')).toStrictEqual({
      format: { style: 'percent' },
    });
  });

  it('drops a format that is not a plain object and a locale that is not a non-empty string', () => {
    for (const format of [null, 'currency', ['a'], 3]) {
      expect(resolveNumberFormat(format, undefined), String(format)).toStrictEqual({});
    }
    for (const locale of ['', 42, {}]) {
      expect(resolveNumberFormat(undefined, locale), String(locale)).toStrictEqual({});
    }
  });
});
