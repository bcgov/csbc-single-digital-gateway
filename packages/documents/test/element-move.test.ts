import { describe, expect, it } from 'vitest';
import type { Uischema } from '../src/studio/document-types';
import { moveElement } from '../src/studio/element-move';

const heading = (id: string) => ({ id, type: 'Heading', options: { text: id } });

/** root Form: [h1, v1: [h2, v2: [h3]], c1] */
function page(): Uischema {
  return {
    id: 'root',
    type: 'Form',
    elements: [
      heading('h1'),
      {
        id: 'v1',
        type: 'VerticalLayout',
        elements: [heading('h2'), { id: 'v2', type: 'VerticalLayout', elements: [heading('h3')] }],
      },
      { id: 'c1', type: 'Control', scope: '#/properties/name' },
    ],
  };
}

/** The ids of `node`'s elements, nested as arrays. */
function shape(node: unknown): unknown {
  const n = node as { id?: string; elements?: unknown[] };
  return n.elements === undefined ? n.id : [n.id, n.elements.map(shape)];
}

const elementsOf = (node: Uischema, ...path: number[]) =>
  path.reduce<Uischema>((at, i) => (at['elements'] as Uischema[])[i]!, node);

describe('moveElement (doc 243 rules 1-4)', () => {
  it('moves a root element into a nested layout at the index', () => {
    const next = moveElement(page(), 'h1', 'v2', 0);
    expect(shape(next)).toEqual(['root', [['v1', ['h2', ['v2', ['h1', 'h3']]]], 'c1']]);
  });

  it('moves a nested element out to the root', () => {
    const next = moveElement(page(), 'h3', 'root', 1);
    expect(shape(next)).toEqual(['root', ['h1', 'h3', ['v1', ['h2', ['v2', []]]], 'c1']]);
  });

  it('moves a layout with its whole subtree', () => {
    const next = moveElement(page(), 'v2', 'root', 0);
    expect(shape(next)).toEqual(['root', [['v2', ['h3']], 'h1', ['v1', ['h2']], 'c1']]);
  });

  it('clamps the index to the target list after the removal', () => {
    expect(shape(moveElement(page(), 'h1', 'v1', 99))).toEqual([
      'root',
      [['v1', ['h2', ['v2', ['h3']], 'h1']], 'c1'],
    ]);
    expect(shape(moveElement(page(), 'h1', 'v1', -5))).toEqual([
      'root',
      [['v1', ['h1', 'h2', ['v2', ['h3']]]], 'c1'],
    ]);
  });

  it('reorders within the same layout, counting the index after the removal', () => {
    const next = moveElement(page(), 'h1', 'root', 2);
    expect(shape(next)).toEqual(['root', [['v1', ['h2', ['v2', ['h3']]]], 'c1', 'h1']]);
  });

  it('returns the SAME uischema for a move to its current place', () => {
    const before = page();
    expect(moveElement(before, 'h1', 'root', 0)).toBe(before);
    expect(moveElement(before, 'h3', 'v2', 0)).toBe(before);
  });

  it.each([
    ['an unknown element', 'nope', 'v1'],
    ['the root', 'root', 'v1'],
    ['an unknown target', 'h1', 'nope'],
    ['a target without elements', 'h1', 'h2'],
    ['a layout into itself', 'v1', 'v1'],
    ['a layout into its own descendant', 'v1', 'v2'],
  ])('refuses %s with the SAME uischema', (_, id, target) => {
    const before = page();
    expect(moveElement(before, id, target, 0)).toBe(before);
  });

  it('keeps the identity of untouched subtrees and never touches the moved element', () => {
    const before = page();
    const moved = elementsOf(before, 2);
    const next = moveElement(before, 'c1', 'v2', 1);
    expect(elementsOf(next, 0)).toBe(elementsOf(before, 0));
    expect(elementsOf(next, 1, 1, 1)).toBe(moved);
    expect(elementsOf(next, 1, 0)).toBe(elementsOf(before, 1, 0));
    expect(before).toEqual(page());
  });
});
