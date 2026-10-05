import { describe, expect, it } from 'vitest';
import { propertyAt, refOfScope, requiredAt, scopeOf, withOwner } from '../src/studio/property-ref';
import type { DocumentContent } from '../src/studio/document-types';
import { setRequired, updateProperty } from '../src/studio/inspector/schema-edits';

const SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name' },
    people: {
      type: 'array',
      items: {
        type: 'object',
        properties: { first: { type: 'string', title: 'First' } },
        required: ['first'],
      },
    },
  },
  required: ['name'],
};
const content = { schema: SCHEMA, variants: { default: {} } } as DocumentContent;
const itemOf = (c: DocumentContent) =>
  (c.schema['properties'] as { people: { items: Record<string, unknown> } }).people.items;

describe('property references (doc 271 rule 2)', () => {
  it('parses page and item scopes and nothing else', () => {
    expect(refOfScope('#/properties/name')).toEqual({ key: 'name' });
    expect(refOfScope('#/properties/people/items/properties/first')).toEqual({
      array: 'people',
      key: 'first',
    });
    for (const scope of ['#/properties/a/properties/b', '#', 'name', 3, undefined])
      expect(refOfScope(scope)).toBeUndefined();
    expect(scopeOf({ array: 'people', key: 'first' })).toBe(
      '#/properties/people/items/properties/first',
    );
    expect(scopeOf({ key: 'name' })).toBe('#/properties/name');
  });

  it('reads an item property and its required flag from items', () => {
    expect(propertyAt(SCHEMA, { array: 'people', key: 'first' })).toEqual({
      type: 'string',
      title: 'First',
    });
    expect(requiredAt(SCHEMA, { array: 'people', key: 'first' })).toBe(true);
    expect(requiredAt(SCHEMA, { key: 'name' })).toBe(true);
    expect(propertyAt(SCHEMA, { array: 'nope', key: 'first' })).toBeUndefined();
    expect(withOwner(SCHEMA, { array: 'nope', key: 'x' }, () => ({}))).toBe(SCHEMA);
  });

  it('updates and requires an item property inside items, leaving the root alone', () => {
    const ref = { array: 'people', key: 'first' };
    const titled = updateProperty(content, ref, { title: 'Given name' });
    expect(itemOf(titled)['properties']).toEqual({
      first: { type: 'string', title: 'Given name' },
    });
    expect(titled.schema['required']).toEqual(['name']);
    const optional = setRequired(titled, ref, false);
    expect(itemOf(optional)).not.toHaveProperty('required');
    expect(optional.schema['required']).toEqual(['name']);
    expect(updateProperty(content, ref, { title: 'First' })).toBe(content);
    // A plain string is still a page key.
    expect(
      updateProperty(content, 'name', { title: 'Full name' }).schema['properties'],
    ).toMatchObject({
      name: { title: 'Full name' },
    });
  });
});
