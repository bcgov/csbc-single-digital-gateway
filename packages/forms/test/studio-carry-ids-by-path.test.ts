import type { UISchemaElement } from '@jsonforms/core';
import { describe, it, expect } from 'vitest';
import { carryIdsByPath } from '../src/studio/layout/carry-ids-by-path';
import { createElementIds, type ElementIds } from '../src/studio/layout/element-ids';
import type { TreeElement } from '../src/studio/layout/element-tree';

// Doc 191 rule 23 — carrying studio element ids from a replaced uischema by tree path.

const el = (element: object) => element as UISchemaElement;
const clone = (element: UISchemaElement) => JSON.parse(JSON.stringify(element)) as TreeElement;
const child = (element: UISchemaElement, ...path: number[]) =>
  path.reduce<TreeElement>((node, index) => (node.elements ?? [])[index] as TreeElement, element);

/** Every element's id, depth-first (root first). */
function allIds(root: UISchemaElement, ids: ElementIds): string[] {
  const tree = root as TreeElement;
  return [ids.idOf(tree), ...(tree.elements ?? []).flatMap((element) => allIds(element, ids))];
}

function fixture() {
  const ids = createElementIds();
  const heading = el({ type: 'Heading', text: 'H' });
  const field = el({ type: 'Control', scope: '#/properties/a' });
  const grid = el({ type: 'Grid', elements: [field, el({ type: 'Heading', text: 'G' })] });
  const root = el({ type: 'VerticalLayout', elements: [heading, grid] });
  const before = allIds(root, ids);
  return { ids, root, before };
}

describe('carryIdsByPath (doc 191 rule 23)', () => {
  it('carries the root and every element at the same index path with the same type', () => {
    const { ids, root, before } = fixture();
    const next = clone(root);
    (child(next, 0) as { text?: string }).text = 'Changed';
    carryIdsByPath(root, next, ids);
    expect(allIds(next, ids)).toEqual(before);
    expect(ids.idOf(child(next, 1, 0))).toBe(ids.idOf(child(root, 1, 0)));
  });

  it('carries ids into structurally identical but newly parsed objects', () => {
    const { ids, root, before } = fixture();
    const next = clone(root);
    expect(next).not.toBe(root);
    carryIdsByPath(root, next, ids);
    expect(allIds(next, ids)).toEqual(before);
  });

  it('gives an element whose type changed, and its whole subtree, fresh ids', () => {
    const { ids, root, before } = fixture();
    const next = clone(root);
    const grid = child(next, 1);
    grid.type = 'VerticalLayout';
    carryIdsByPath(root, next, ids);
    const after = allIds(next, ids);
    expect(after.slice(0, 2)).toEqual(before.slice(0, 2));
    for (const id of after.slice(2)) expect(before).not.toContain(id);
    expect(new Set(after).size).toBe(after.length);
  });

  it('gives appended elements fresh ids and drops ids of removed ones', () => {
    const { ids, root, before } = fixture();
    const appended = clone(root);
    appended.elements?.push(el({ type: 'Heading', text: 'New' }));
    carryIdsByPath(root, appended, ids);
    const withNew = allIds(appended, ids);
    expect(withNew.slice(0, before.length)).toEqual(before);
    expect(before).not.toContain(withNew.at(-1));

    const fresh = fixture();
    const removed = clone(fresh.root);
    removed.elements = (removed.elements ?? []).slice(0, 1);
    carryIdsByPath(fresh.root, removed, fresh.ids);
    expect(allIds(removed, fresh.ids)).toEqual(fresh.before.slice(0, 2));
  });

  it('carries by position, so reordering siblings of the same type swaps nothing but content', () => {
    const ids = createElementIds();
    const first = el({ type: 'Heading', text: 'One' });
    const second = el({ type: 'Heading', text: 'Two' });
    const root = el({ type: 'VerticalLayout', elements: [first, second] });
    const [rootId, firstId, secondId] = allIds(root, ids);
    const next = el({
      type: 'VerticalLayout',
      elements: [el({ type: 'Heading', text: 'Two' }), el({ type: 'Heading', text: 'One' })],
    });
    carryIdsByPath(root, next, ids);
    expect(allIds(next, ids)).toEqual([rootId, firstId, secondId]);
    expect((child(next, 0) as { text?: string }).text).toBe('Two');
  });

  it('does not carry the root when the root type changed', () => {
    const { ids, root, before } = fixture();
    const next = clone(root);
    next.type = 'Grid';
    carryIdsByPath(root, next, ids);
    const after = allIds(next, ids);
    for (const id of after) expect(before).not.toContain(id);
  });
});
