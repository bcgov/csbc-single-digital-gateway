import { describe, expect, it } from 'vitest';
import { columnKeyProblem } from '../src/renderers/ui/object-array';
import { applyColumnEdit } from '../src/studio/column-edits';
import type { DocumentContent } from '../src/studio/document-types';

const table = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      a: { type: 'string', title: 'A' },
      b: { type: 'number', title: 'B' },
      c: { type: 'boolean', title: 'C' },
    },
    required: ['b'],
  },
};
const content = {
  schema: { type: 'object', properties: { t: table } },
  variants: { default: {} },
} as DocumentContent;
const itemsOf = (c: DocumentContent) =>
  (c.schema['properties'] as Record<string, { items: Record<string, unknown> }>)['t']!.items;

describe('column data keys (doc 264 rules 9-11)', () => {
  describe('columnKeyProblem', () => {
    it('requires a key of letters, digits, _ or -, not __proto__, unique among columns', () => {
      expect(columnKeyProblem(table, 'a', '  ')).toBe('A key is required.');
      expect(columnKeyProblem(table, 'a', 'first name')).toBe('Use letters, numbers, _ or -.');
      expect(columnKeyProblem(table, 'a', 'naïve')).toBe('Use letters, numbers, _ or -.');
      expect(columnKeyProblem(table, 'a', '__proto__')).toBe('__proto__ is reserved.');
      expect(columnKeyProblem(table, 'a', 'b')).toBe('b is already used.');
      expect(columnKeyProblem(table, 'a', 'first_name-2')).toBeUndefined();
    });

    it('accepts the unchanged key', () => {
      expect(columnKeyProblem(table, 'a', 'a')).toBeUndefined();
      expect(columnKeyProblem(table, 'a', ' a ')).toBeUndefined();
    });
  });

  describe('rekey', () => {
    it('renames the column in place keeping order and its items.required entry', () => {
      const next = applyColumnEdit(content, 't', { kind: 'rekey', key: 'b', to: ' weight ' });
      const items = itemsOf(next);
      expect(Object.keys(items['properties'] as object)).toEqual(['a', 'weight', 'c']);
      expect((items['properties'] as Record<string, unknown>)['weight']).toEqual({
        type: 'number',
        title: 'B',
      });
      expect(items['required']).toEqual(['weight']);
      // A column outside `required` leaves it as it was.
      const plain = itemsOf(applyColumnEdit(content, 't', { kind: 'rekey', key: 'a', to: 'x' }));
      expect(Object.keys(plain['properties'] as object)).toEqual(['x', 'b', 'c']);
      expect(plain['required']).toEqual(['b']);
    });

    it('returns the same content for an unchanged or invalid key', () => {
      for (const to of ['a', ' a', 'b', 'bad key', '', '__proto__'])
        expect(applyColumnEdit(content, 't', { kind: 'rekey', key: 'a', to })).toBe(content);
      expect(applyColumnEdit(content, 't', { kind: 'rekey', key: 'zz', to: 'q' })).toBe(content);
    });
  });
});
