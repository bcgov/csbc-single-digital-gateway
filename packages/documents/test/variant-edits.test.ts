import { describe, expect, it } from 'vitest';
import { variantOf, type DocumentContent } from '../src/studio/document-types';
import {
  createVariant,
  deleteVariant,
  renameVariant,
  variantNames,
} from '../src/studio/variants/variant-edits';

const content = (): DocumentContent => ({
  schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
  variants: {
    default: {
      id: 'f',
      type: 'Form',
      elements: [{ id: 'c', type: 'Control', scope: '#/properties/name' }],
    },
    Mobile: { id: 'm', type: 'Form', elements: [] },
    Print: { id: 'p', type: 'Form', elements: [] },
  },
  capabilities: { elements: { c: { edit: 'none' } } },
});

describe('variant edits (doc 262 rules 6, 9, 10)', () => {
  it('createVariant adds a blank Form root with a fresh id under the trimmed name', () => {
    const before = content();
    const next = createVariant(before, '  Kiosk ');
    expect(variantNames(next)).toEqual(['default', 'Mobile', 'Print', 'Kiosk']);
    const kiosk = next.variants['Kiosk']!;
    expect(kiosk).toMatchObject({ type: 'Form', elements: [] });
    expect(typeof kiosk['id']).toBe('string');
    expect(['f', 'm', 'p', 'c']).not.toContain(kiosk['id']);
    expect(next.schema).toBe(before.schema);
    expect(next.capabilities).toBe(before.capabilities);
  });

  it('createVariant returns the same content for an invalid name', () => {
    const before = content();
    expect(createVariant(before, 'mobile')).toBe(before);
    expect(createVariant(before, '')).toBe(before);
    expect(createVariant(before, '__proto__')).toBe(before);
  });

  it('renameVariant re-keys in place, keeping key order and the uischema', () => {
    const before = content();
    const next = renameVariant(before, 'Mobile', ' Phone ');
    expect(variantNames(next)).toEqual(['default', 'Phone', 'Print']);
    expect(next.variants['Phone']).toBe(before.variants['Mobile']);
    expect(Object.hasOwn(next.variants, 'Mobile')).toBe(false);
    expect(renameVariant(before, 'Mobile', 'Mobile')).toBe(before);
    expect(renameVariant(before, 'Mobile', 'print')).toBe(before);
    expect(renameVariant(before, 'Nope', 'Phone')).toBe(before);
  });

  it('renameVariant never renames default', () => {
    const before = content();
    expect(renameVariant(before, 'default', 'Main')).toBe(before);
  });

  it('deleteVariant removes the key and never touches the schema or capabilities', () => {
    const before = content();
    const next = deleteVariant(before, 'Mobile');
    expect(variantNames(next)).toEqual(['default', 'Print']);
    expect(next.schema).toBe(before.schema);
    expect(next.capabilities).toBe(before.capabilities);
    expect(deleteVariant(before, 'Nope')).toBe(before);
  });

  it('deleteVariant never deletes default', () => {
    const before = content();
    expect(deleteVariant(before, 'default')).toBe(before);
  });

  it('variantOf returns {} for an unknown name', () => {
    const c = content();
    expect(variantOf(c, 'Print')).toBe(c.variants['Print']);
    expect(variantOf(c)).toBe(c.variants.default);
    expect(variantOf(c, 'Nope')).toEqual({});
    expect(variantOf(c, 'toString')).toEqual({});
  });
});
