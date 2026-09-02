import type { JsonSchema } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import {
  choicesFromSchema,
  isChoiceSchema,
  labelForValue,
  readChoiceOptions,
} from '../src/jsonforms-renderers/controls/choice/model';

describe('choice model (feature 167 — schema-native oneOf/const/title)', () => {
  describe('choicesFromSchema', () => {
    it('derives choices from a single-value schema.oneOf', () => {
      const schema: JsonSchema = {
        type: 'string',
        oneOf: [
          { const: 'r', title: 'Red' },
          { const: 'g', title: 'Green' },
        ],
      };
      expect(choicesFromSchema(schema)).toEqual([
        { value: 'r', label: 'Red' },
        { value: 'g', label: 'Green' },
      ]);
    });

    it('derives choices from a multi-value schema.items.oneOf', () => {
      const schema: JsonSchema = {
        type: 'array',
        items: { type: 'string', oneOf: [{ const: 'r', title: 'Red' }] },
      };
      expect(choicesFromSchema(schema)).toEqual([{ value: 'r', label: 'Red' }]);
    });

    it('falls back label→value when the title is missing or empty', () => {
      const schema: JsonSchema = {
        type: 'string',
        oneOf: [{ const: 'r' }, { const: 'g', title: '' }],
      };
      expect(choicesFromSchema(schema)).toEqual([
        { value: 'r', label: 'r' },
        { value: 'g', label: 'g' },
      ]);
    });

    it('drops non-object oneOf entries and stringifies a non-string const (never throws)', () => {
      const schema = {
        type: 'string',
        oneOf: [null, 'x', { const: 3, title: 4 }],
      } as unknown as JsonSchema;
      expect(choicesFromSchema(schema)).toEqual([{ value: '3', label: '4' }]);
    });

    it('returns [] when the schema is undefined, has no oneOf, or oneOf is malformed', () => {
      expect(choicesFromSchema(undefined)).toEqual([]);
      expect(choicesFromSchema({ type: 'string' })).toEqual([]);
      expect(choicesFromSchema({ type: 'string', oneOf: 'not-an-array' as unknown as [] })).toEqual(
        [],
      );
      expect(choicesFromSchema({ type: 'array' })).toEqual([]);
    });
  });

  describe('labelForValue', () => {
    const choices = [{ value: 'r', label: 'Red' }];
    it('resolves the authored label', () => {
      expect(labelForValue(choices, 'r')).toBe('Red');
    });
    it('falls back to the raw value when unmatched', () => {
      expect(labelForValue(choices, 'zzz')).toBe('zzz');
    });
  });

  describe('isChoiceSchema', () => {
    it('is true for a single-value string schema with a oneOf of const/title entries', () => {
      expect(isChoiceSchema({ type: 'string', oneOf: [{ const: 'r', title: 'Red' }] })).toBe(true);
    });

    it('is true for an array schema whose items carry a oneOf of const/title entries', () => {
      expect(
        isChoiceSchema({
          type: 'array',
          items: { type: 'string', oneOf: [{ const: 'r', title: 'Red' }] },
        }),
      ).toBe(true);
    });

    it('is false for a plain enum schema (no oneOf)', () => {
      expect(isChoiceSchema({ type: 'string', enum: ['r', 'g'] })).toBe(false);
    });

    it('is false when oneOf entries have no const (not a choice shape)', () => {
      expect(isChoiceSchema({ type: 'string', oneOf: [{ title: 'Red' }] } as JsonSchema)).toBe(
        false,
      );
    });

    it('is true for an empty oneOf (all options removed — still choice-shaped, never throws)', () => {
      expect(isChoiceSchema({ type: 'string', oneOf: [] })).toBe(true);
    });

    it('is false for undefined or a schema with no oneOf key at all (e.g. a plain Text field)', () => {
      expect(isChoiceSchema(undefined)).toBe(false);
      expect(isChoiceSchema({ type: 'string' })).toBe(false);
      expect(isChoiceSchema({ type: 'array', items: { type: 'string' } })).toBe(false);
    });
  });

  describe('readChoiceOptions', () => {
    const stringSchema: JsonSchema = { type: 'string', oneOf: [{ const: 'r', title: 'Red' }] };
    const arraySchema: JsonSchema = {
      type: 'array',
      items: { type: 'string', oneOf: [{ const: 'r', title: 'Red' }] },
    };

    it('defaults display to select and combobox to false when options are absent (bare uischema)', () => {
      expect(readChoiceOptions(undefined, stringSchema)).toEqual({
        display: 'select',
        multiple: false,
        combobox: false,
        choices: [{ value: 'r', label: 'Red' }],
      });
    });

    it('derives multiple from the schema type, not an options flag', () => {
      expect(readChoiceOptions(undefined, arraySchema).multiple).toBe(true);
      expect(readChoiceOptions(undefined, stringSchema).multiple).toBe(false);
    });

    it('honours an explicit options.display for radio/checkboxes', () => {
      expect(readChoiceOptions({ display: 'radio' }, stringSchema).display).toBe('radio');
      expect(readChoiceOptions({ display: 'checkboxes' }, arraySchema).display).toBe('checkboxes');
    });

    it('honours an explicit options.combobox (feature 168, opt-in per field)', () => {
      expect(readChoiceOptions({ combobox: true }, stringSchema).combobox).toBe(true);
      expect(readChoiceOptions({ combobox: false }, stringSchema).combobox).toBe(false);
      expect(readChoiceOptions({}, stringSchema).combobox).toBe(false);
    });
  });
});
