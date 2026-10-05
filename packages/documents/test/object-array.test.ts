import { describe, expect, it } from 'vitest';
import { isMultiChoice } from '../src/renderers/ui/choice-options';
import {
  formatCell,
  isObjectArray,
  tableColumns,
  tableRows,
} from '../src/renderers/ui/object-array';
import { isRichTextProperty } from '../src/renderers/ui/rich-text-value';

const table = (properties: unknown, extra: Record<string, unknown> = {}) => ({
  type: 'array',
  items: { type: 'object', properties, ...extra },
});

describe('object-array helpers (doc 263 rules 8-12)', () => {
  describe('isObjectArray', () => {
    it('accepts an array of objects with properties, including empty properties', () => {
      expect(isObjectArray(table({ name: { type: 'string' } }))).toBe(true);
      expect(isObjectArray(table({}))).toBe(true);
      expect(isObjectArray(table({ a: { type: 'number' } }, { required: ['a'] }))).toBe(true);
    });

    it('refuses items without type object or without a properties object', () => {
      expect(isObjectArray({ type: 'array', items: { properties: {} } })).toBe(false);
      expect(isObjectArray({ type: 'array', items: { type: 'object' } })).toBe(false);
      expect(isObjectArray({ type: 'array', items: { type: 'object', properties: [] } })).toBe(
        false,
      );
      expect(isObjectArray({ type: 'object', items: { type: 'object', properties: {} } })).toBe(
        false,
      );
      expect(isObjectArray({ type: 'array' })).toBe(false);
      expect(isObjectArray(undefined)).toBe(false);
      expect(isObjectArray('array')).toBe(false);
    });

    it('is disjoint from multi choice and rich text', () => {
      const multi = { type: 'array', items: { oneOf: [{ const: 'a' }] } };
      const rich = { type: 'object', required: ['root'] };
      const objects = table({ a: { type: 'string' } });
      expect(isObjectArray(multi)).toBe(false);
      expect(isObjectArray(rich)).toBe(false);
      expect(isMultiChoice(objects)).toBe(false);
      expect(isRichTextProperty(objects)).toBe(false);
      // Even an object array whose items also carry a oneOf is not a multiple choice.
      expect(isMultiChoice(table({}, { oneOf: [{ const: 'a' }] }))).toBe(false);
    });
  });

  describe('tableColumns', () => {
    it('lists columns in property order with title else key', () => {
      const columns = tableColumns(
        table({
          zeta: { type: 'string', title: ' Last name ' },
          alpha: { type: 'number' },
          mid: { type: 'boolean', title: '  ' },
        }),
      );
      expect(columns.map((c) => c.key)).toEqual(['zeta', 'alpha', 'mid']);
      expect(columns.map((c) => c.title)).toEqual(['Last name', 'alpha', 'mid']);
      expect(tableColumns({ type: 'string' })).toEqual([]);
    });

    it('maps types and marks anything else other, skipping non-object entries', () => {
      const columns = tableColumns(
        table({
          s: { type: 'string' },
          n: { type: 'number' },
          i: { type: 'integer' },
          b: { type: 'boolean' },
          o: { type: 'object' },
          u: {},
          bad: 'nope',
          worse: null,
        }),
      );
      expect(columns.map((c) => [c.key, c.type])).toEqual([
        ['s', 'string'],
        ['n', 'number'],
        ['i', 'integer'],
        ['b', 'boolean'],
        ['o', 'other'],
        ['u', 'other'],
      ]);
    });
  });

  describe('tableRows', () => {
    it('returns plain-object rows and [] for anything that is not an array', () => {
      const a = { x: 1 };
      const b = { x: 2 };
      expect(tableRows([a, 'no', null, [1], b, 3])).toEqual([a, b]);
      expect(tableRows([a])[0]).toBe(a);
      expect(tableRows(undefined)).toEqual([]);
      expect(tableRows({ x: 1 })).toEqual([]);
      expect(tableRows('rows')).toEqual([]);
    });
  });

  describe('formatCell', () => {
    it('formats empty, boolean, number, string and other values', () => {
      expect(formatCell(undefined)).toBe('');
      expect(formatCell(null)).toBe('');
      expect(formatCell(true)).toBe('Yes');
      expect(formatCell(false)).toBe('No');
      expect(formatCell(0)).toBe('0');
      expect(formatCell(2.5)).toBe('2.5');
      expect(formatCell('<b>hi</b>')).toBe('<b>hi</b>');
      expect(formatCell({ a: 1 })).toBe('{"a":1}');
      expect(formatCell([1, 2])).toBe('[1,2]');
    });
  });
});
