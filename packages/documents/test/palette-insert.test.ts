import { describe, expect, it } from 'vitest';
import type { DocumentContent } from '../src/studio/document-types';
import { appendTarget, insertItem } from '../src/studio/palette-insert';

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
    // Doc 277: a placed checkbox must be checked — `const: true` and required, as the inspector writes it.
    expect(next.schema['properties']).toEqual({
      age: { type: 'integer' },
      abc12345: { type: 'boolean', title: 'Untitled checkbox', const: true },
    });
    expect(next.schema['required']).toEqual(['abc12345']);
    expect(before.schema['properties']).not.toHaveProperty('abc12345');
  });

  it('makes a placed field required, keeping what was already required (doc 277)', () => {
    const before: DocumentContent = {
      ...content(),
      schema: { ...content().schema, required: ['age'] },
    };
    const next = insertItem(before, 'form', Infinity, {
      element: { id: 'c1', type: 'Control', scope: '#/properties/t1' },
      properties: { t1: { type: 'string', title: 'Untitled text' } },
    });
    expect(next.schema['required']).toEqual(['age', 't1']);
    expect(next.schema['properties']).toMatchObject({
      t1: { type: 'string', title: 'Untitled text' },
    });
    expect((next.schema['properties'] as Record<string, object>)['t1']).not.toHaveProperty('const');
    // A placed element with no field adds no required entry.
    expect(insertItem(before, 'form', 0, created).schema['required']).toEqual(['age']);
  });

  it('refuses a property key that already exists, and an unknown layout, returning the same content', () => {
    const before = content();
    expect(
      insertItem(before, 'form', 0, { ...created, properties: { age: { type: 'boolean' } } }),
    ).toBe(before);
    expect(insertItem(before, 'missing', 0, created)).toBe(before);
  });
});

describe('appendTarget (doc 238 rule 16)', () => {
  const form = {
    id: 'form',
    type: 'Form',
    elements: [
      heading,
      {
        id: 'v1',
        type: 'VerticalLayout',
        elements: [{ id: 'c1', type: 'Control', scope: '#/properties/a' }],
      },
      { id: 'v2', type: 'VerticalLayout', elements: [] },
    ],
  };

  it('targets the end of a selected nested layout', () => {
    expect(appendTarget(form, 'v1')).toEqual({ layoutId: 'v1', index: Infinity });
    expect(appendTarget(form, 'v2')).toEqual({ layoutId: 'v2', index: Infinity });
  });

  it('targets right after a selected element that is not a layout, in its own layout', () => {
    expect(appendTarget(form, 'h1')).toEqual({ layoutId: 'form', index: 1 });
    expect(appendTarget(form, 'c1')).toEqual({ layoutId: 'v1', index: 1 });
  });

  it('targets the end of the Form with nothing selected, the Form selected, or a stale selection', () => {
    expect(appendTarget(form, null)).toEqual({ layoutId: 'form', index: Infinity });
    expect(appendTarget(form, 'form')).toEqual({ layoutId: 'form', index: Infinity });
    expect(appendTarget(form, 'elsewhere')).toEqual({ layoutId: 'form', index: Infinity });
  });
});
