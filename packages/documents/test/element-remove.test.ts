import { describe, expect, it } from 'vitest';
import type { DocumentContent } from '../src/studio/document-types';
import { removeElement } from '../src/studio/element-remove';

const control = (id: string, key: string) => ({
  id,
  type: 'Control',
  scope: `#/properties/${key}`,
});

function content(extra: Record<string, unknown> = {}): DocumentContent {
  return {
    schema: {
      type: 'object',
      properties: { name: { type: 'string' }, age: { type: 'integer' }, kept: { type: 'string' } },
      required: ['name', 'age'],
    },
    variants: {
      default: {
        id: 'root',
        type: 'Form',
        elements: [
          { id: 'h1', type: 'Heading', options: { text: 'Hi' } },
          {
            id: 'v1',
            type: 'VerticalLayout',
            elements: [control('c1', 'name'), control('c2', 'age')],
          },
          control('c3', 'kept'),
        ],
      },
      ...extra,
    },
  };
}

const ids = (c: DocumentContent) => JSON.stringify(c.variants.default).match(/"id":"[^"]+"/g);

describe('removeElement (doc 242 rules 5-6)', () => {
  it('removes an element with no binding and leaves the schema untouched', () => {
    const before = content();
    const after = removeElement(before, 'h1');

    expect(ids(after)).not.toContain('"id":"h1"');
    expect(after.schema).toBe(before.schema);
  });

  it('removes a Control and its now-unreferenced property, from properties and required', () => {
    const after = removeElement(content(), 'c1');

    expect(ids(after)).not.toContain('"id":"c1"');
    expect(Object.keys(after.schema['properties'] as object)).toEqual(['age', 'kept']);
    expect(after.schema['required']).toEqual(['age']);
  });

  it('removes a layout with its whole subtree, cleaning every property it bound — dropping an emptied required', () => {
    const after = removeElement(content(), 'v1');

    expect(ids(after)).toEqual(['"id":"root"', '"id":"h1"', '"id":"c3"']);
    expect(Object.keys(after.schema['properties'] as object)).toEqual(['kept']);
    expect(after.schema).not.toHaveProperty('required');
  });

  it('keeps a property another Control still references — in this variant or any other', () => {
    const twice = content();
    (twice.variants.default['elements'] as unknown[]).push(control('c4', 'name'));
    expect(removeElement(twice, 'c1').schema['properties']).toHaveProperty('name');

    const elsewhere = content({
      short: { id: 'r2', type: 'Form', elements: [control('x', 'name')] },
    });
    expect(removeElement(elsewhere, 'c1').schema['properties']).toHaveProperty('name');

    const deeper = content({
      short: { id: 'r2', type: 'Form', elements: [control('x', 'name/properties/first')] },
    });
    expect(removeElement(deeper, 'c1').schema['properties']).toHaveProperty('name');
  });

  it('never removes the root, and returns the SAME content for an unknown id', () => {
    const before = content();

    expect(removeElement(before, 'root')).toBe(before);
    expect(removeElement(before, 'nope')).toBe(before);
  });
});
