import { describe, expect, it } from 'vitest';
import { ensureContentIds, ensureIds, idOf, newId } from '../src/studio/element-ids';

const NANOID_8 = /^[\w-]{8}$/;

describe('newId', () => {
  it('is a nanoid(8)', () => {
    expect(newId()).toMatch(NANOID_8);
  });
});

describe('ensureIds', () => {
  it('stamps an id on every element that lacks one, at any depth, keeping existing ids and options', () => {
    const next = ensureIds({
      type: 'Funnel',
      options: { edges: [] },
      elements: [
        { id: 'keep', type: 'Form', elements: [{ type: 'Control', scope: '#/properties/x' }] },
        { type: 'Form', elements: [] },
      ],
    });
    const [first, second] = next['elements'] as Record<string, unknown>[];

    expect(idOf(next)).toMatch(NANOID_8);
    expect(next['options']).toEqual({ edges: [] });
    expect(idOf(first!)).toBe('keep');
    expect(idOf((first!['elements'] as Record<string, unknown>[])[0]!)).toMatch(NANOID_8);
    expect(idOf(second!)).toMatch(NANOID_8);
  });

  it('returns the same object when every element already has an id, and leaves an empty variant alone', () => {
    const identified = { id: 'a', type: 'Form', elements: [{ id: 'b', type: 'Label' }] };
    const empty = {};

    expect(ensureIds(identified)).toBe(identified);
    expect(ensureIds(empty)).toBe(empty);
  });
});

describe('ensureContentIds', () => {
  it('stamps every variant, and returns the same content when nothing needed an id', () => {
    const content = {
      schema: {},
      variants: { default: { type: 'Form', elements: [] }, compact: {} },
    };
    const next = ensureContentIds(content);

    expect(idOf(next.variants.default)).toMatch(NANOID_8);
    expect(next.variants['compact']).toEqual({});
    expect(ensureContentIds(next)).toBe(next);
  });
});

describe('ensureIds on a Funnel', () => {
  it('stamps an id on every condition that lacks one, keeping the rest of its options', () => {
    const next = ensureIds({
      id: 'f',
      type: 'Funnel',
      elements: [],
      options: {
        edges: [],
        conditions: [
          { type: 'Condition', options: { rows: [] } },
          { id: 'keep', type: 'Condition' },
        ],
      },
    });
    const { conditions, edges } = next['options'] as {
      conditions: Record<string, unknown>[];
      edges: unknown[];
    };

    expect(conditions[0]!['id']).toMatch(NANOID_8);
    expect(conditions[1]!['id']).toBe('keep');
    expect(edges).toEqual([]);
  });
});
