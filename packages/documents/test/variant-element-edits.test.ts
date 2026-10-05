import { describe, expect, it } from 'vitest';
import { governanceOf } from '../src/studio/capabilities/governance';
import type { DocumentContent, Uischema } from '../src/studio/document-types';
import { copyElement } from '../src/studio/element-copy';
import { removeElement } from '../src/studio/element-remove';
import { insertItem } from '../src/studio/palette-insert';

const name = (id: string): Uischema => ({ id, type: 'Control', scope: '#/properties/name' });
const content = (): DocumentContent => ({
  schema: {
    type: 'object',
    properties: { name: { type: 'string' }, email: { type: 'string' } },
    required: ['name'],
  },
  variants: {
    default: {
      id: 'f',
      type: 'Form',
      elements: [name('d-name'), { id: 'd-email', type: 'Control', scope: '#/properties/email' }],
    },
    Mobile: {
      id: 'm',
      type: 'Form',
      elements: [
        { id: 'm-h', type: 'Heading', options: { text: 'Hi' } },
        { id: 'm-v', type: 'VerticalLayout', elements: [name('m-name')] },
      ],
    },
  },
});
const idsOf = (node: Uischema | undefined) =>
  ((node?.['elements'] ?? []) as Uischema[]).map((e) => e['id']);

describe('element edits on a non-default variant (doc 262 rules 13b-d, 17)', () => {
  it('insertItem splices into the named variant only', () => {
    const before = content();
    const email = { element: { id: 'new', type: 'Control', scope: '#/properties/email' } };
    const next = insertItem(before, 'm', 1, email, undefined, 'Mobile');
    expect(idsOf(next.variants['Mobile'])).toEqual(['m-h', 'new', 'm-v']);
    expect(next.variants.default).toBe(before.variants.default);
    expect(next.schema).toBe(before.schema);
    const heading = { element: { id: 'h2', type: 'Heading' } };
    const nested = insertItem(before, 'm-v', 0, heading, undefined, 'Mobile').variants['Mobile']!;
    expect(idsOf((nested['elements'] as Uischema[])[1])).toEqual(['h2', 'm-name']);
  });

  it('insertItem refuses a creation with properties outside default', () => {
    const before = content();
    const field = {
      element: { id: 'n', type: 'Control', scope: '#/properties/fresh' },
      properties: { fresh: { type: 'string' } },
    };
    expect(insertItem(before, 'm', 0, field, undefined, 'Mobile')).toBe(before);
    // Default still takes new fields.
    expect(insertItem(before, 'f', 0, field).schema['properties']).toHaveProperty('fresh');
  });

  it('insertItem refuses a Control whose scope the variant already binds', () => {
    const before = content();
    const again = { element: name('again') };
    expect(insertItem(before, 'm', 0, again, undefined, 'Mobile')).toBe(before);
    const wrapped = { element: { id: 'w', type: 'VerticalLayout', elements: [name('again')] } };
    expect(insertItem(before, 'm', 0, wrapped, undefined, 'Mobile')).toBe(before);
  });

  it('copyElement copies a content element in a variant with fresh ids and no schema change', () => {
    const before = content();
    const result = copyElement(before, 'm-h', 'Mobile');
    expect(result).toBeDefined();
    expect(idsOf(result!.content.variants['Mobile'])).toEqual(['m-h', result!.copyId, 'm-v']);
    expect(result!.content.schema).toBe(before.schema);
    expect(result!.content.variants.default).toBe(before.variants.default);
  });

  it('copyElement refuses an element that is or contains a Control outside default', () => {
    const before = content();
    expect(copyElement(before, 'm-name', 'Mobile')).toBeUndefined();
    expect(copyElement(before, 'm-v', 'Mobile')).toBeUndefined();
    // In default a field still copies as a new field.
    expect(
      Object.keys(copyElement(before, 'd-name')!.content.schema['properties'] as object),
    ).toHaveLength(3);
  });

  it('removeElement in a variant keeps a property default still binds', () => {
    const before = content();
    const next = removeElement(before, 'm-v', 'Mobile');
    expect(idsOf(next.variants['Mobile'])).toEqual(['m-h']);
    expect(next.schema).toBe(before.schema);
    expect(next.variants.default).toBe(before.variants.default);
  });

  it('governanceOf indexes the named variant', () => {
    const map = { elements: { 'm-v': { addChildren: false }, 'd-name': { remove: false } } };
    const mobile = governanceOf(content(), map, 'Mobile')!;
    expect(mobile.canAdd('m-v')).toBe(false);
    expect(mobile.canAdd('m')).toBe(true);
    // Default's elements are not in Mobile's index.
    expect(mobile.canAdd('f')).toBe(false);
    const byDefault = governanceOf(content(), map)!;
    expect(byDefault.canRemove('d-name')).toBe(false);
    expect(byDefault.canAdd('m-v')).toBe(false);
    expect(byDefault.canAdd('f')).toBe(true);
  });
});
