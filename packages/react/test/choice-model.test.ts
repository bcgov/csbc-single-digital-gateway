import { describe, expect, it } from 'vitest';
import {
  labelForValue,
  normalizeChoices,
  readChoiceOptions,
} from '../src/jsonforms-renderers/controls/choice/model';

describe('choice model', () => {
  describe('normalizeChoices', () => {
    it('coerces a well-formed choices array', () => {
      expect(normalizeChoices([{ value: 'r', label: 'Red' }])).toEqual([
        { value: 'r', label: 'Red' },
      ]);
    });

    it('falls back label→value when the label is missing or empty', () => {
      expect(normalizeChoices([{ value: 'r' }, { value: 'g', label: '' }])).toEqual([
        { value: 'r', label: 'r' },
        { value: 'g', label: 'g' },
      ]);
    });

    it('drops non-object entries and stringifies non-string values (never throws)', () => {
      expect(normalizeChoices([null, 'x', { value: 3, label: 4 }])).toEqual([
        { value: '3', label: '4' },
      ]);
    });

    it('returns [] for a non-array blob', () => {
      expect(normalizeChoices(undefined)).toEqual([]);
      expect(normalizeChoices({})).toEqual([]);
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

  describe('readChoiceOptions', () => {
    it('defaults to a single select when unset', () => {
      expect(readChoiceOptions(undefined)).toEqual({
        display: 'select',
        multiple: false,
        choices: [],
      });
    });

    it('forces multiple for checkboxes and single for radio, regardless of the flag', () => {
      expect(readChoiceOptions({ display: 'checkboxes', multiple: false }).multiple).toBe(true);
      expect(readChoiceOptions({ display: 'radio', multiple: true }).multiple).toBe(false);
    });

    it('honours the multiple flag for a select', () => {
      expect(readChoiceOptions({ display: 'select', multiple: true }).multiple).toBe(true);
      expect(readChoiceOptions({ display: 'select' }).multiple).toBe(false);
    });
  });
});
