import { describe, expect, it } from 'vitest';
import { contentChanged, type DocumentContent } from '../src/studio/document-types';
import { copyElement } from '../src/studio/element-copy';
import { removeElement } from '../src/studio/element-remove';
import { renamePropertyKey } from '../src/studio/inspector/property-rename';
import { control, form } from './funnel-fixtures';

const layout = { id: 'L', type: 'VerticalLayout', elements: [control('b')] };
const content: DocumentContent = {
  schema: { type: 'object', properties: { a: { type: 'string' }, b: { type: 'string' } } },
  variants: { default: form('F', 'Page', [control('a'), layout]) },
  capabilities: {
    elements: {
      F: { addChildren: false },
      L: { remove: false, reorderChildren: false },
      'c-b': { move: false },
      'c-a': { edit: 'none' },
    },
  },
};

describe('content hygiene with capabilities (doc 258 rules 10-14)', () => {
  it('a capabilities change marks the content dirty (rule 10)', () => {
    const { capabilities, ...without } = content;
    expect(capabilities).toBeDefined();
    expect(contentChanged(content, without as DocumentContent)).toBe(true);
    expect(contentChanged(content, { ...content })).toBe(false);
  });

  it('delete prunes the removed subtree’s entries (rule 11)', () => {
    const next = removeElement(content, 'L');
    expect(next.capabilities).toEqual({
      elements: { F: { addChildren: false }, 'c-a': { edit: 'none' } },
    });
  });

  it('delete drops an emptied map entirely (rule 11)', () => {
    const only: DocumentContent = {
      ...content,
      capabilities: { elements: { 'c-a': { edit: 'none' } } },
    };
    expect(removeElement(only, 'c-a')).not.toHaveProperty('capabilities');
  });

  it('delete without entries leaves the map untouched', () => {
    const plain: DocumentContent = {
      ...content,
      capabilities: { elements: { F: { addChildren: false } } },
    };
    expect(removeElement(plain, 'c-a').capabilities).toBe(plain.capabilities);
  });

  it('copy carries each copied element’s entry to its new id (rule 12)', () => {
    const result = copyElement(content, 'L')!;
    const copy = (result.content.variants.default['elements'] as Record<string, unknown>[])[2]!;
    const inner = (copy['elements'] as Record<string, unknown>[])[0]!;
    const entries = result.content.capabilities!.elements!;
    expect(entries[copy['id'] as string]).toEqual({ remove: false, reorderChildren: false });
    expect(entries[inner['id'] as string]).toEqual({ move: false });
    expect(entries['L']).toEqual({ remove: false, reorderChildren: false });
  });

  it('rename keeps capabilities (rule 13)', () => {
    expect(renamePropertyKey(content, 'a', 'aa').capabilities).toBe(content.capabilities);
  });
});
