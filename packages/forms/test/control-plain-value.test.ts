import type { JsonSchema } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import {
  plainBoolean,
  plainChoice,
  plainMultiChoice,
  plainNumber,
  plainText,
} from '../src/renderers/ui/control-plain-value';

// Doc 211 rules 8-12 — one pure formatter per control kind. Tested directly: doc 182's TEST TRAP records that
// JSONForms' Ajv refuses an invalid schema keyword before any renderer runs, so the edge cases cannot be fed
// through <JsonForms> at all.
//
// A formatter returns `undefined` to mean "no answer" and NEVER the wording — rule 9 gives that to PlainField.

// JsonSchema is a JsonSchema4 | JsonSchema7 union whose members disagree under exactOptionalPropertyTypes, so
// a fixture is cast once, exactly as the renderer tests do.
const schemaOf = (schema: Record<string, unknown>): JsonSchema => schema as unknown as JsonSchema;

const choice = schemaOf({
  type: 'string',
  oneOf: [
    { const: 'bc', title: 'British Columbia' },
    { const: 'ab', title: 'Alberta' },
    { const: 'on' },
  ],
});

const multi = schemaOf({
  type: 'array',
  uniqueItems: true,
  items: {
    type: 'string',
    oneOf: [
      { const: 'email', title: 'Email' },
      { const: 'post', title: 'Post' },
      { const: 'phone', title: 'Phone' },
    ],
  },
});

describe('a string value (rule 11)', () => {
  it('returns the stored string', () => {
    expect(plainText('Vancouver', undefined)).toBe('Vancouver');
  });

  it('returns undefined for an absent, empty or non-string value', () => {
    expect(plainText(undefined, undefined)).toBeUndefined();
    expect(plainText('', undefined)).toBeUndefined();
    expect(plainText(null, undefined)).toBeUndefined();
  });

  it('re-masks a maskUnmasked field so it reads as the citizen typed it (rule 12)', () => {
    // Doc 204 rules 6-7: the stored value is the raw characters, so the literals must come back.
    expect(plainText('6045551234', { mask: '(999) 999-9999', maskUnmasked: true })).toBe(
      '(604) 555-1234',
    );
  });

  it('leaves a field that stores its masked text alone (rule 12)', () => {
    // No `maskUnmasked`: what is stored is already what was shown, so re-masking it would mangle it.
    expect(plainText('(604) 555-1234', { mask: '(999) 999-9999' })).toBe('(604) 555-1234');
  });

  it('leaves a field with no mask at all untouched', () => {
    expect(plainText('6045551234', { maskUnmasked: true })).toBe('6045551234');
  });

  it('returns an unmaskable value as-is rather than dropping it (rule 10)', () => {
    // A mask nothing validates, against a value it cannot lay out: the answer survives either way.
    expect(plainText('abc', { mask: '999-999', maskUnmasked: true })).toBeTruthy();
  });

  it('shows a non-string stored under a string control as itself (rule 10)', () => {
    expect(plainText(42, undefined)).toBe('42');
    expect(plainText(true, undefined)).toBe('true');
  });
});

describe('a number value (rule 11)', () => {
  const amount = schemaOf({ type: 'number' });

  it('formats through the field own format, so it reads as it did in the field', () => {
    expect(plainNumber(1.5, amount, { decimals: 2 })).toBe('1.50');
    expect(plainNumber(1234.5, amount, { locale: 'en-CA' })).toBe('1,234.5');
  });

  it('formats with an authored Intl format', () => {
    expect(
      plainNumber(1234.5, amount, {
        locale: 'en-CA',
        format: { style: 'currency', currency: 'CAD' },
      }),
    ).toContain('1,234.50');
  });

  it('returns undefined for an absent value but NOT for 0', () => {
    expect(plainNumber(undefined, amount, undefined)).toBeUndefined();
    expect(plainNumber(0, amount, undefined)).toBe('0');
  });

  it('shows a non-number stored under a number control as itself (rule 10)', () => {
    expect(plainNumber('twelve', amount, undefined)).toBe('twelve');
    expect(plainNumber(Number.NaN, amount, undefined)).toBe('NaN');
  });
});

describe('a choice value (rule 11)', () => {
  it('returns the chosen option label, never the stored const', () => {
    expect(plainChoice(choice, 'bc')).toBe('British Columbia');
  });

  it('falls back to the const as its own label when the entry has no title', () => {
    expect(plainChoice(choice, 'on')).toBe('on');
  });

  it('returns undefined when nothing is chosen', () => {
    expect(plainChoice(choice, undefined)).toBeUndefined();
  });

  it('returns a stored value the schema no longer admits as its raw string (rule 10)', () => {
    expect(plainChoice(choice, 'yt')).toBe('yt');
  });
});

describe('a multi-choice value (rule 11)', () => {
  it('returns the chosen options labels in schema order', () => {
    // Stored in the order they were clicked; shown in the order they were authored (doc 205 rule 8).
    expect(plainMultiChoice(multi, ['phone', 'email'])).toEqual(['Email', 'Phone']);
  });

  it('returns undefined for an absent or empty array', () => {
    expect(plainMultiChoice(multi, undefined)).toBeUndefined();
    expect(plainMultiChoice(multi, [])).toBeUndefined();
  });

  it('keeps a stored entry that is not an option, rather than dropping it (rule 10)', () => {
    expect(plainMultiChoice(multi, ['email', 'carrier-pigeon'])).toEqual([
      'Email',
      'carrier-pigeon',
    ]);
  });
});

describe('a boolean value (rule 11)', () => {
  it('returns Yes for true and No for false', () => {
    expect(plainBoolean(true)).toBe('Yes');
    expect(plainBoolean(false)).toBe('No');
  });

  it('returns undefined when the property is absent — not No', () => {
    expect(plainBoolean(undefined)).toBeUndefined();
    expect(plainBoolean(null)).toBeUndefined();
  });

  it('shows a non-boolean stored under a boolean control as itself (rule 10)', () => {
    expect(plainBoolean('yes')).toBe('yes');
  });
});
