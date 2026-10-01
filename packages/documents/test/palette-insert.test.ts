import { describe, expect, it } from 'vitest';
import type { DocumentContent } from '../src/studio/document-types';
import { insertItem } from '../src/studio/palette-insert';

const heading = { id: 'h1', type: 'Heading', options: { text: 'Hi' } };
const content = (): DocumentContent => ({
  schema: { type: 'object', properties: { age: { type: 'integer' } } },
  variants: {
    default: {
      id: 'form',
      type: 'Form',
      elements: [heading, { id: 'inner', type: 'VerticalLayout', elements: [] }],
    },
  },
});
const created = { element: { id: 'new', type: 'Heading', options: { level: 2 } } };
const elementsOf = (c: DocumentContent, path: number[] = []) => {
  let node = c.variants.default as Record<string, unknown>;
  for (const i of path) node = (node['elements'] as Record<string, unknown>[])[i]!;
  return (node['elements'] as { id: string }[]).map((e) => e.id);
};

describe('insertItem (doc 238 rule 15)', () => {
  it('splices the element into the layout at the index', () => {
    expect(elementsOf(insertItem(content(), 'form', 0, created))).toEqual(['new', 'h1', 'inner']);
    expect(elementsOf(insertItem(content(), 'form', 1, created))).toEqual(['h1', 'new', 'inner']);
  });

  it('clamps the index, so Infinity appends and a negative index prepends', () => {
    expect(elementsOf(insertItem(content(), 'form', Infinity, created))).toEqual([
      'h1',
      'inner',
      'new',
    ]);
    expect(elementsOf(insertItem(content(), 'form', -3, created))).toEqual(['new', 'h1', 'inner']);
  });

  it('inserts into a nested layout', () => {
    const next = insertItem(content(), 'inner', 0, created);
    expect(elementsOf(next, [1])).toEqual(['new']);
    expect(elementsOf(next)).toEqual(['h1', 'inner']);
  });

  it("adds the creation's schema properties and leaves the rest", () => {
    const before = content();
    const next = insertItem(before, 'form', Infinity, {
      element: { id: 'c1', type: 'Control', scope: '#/properties/abc12345' },
      properties: { abc12345: { type: 'boolean', title: 'Untitled checkbox' } },
    });
    expect(next.schema['properties']).toEqual({
      age: { type: 'integer' },
      abc12345: { type: 'boolean', title: 'Untitled checkbox' },
    });
    expect(before.schema['properties']).not.toHaveProperty('abc12345');
  });

  it('refuses a property key that already exists, and an unknown layout, returning the same content', () => {
    const before = content();
    expect(
      insertItem(before, 'form', 0, { ...created, properties: { age: { type: 'boolean' } } }),
    ).toBe(before);
    expect(insertItem(before, 'missing', 0, created)).toBe(before);
  });
});
