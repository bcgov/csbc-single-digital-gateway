import { describe, expect, it } from 'vitest';
import { reorderElements } from '../src/renderers/studio/element-order';

const a = { id: 'a', type: 'Heading' };
const b = { id: 'b', type: 'Heading' };
const c = { id: 'c', type: 'Heading' };

describe('reorderElements (doc 236)', () => {
  it('reorders elements to match the ordered ids', () => {
    const next = reorderElements([a, b, c], ['c', 'a', 'b']);
    expect(next).toEqual([c, a, b]);
    expect(next[0]).toBe(c);
  });

  it('keeps elements missing from the id list at the end in their relative order', () => {
    const anonymous = { type: 'Heading' };
    expect(reorderElements([a, anonymous, b, c], ['b'])).toEqual([b, a, anonymous, c]);
    expect(reorderElements([a, b], [])).toEqual([a, b]);
  });

  it('returns the same array when the order is unchanged', () => {
    const elements = [a, b, c];
    expect(reorderElements(elements, ['a', 'b', 'c'])).toBe(elements);
    expect(reorderElements(elements, ['a', 'b'])).toBe(elements);
  });
});
