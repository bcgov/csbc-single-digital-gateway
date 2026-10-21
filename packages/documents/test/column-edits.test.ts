import { describe, expect, it } from 'vitest';
import { applyColumnEdit } from '../src/studio/column-edits';
import type { DocumentContent } from '../src/studio/document-types';

const content = (
  columns: Record<string, Record<string, unknown>>,
  required?: string[],
): DocumentContent => ({
  schema: {
    type: 'object',
    properties: {
      people: {
        type: 'array',
        title: 'People',
        items: {
          type: 'object',
          properties: columns,
          ...(required !== undefined && { required }),
        },
      },
      name: { type: 'string', title: 'Name' },
    },
  },
  variants: { default: { type: 'Form', elements: [] } },
});

const itemsOf = (c: DocumentContent) =>
  (c.schema['properties'] as Record<string, Record<string, unknown>>)['people']!['items'] as {
    properties: Record<string, Record<string, unknown>>;
    required?: string[];
  };

const TWO = {
  first: { type: 'string', title: 'First' },
  second: { type: 'number', title: 'Second', minimum: 0, description: 'How many' },
};

describe('applyColumnEdit (doc 263 rules 25-26)', () => {
  describe('add', () => {
    it('appends a string column titled Column n under a fresh key', () => {
      const before = content(TWO);
      const after = applyColumnEdit(before, 'people', { kind: 'add' });
      const { properties } = itemsOf(after);
      const keys = Object.keys(properties);
      expect(keys.slice(0, 2)).toEqual(['first', 'second']);
      expect(keys[2]).toMatch(/^[\w-]{8}$/);
      expect(properties[keys[2]!]).toEqual({ type: 'string', title: 'Column 3' });
      // The other property and the variants are untouched; the input is not mutated.
      expect(after.variants).toBe(before.variants);
      expect(Object.keys(itemsOf(before).properties)).toHaveLength(2);
    });

    it('skips a Column n title already in use', () => {
      const after = applyColumnEdit(
        content({
          a: { type: 'string', title: 'Column 2' },
          b: { type: 'string', title: 'Column 3' },
        }),
        'people',
        { kind: 'add' },
      );
      const titles = Object.values(itemsOf(after).properties).map((c) => c['title']);
      expect(titles).toEqual(['Column 2', 'Column 3', 'Column 4']);
    });
  });

  describe('rename', () => {
    it('sets the trimmed title and refuses a blank one', () => {
      const before = content(TWO);
      const after = applyColumnEdit(before, 'people', {
        kind: 'rename',
        key: 'first',
        title: '  Given name ',
      });
      expect(itemsOf(after).properties['first']).toEqual({ type: 'string', title: 'Given name' });
      expect(applyColumnEdit(before, 'people', { kind: 'rename', key: 'first', title: '  ' })).toBe(
        before,
      );
    });
  });

  describe('retype', () => {
    it('replaces the column keeping only type, title and description', () => {
      const after = applyColumnEdit(content(TWO), 'people', {
        kind: 'retype',
        key: 'second',
        type: 'boolean',
      });
      expect(itemsOf(after).properties['second']).toEqual({
        type: 'boolean',
        title: 'Second',
        description: 'How many',
      });
      expect(Object.keys(itemsOf(after).properties)).toEqual(['first', 'second']);
    });
  });

  describe('move', () => {
    it('reorders the columns with a clamped index', () => {
      const three = { ...TWO, third: { type: 'boolean', title: 'Third' } };
      const order = (to: number, key = 'first') =>
        Object.keys(
          itemsOf(applyColumnEdit(content(three), 'people', { kind: 'move', key, to })).properties,
        );
      expect(order(1)).toEqual(['second', 'first', 'third']);
      expect(order(99)).toEqual(['second', 'third', 'first']);
      expect(order(-3, 'third')).toEqual(['third', 'first', 'second']);
    });
  });

  describe('remove', () => {
    it('deletes the column and its items.required entry', () => {
      const after = applyColumnEdit(content(TWO, ['first', 'second']), 'people', {
        kind: 'remove',
        key: 'second',
      });
      expect(Object.keys(itemsOf(after).properties)).toEqual(['first']);
      expect(itemsOf(after).required).toEqual(['first']);
      const emptied = applyColumnEdit(content(TWO, ['second']), 'people', {
        kind: 'remove',
        key: 'second',
      });
      expect(itemsOf(emptied)).not.toHaveProperty('required');
    });

    it('refuses to remove the last column', () => {
      const one = content({ only: { type: 'string', title: 'Only' } });
      expect(applyColumnEdit(one, 'people', { kind: 'remove', key: 'only' })).toBe(one);
    });
  });

  describe('identity', () => {
    it('returns the same content for unknown property, non-object array, unknown key or no change', () => {
      const before = content(TWO);
      expect(applyColumnEdit(before, 'missing', { kind: 'add' })).toBe(before);
      expect(applyColumnEdit(before, 'name', { kind: 'add' })).toBe(before);
      expect(applyColumnEdit(before, 'people', { kind: 'rename', key: 'nope', title: 'X' })).toBe(
        before,
      );
      expect(
        applyColumnEdit(before, 'people', { kind: 'rename', key: 'first', title: 'First' }),
      ).toBe(before);
      expect(applyColumnEdit(before, 'people', { kind: 'move', key: 'first', to: 0 })).toBe(before);
      expect(
        applyColumnEdit(before, 'people', { kind: 'retype', key: 'first', type: 'string' }),
      ).toBe(before);
    });
  });
});
