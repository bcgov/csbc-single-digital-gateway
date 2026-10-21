import { describe, expect, it } from 'vitest';
import { cascadeCapabilities } from '../src/studio/capabilities/capability-cascade';
import type { CapabilityMap } from '../src/studio/capabilities/capability-types';
import { control } from './funnel-fixtures';

/** F › [a, L › [b, M › [c]]] */
const tree = {
  id: 'F',
  type: 'Form',
  elements: [
    control('a'),
    {
      id: 'L',
      type: 'VerticalLayout',
      elements: [control('b'), { id: 'M', type: 'VerticalLayout', elements: [control('c')] }],
    },
    { type: 'Separator' },
  ],
};

describe('cascadeCapabilities (doc 258 rule 8)', () => {
  it('self writes nothing below', () => {
    const map: CapabilityMap = {};
    expect(cascadeCapabilities(map, tree, 'removeChildren', false, 'self')).toBe(map);
  });

  it('children: each direct child takes the element-level counterpart only', () => {
    const next = cascadeCapabilities({}, tree, 'removeChildren', false, 'children');
    expect(next.elements).toEqual({ 'c-a': { remove: false }, L: { remove: false } });
  });

  it('descendants: every descendant, containers also take the contents key', () => {
    const next = cascadeCapabilities({}, tree, 'reorderChildren', false, 'descendants');
    expect(next.elements).toEqual({
      'c-a': { move: false },
      L: { move: false, reorderChildren: false },
      'c-b': { move: false },
      M: { move: false, reorderChildren: false },
      'c-c': { move: false },
    });
  });

  it('addChildren reaches only containers', () => {
    expect(cascadeCapabilities({}, tree, 'addChildren', false, 'children').elements).toEqual({
      L: { addChildren: false },
    });
    expect(cascadeCapabilities({}, tree, 'addChildren', false, 'descendants').elements).toEqual({
      L: { addChildren: false },
      M: { addChildren: false },
    });
  });

  it('keeps every other key and the target cascade, and overwrites only mapped keys', () => {
    const map: CapabilityMap = {
      elements: { 'c-a': { remove: false, edit: 'none', cascade: 'self' } },
    };
    const next = cascadeCapabilities(map, tree, 'removeChildren', true, 'children');
    expect(next.elements?.['c-a']).toEqual({ remove: true, edit: 'none', cascade: 'self' });
    expect(map.elements?.['c-a']).toEqual({ remove: false, edit: 'none', cascade: 'self' });
  });
});
