import { describe, expect, it } from 'vitest';
import { isPlainNumber, numberOptions } from '../src/renderers/ui/number-options';

describe('number options (doc 248 rules 2, 7-10)', () => {
  it('is a plain number only for exactly number or integer, without enum, oneOf or const', () => {
    expect(isPlainNumber({ type: 'number' })).toBe(true);
    expect(isPlainNumber({ type: 'integer', minimum: 0 })).toBe(true);
    for (const schema of [
      { type: 'number', oneOf: [{ const: 1 }] },
      { type: 'integer', enum: [1, 2] },
      { type: 'number', const: 3 },
      { type: ['number', 'null'] },
      { type: 'string' },
      null,
    ]) {
      expect(isPlainNumber(schema)).toBe(false);
    }
  });

  it('reads finite minimum / maximum as min / max', () => {
    expect(numberOptions({}, { type: 'number', minimum: 0, maximum: 10 })).toEqual({
      min: 0,
      max: 10,
    });
    const bad = numberOptions({}, { type: 'number', minimum: '0', maximum: Infinity });
    expect(bad).not.toHaveProperty('min');
    expect(bad).not.toHaveProperty('max');
  });

  it('steps by a positive multipleOf, else 1 for an integer, else not at all', () => {
    expect(numberOptions({}, { type: 'number', multipleOf: 0.5 })).toMatchObject({ step: 0.5 });
    expect(numberOptions({}, { type: 'integer' })).toMatchObject({ step: 1 });
    expect(numberOptions({}, { type: 'integer', multipleOf: 5 })).toMatchObject({ step: 5 });
    expect(numberOptions({}, { type: 'number' })).not.toHaveProperty('step');
    expect(numberOptions({}, { type: 'number', multipleOf: -2 })).not.toHaveProperty('step');
  });

  it('formats an integer with no fraction digits, a number without a format', () => {
    expect(numberOptions({}, { type: 'integer' })).toMatchObject({
      format: { maximumFractionDigits: 0 },
    });
    expect(numberOptions({}, { type: 'number' })).not.toHaveProperty('format');
  });

  it('reads a non-empty string options.placeholder', () => {
    expect(numberOptions({ options: { placeholder: 'e.g. 42' } }, { type: 'number' })).toEqual({
      placeholder: 'e.g. 42',
    });
    expect(numberOptions({ options: { placeholder: '' } }, { type: 'number' })).toEqual({});
    expect(numberOptions({ options: { placeholder: 4 } }, { type: 'number' })).toEqual({});
  });
});
