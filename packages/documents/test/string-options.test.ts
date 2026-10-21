import { describe, expect, it } from 'vitest';
import { isPlainString, stringOptions } from '../src/renderers/ui/string-options';

/** Options read from a Control over a plain string. */
const opts = (options: Record<string, unknown>) =>
  stringOptions({ type: 'Control', options }, { type: 'string' });

describe('string options (doc 239 rules 2, 9-10)', () => {
  it('is a plain string only without enum, oneOf or const', () => {
    expect(isPlainString({ type: 'string' })).toBe(true);
    expect(isPlainString({ type: 'string', format: 'email' })).toBe(true);
    expect(isPlainString({ type: 'string', enum: ['a'] })).toBe(false);
    expect(isPlainString({ type: 'string', oneOf: [{ const: 'a' }] })).toBe(false);
    expect(isPlainString({ type: 'string', const: 'a' })).toBe(false);
    expect(isPlainString({ type: 'integer' })).toBe(false);
    expect(isPlainString(undefined)).toBe(false);
  });

  it('reads non-negative integer length limits from the schema, dropping anything else', () => {
    expect(stringOptions({}, { type: 'string', minLength: 2, maxLength: 40 })).toEqual({
      minLength: 2,
      maxLength: 40,
      rows: 3,
    });
    expect(stringOptions({}, { type: 'string', minLength: -1, maxLength: 2.5 })).toEqual({
      rows: 3,
    });
    expect(stringOptions({}, { type: 'string', maxLength: '10' })).toEqual({ rows: 3 });
  });

  it('reads a string placeholder and integer rows 2-20 (default 3) from the uischema options', () => {
    expect(opts({ placeholder: 'Jane Doe', rows: 6 })).toEqual({
      placeholder: 'Jane Doe',
      rows: 6,
    });
    expect(opts({ placeholder: 4 })).toEqual({ rows: 3 });
    for (const rows of [1, 21, 4.5, '6']) expect(opts({ rows }).rows, String(rows)).toBe(3);
    expect(opts({ rows: 2 }).rows).toBe(2);
    expect(opts({ rows: 20 }).rows).toBe(20);
  });

  it('never writes an undefined key (exactOptionalPropertyTypes)', () => {
    const result = stringOptions({}, { type: 'string' });
    expect(Object.keys(result)).toEqual(['rows']);
  });
});
