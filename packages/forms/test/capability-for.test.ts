import type { UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import {
  capabilityFor,
  mayEdit,
  FULLY_GRANTED,
  type CapabilityMap,
} from '../src/capabilities/index';

// Doc 220 — the capability resolver. `capabilityFor(capabilities, element)` shallow-merges THREE
// levels: `default['*']` → `default[element.type]` → `elements[authoredId(element)]`, each level
// overriding only the keys it STATES.
//
// Three-level precedence is where subtle bugs live in this repo (gridstack option precedence,
// tailwind-merge's text-hN collapse, JSONForms rank ties) — but unlike those, this rule is pure,
// synchronous and total, so a truth table genuinely covers it. That is why this file is exhaustive.

const el = (type: string, id?: string) =>
  ({ type, ...(id === undefined ? {} : { id }) }) as UISchemaElement;

const CLOSED = {
  edit: 'none',
  remove: false,
  move: false,
  addChildren: false,
  removeChildren: false,
  reorderChildren: false,
  edges: false,
} as const;

describe('capabilityFor — the merge chain', () => {
  it('returns a FULLY GRANTED capability when there is no map at all (rule 2)', () => {
    expect(capabilityFor(undefined, el('Control', 'a1'))).toEqual(FULLY_GRANTED);
    expect(capabilityFor({}, el('Control', 'a1'))).toEqual(FULLY_GRANTED);
  });

  it("applies default['*'] when nothing more specific matches", () => {
    const map: CapabilityMap = { default: { '*': CLOSED } };
    expect(capabilityFor(map, el('Control', 'a1'))).toEqual(CLOSED);
  });

  it("lets a type entry override default['*'], key by key", () => {
    const map: CapabilityMap = {
      default: { '*': CLOSED, Control: { edit: ['label'] } },
    };
    const control = capabilityFor(map, el('Control', 'a1'));
    expect(control.edit).toEqual(['label']);
    // A Heading has no type entry, so it keeps the baseline.
    expect(capabilityFor(map, el('Heading', 'h1')).edit).toBe('none');
  });

  it('lets an element entry override the type entry, key by key', () => {
    const map: CapabilityMap = {
      default: { '*': CLOSED, Control: { edit: ['label'] } },
      elements: { a1: { edit: 'all', remove: true } },
    };
    const open = capabilityFor(map, el('Control', 'a1'));
    expect(open.edit).toBe('all');
    expect(open.remove).toBe(true);
    // A sibling Control without an entry still takes the type entry.
    expect(capabilityFor(map, el('Control', 'a2')).edit).toEqual(['label']);
  });

  it('keeps sibling keys from the level below when a level overrides only some (rule 3)', () => {
    const map: CapabilityMap = {
      default: { '*': CLOSED, Control: { edit: ['label'] } },
      elements: { a1: { remove: true } },
    };
    const resolved = capabilityFor(map, el('Control', 'a1'));
    expect(resolved.remove).toBe(true); // stated by the element
    expect(resolved.edit).toEqual(['label']); // inherited from the type
    expect(resolved.move).toBe(false); // inherited from the baseline
  });

  it("falls back to default['*'] for a type the map does not list", () => {
    const map: CapabilityMap = { default: { '*': CLOSED, Control: { edit: 'all' } } };
    expect(capabilityFor(map, el('Separator', 's1'))).toEqual(CLOSED);
  });

  it('treats an element whose id appears nowhere as governed only by the defaults (rule 5)', () => {
    const map: CapabilityMap = {
      default: { '*': CLOSED },
      elements: { somethingElse: { edit: 'all' } },
    };
    expect(capabilityFor(map, el('Control', 'unknown1'))).toEqual(CLOSED);
  });

  it('ignores a key stated as null or undefined rather than overriding with nothing', () => {
    // Authored JSON can carry either; a naive spread would wipe the level below.
    const map = {
      default: { '*': { ...CLOSED }, Control: { edit: null, remove: undefined } },
    } as unknown as CapabilityMap;
    const resolved = capabilityFor(map, el('Control', 'a1'));
    expect(resolved.edit).toBe('none');
    expect(resolved.remove).toBe(false);
  });
});

describe("the '*' baseline is CLOSED (rule 4)", () => {
  it("a per-type map WITHOUT '*' does not silently grant everything it lists", () => {
    const map: CapabilityMap = { default: { Control: { edit: 'none' } } };
    expect(capabilityFor(map, el('Control', 'a1')).edit).toBe('none');
  });

  it("an unlisted type with no '*' falls through to FULLY GRANTED — which is why '*' must exist", () => {
    const map: CapabilityMap = { default: { Control: { edit: 'none' } } };
    // This is the fail-OPEN case the '*' baseline exists to prevent; pinned so the reason stays visible.
    expect(capabilityFor(map, el('Separator', 's1'))).toEqual(FULLY_GRANTED);
  });

  it("a '*' denying everything denies an unlisted type too", () => {
    const map: CapabilityMap = { default: { '*': CLOSED, Control: { edit: 'all' } } };
    expect(capabilityFor(map, el('Separator', 's1')).edit).toBe('none');
  });
});

describe('reading the element id', () => {
  it('resolves by the element’s AUTHORED id, through authoredId() (doc 219 contract)', () => {
    const map: CapabilityMap = { default: { '*': CLOSED }, elements: { a1: { edit: 'all' } } };
    expect(capabilityFor(map, el('Control', 'a1')).edit).toBe('all');
  });

  it('an element with no authored id falls back to the defaults, never to a stray entry', () => {
    const map: CapabilityMap = { default: { '*': CLOSED }, elements: { a1: { edit: 'all' } } };
    expect(capabilityFor(map, el('Control'))).toEqual(CLOSED);
  });

  it('an empty-string id is not an id — it must not match an entry keyed ""', () => {
    const map = {
      default: { '*': CLOSED },
      elements: { '': { edit: 'all' } },
    } as unknown as CapabilityMap;
    expect(capabilityFor(map, el('Control', '')).edit).toBe('none');
  });
});

describe('the verb vocabulary', () => {
  it("resolves edit: 'all' | 'none' | a list of InspectorField keys", () => {
    const of = (edit: unknown) =>
      capabilityFor({ elements: { a1: { edit } } } as unknown as CapabilityMap, el('Control', 'a1'))
        .edit;
    expect(of('all')).toBe('all');
    expect(of('none')).toBe('none');
    expect(of(['label', 'description'])).toEqual(['label', 'description']);
  });

  it('mayEdit interprets all three shapes so no caller has to', () => {
    const resolved = (edit: unknown) =>
      capabilityFor(
        { elements: { a1: { edit } } } as unknown as CapabilityMap,
        el('Control', 'a1'),
      );
    expect(mayEdit(resolved('all'), 'label')).toBe(true);
    expect(mayEdit(resolved('none'), 'label')).toBe(false);
    expect(mayEdit(resolved(['label']), 'label')).toBe(true);
    expect(mayEdit(resolved(['label']), 'gap')).toBe(false);
  });

  it('resolves the container verbs addChildren / removeChildren / reorderChildren', () => {
    const map: CapabilityMap = {
      default: { '*': CLOSED },
      elements: { g1: { addChildren: true, reorderChildren: true } },
    };
    const grid = capabilityFor(map, el('Grid', 'g1'));
    expect(grid.addChildren).toBe(true);
    expect(grid.reorderChildren).toBe(true);
    expect(grid.removeChildren).toBe(false);
  });

  it('resolves edges, which only a Flow uses', () => {
    const map: CapabilityMap = { default: { '*': CLOSED, Flow: { edges: true } } };
    expect(capabilityFor(map, el('Flow', 'f1')).edges).toBe(true);
    expect(capabilityFor(map, el('Grid', 'g1')).edges).toBe(false);
  });

  it("an element's own remove is independent of its container's removeChildren (the collision the flat names resolve)", () => {
    const map: CapabilityMap = {
      default: { '*': CLOSED },
      elements: { s1: { remove: false, removeChildren: true } },
    };
    const section = capabilityFor(map, el('Section', 's1'));
    // The Section itself is frozen, but what is INSIDE it may be deleted.
    expect(section.remove).toBe(false);
    expect(section.removeChildren).toBe(true);
  });
});

describe('FULLY_GRANTED is a shared constant', () => {
  it('is frozen, so a merged result can never mutate it', () => {
    expect(Object.isFrozen(FULLY_GRANTED)).toBe(true);
  });

  it('is not the object returned — every call returns a fresh result', () => {
    const resolved = capabilityFor(undefined, el('Control', 'a1'));
    expect(resolved).toEqual(FULLY_GRANTED);
    expect(resolved).not.toBe(FULLY_GRANTED);
  });
});

describe('doc 231 — `cascade` is an authoring hint, never a capability', () => {
  it('does not return `cascade` in a resolved capability', () => {
    const map: CapabilityMap = {
      default: { '*': { cascade: 'self' } },
      elements: { s1: { cascade: 'children', addChildren: false } },
    };
    const resolved = capabilityFor(map, el('Section', 's1'));
    expect('cascade' in resolved).toBe(false);
    expect(resolved).toEqual({ ...FULLY_GRANTED, addChildren: false });
  });
});
