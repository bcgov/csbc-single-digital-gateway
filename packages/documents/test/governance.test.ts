import { describe, expect, it } from 'vitest';
import type { CapabilityMap } from '../src/studio/capabilities/capability-types';
import { governanceOf, mayAddWithin } from '../src/studio/capabilities/governance';
import type { DocumentContent } from '../src/studio/document-types';
import { control, form, funnel } from './funnel-fixtures';

/** F › [a, L › [b, c], s] */
const page = form('F', 'Page', [
  control('a'),
  { id: 'L', type: 'VerticalLayout', elements: [control('b'), control('c')] },
  { id: 's', type: 'Separator' },
]);
const content = (root = page): DocumentContent => ({
  schema: { type: 'object', properties: {} },
  variants: { default: root },
});

describe('governanceOf (doc 259)', () => {
  it('is undefined with no governing map: ungoverned means everything allowed', () => {
    expect(governanceOf(content(), undefined)).toBeUndefined();
  });

  it('canAdd / canCopy follow the container’s addChildren', () => {
    const g = governanceOf(content(), { elements: { L: { addChildren: false } } })!;
    expect(g.canAdd('L')).toBe(false);
    expect(g.canAdd('F')).toBe(true);
    expect(g.canCopy('c-b')).toBe(false);
    expect(g.canCopy('c-a')).toBe(true);
  });

  it('canRemove needs the element’s remove and its parent’s removeChildren', () => {
    const g = governanceOf(content(), {
      elements: { 'c-a': { remove: false }, L: { removeChildren: false } },
    })!;
    expect(g.canRemove('c-a')).toBe(false);
    expect(g.canRemove('c-b')).toBe(false);
    expect(g.canRemove('L')).toBe(true);
    expect(g.canRemove('F')).toBe(false);
  });

  it('canDrag needs the element’s move and its parent’s reorderChildren', () => {
    const g = governanceOf(content(), {
      elements: { 'c-a': { move: false }, L: { reorderChildren: false } },
    })!;
    expect(g.canDrag('c-a')).toBe(false);
    expect(g.canDrag('c-b')).toBe(false);
    expect(g.canDrag('s')).toBe(true);
  });

  it('canMove asks the element, its source and the target', () => {
    const map: CapabilityMap = { elements: { L: { addChildren: false } } };
    const g = governanceOf(content(), map)!;
    expect(g.canMove('c-a', 'L')).toBe(false);
    expect(g.canMove('c-b', 'F')).toBe(true);
    expect(
      governanceOf(content(), { elements: { F: { reorderChildren: false } } })!.canMove('c-a', 'L'),
    ).toBe(false);
  });

  it('canEdit reads the element’s edit rule', () => {
    const g = governanceOf(content(), {
      elements: { 'c-a': { edit: ['label', 'rule'] }, 'c-b': { edit: 'none' } },
    })!;
    expect(g.canEdit('c-a', 'label')).toBe(true);
    expect(g.canEdit('c-a', 'required')).toBe(false);
    expect(g.canEdit('c-a', 'rule')).toBe(true);
    expect(g.canEdit('c-b', 'label')).toBe(false);
    expect(g.canEdit('c-c', 'label')).toBe(true);
  });

  it('canChangeConnections reads a Funnel root’s edges; a Form root has none to lock', () => {
    const fun = funnel([form('F1'), form('F2')], []);
    expect(
      governanceOf(content(fun), { elements: { fun: { edges: false } } })!.canChangeConnections(),
    ).toBe(false);
    expect(governanceOf(content(fun), {})!.canChangeConnections()).toBe(true);
    expect(
      governanceOf(content(), { elements: { F: { edges: false } } })!.canChangeConnections(),
    ).toBe(true);
  });

  it('restrictions name what the element itself may not do (rule 9)', () => {
    const g = governanceOf(content(), {
      elements: { 'c-a': { edit: 'none', remove: false, move: false }, 'c-b': { edit: ['label'] } },
    })!;
    expect(g.restrictions('c-a')).toEqual([
      'settings locked',
      "can't be deleted",
      "can't be moved",
    ]);
    expect(g.restrictions('c-b')).toEqual(['some settings locked']);
    expect(g.restrictions('c-c')).toEqual([]);
  });

  it('an unknown id is never allowed to change anything', () => {
    const g = governanceOf(content(), {})!;
    expect(g.canRemove('nope')).toBe(false);
    expect(g.canAdd('nope')).toBe(false);
    expect(g.canMove('nope', 'F')).toBe(false);
  });
});

describe('mayAddWithin', () => {
  it('is true when ungoverned', () => {
    expect(mayAddWithin(undefined, page)).toBe(true);
  });

  it('is false when every container is locked, though leaf fields resolve addChildren', () => {
    const g = governanceOf(content(), {
      elements: { F: { addChildren: false }, L: { addChildren: false } },
    })!;
    expect(g.canAdd('c-a')).toBe(true);
    expect(mayAddWithin(g, page)).toBe(false);
  });

  it('is true when one nested container is open', () => {
    const g = governanceOf(content(), { elements: { F: { addChildren: false } } })!;
    expect(mayAddWithin(g, page)).toBe(true);
  });
});
