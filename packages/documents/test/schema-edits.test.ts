import { describe, expect, it } from 'vitest';
import type { DocumentContent } from '../src/studio/document-types';
import { setRequired, updateProperty } from '../src/studio/inspector/schema-edits';

const content = (schema: Record<string, unknown>): DocumentContent => ({
  schema,
  variants: { default: { id: 'F', type: 'Form' } },
});

describe('schema edits (doc 249)', () => {
  it('updateProperty merges a patch into one property, removing undefined keys', () => {
    const before = content({
      type: 'object',
      properties: { a: { type: 'string', title: 'A', maxLength: 5 }, b: { type: 'boolean' } },
    });
    const after = updateProperty(before, 'a', {
      title: 'Name',
      maxLength: undefined,
      minLength: 1,
    });
    expect(after.schema['properties']).toEqual({
      a: { type: 'string', title: 'Name', minLength: 1 },
      b: { type: 'boolean' },
    });
    expect(before.schema['properties']).toEqual({
      a: { type: 'string', title: 'A', maxLength: 5 },
      b: { type: 'boolean' },
    });
    expect(after.variants).toBe(before.variants);
  });

  it('updateProperty returns the same content for an unknown key or a no-op patch', () => {
    const before = content({ type: 'object', properties: { a: { type: 'string', title: 'A' } } });
    expect(updateProperty(before, 'zz', { title: 'B' })).toBe(before);
    expect(updateProperty(before, 'a', { title: 'A', maxLength: undefined })).toBe(before);
    expect(updateProperty(content({ type: 'object' }), 'a', { title: 'B' }).schema).toEqual({
      type: 'object',
    });
  });

  it('setRequired adds, removes and drops an empty required array', () => {
    const before = content({ type: 'object', properties: {}, required: ['a'] });
    const added = setRequired(before, 'b', true);
    const removed = setRequired(added, 'a', false);
    const emptied = setRequired(removed, 'b', false);
    expect(added.schema['required']).toEqual(['a', 'b']);
    expect(removed.schema['required']).toEqual(['b']);
    expect(emptied.schema).toEqual({ type: 'object', properties: {} });
    expect(setRequired(before, 'a', true)).toBe(before);
    expect(setRequired(emptied, 'a', false)).toBe(emptied);
  });
});
