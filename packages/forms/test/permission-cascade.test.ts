import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import type { CapabilityMap } from '../src/capabilities/capability-types';
import { inspectorContext } from '../src/studio/inspector/inspector-context';
import { cascadePermissions } from '../src/studio/inspector/permission-cascade';
import { applyPermissions } from '../src/studio/inspector/permission-fields';
import { createElementIds } from '../src/studio/layout/element-ids';

// Doc 231 — a contents toggle cascades, COPY ON WRITE, to the elements its scope reaches:
//
//   Can delete elements  → children's `remove`   (+ nested containers' `removeChildren` for descendants)
//   Can reorder elements → children's `move`     (+ nested containers' `reorderChildren` for descendants)
//   Can add elements     → child containers' `addChildren` (all nested containers for descendants)

const el = (element: object) => element as UISchemaElement;
const schema: JsonSchema = {
  type: 'object',
  properties: { a: { type: 'string' }, b: { type: 'string' }, c: { type: 'string' } },
};

/**
 * outer (Section)
 * ├── ctlA (Control)
 * ├── inner (Section)
 * │   └── ctlB (Control)
 * └── Control with NO authored id
 */
const tree = () => {
  const ctlB = el({ type: 'Control', id: 'ctlB', scope: '#/properties/b' });
  const inner = el({ type: 'Section', id: 'inner', label: 'Inner', elements: [ctlB] });
  const ctlA = el({ type: 'Control', id: 'ctlA', scope: '#/properties/a' });
  const anonymous = el({ type: 'Control', scope: '#/properties/c' });
  const outer = el({
    type: 'Section',
    id: 'outer',
    label: 'Outer',
    elements: [ctlA, inner, anonymous],
  });
  return el({ type: 'Form', id: 'root1', label: 'Form', elements: [outer] });
};

const outerOf = (uischema: UISchemaElement) =>
  (uischema as { elements: UISchemaElement[] }).elements[0]!;

const apply = (capabilities: CapabilityMap, values: Record<string, unknown>) => {
  const ids = createElementIds();
  const uischema = tree();
  const ctx = inspectorContext({ schema, uischema }, ids.idOf(outerOf(uischema)), ids)!;
  return applyPermissions(capabilities, ctx, values).elements ?? {};
};

describe('Can delete elements', () => {
  it('All descendants: every descendant loses `remove`, nested containers lose `removeChildren`', () => {
    const next = apply({}, { perm_cascade: 'descendants', perm_removeChildren: false });
    expect(next['outer']).toEqual({ removeChildren: false });
    expect(next['ctlA']).toEqual({ remove: false });
    expect(next['inner']).toEqual({ remove: false, removeChildren: false });
    expect(next['ctlB']).toEqual({ remove: false });
  });

  it('defaults to All descendants when no scope is stored', () => {
    const next = apply({}, { perm_removeChildren: false });
    expect(next['ctlB']).toEqual({ remove: false });
    expect(next['inner']).toEqual({ remove: false, removeChildren: false });
  });

  it('Immediate children: first-level children lose `remove`, nothing below is touched', () => {
    const next = apply({}, { perm_cascade: 'children', perm_removeChildren: false });
    expect(next['ctlA']).toEqual({ remove: false });
    // The child container's OWN contents key would reach the second level, so it is left alone.
    expect(next['inner']).toEqual({ remove: false });
    expect(next['ctlB']).toBeUndefined();
  });

  it('This element only: writes the container alone', () => {
    const next = apply({}, { perm_cascade: 'self', perm_removeChildren: false });
    expect(next['outer']).toEqual({ removeChildren: false, cascade: 'self' });
    expect(Object.keys(next)).toEqual(['outer']);
  });
});

describe('Can reorder elements', () => {
  it('All descendants: `move` on every descendant, `reorderChildren` on nested containers', () => {
    const next = apply({}, { perm_reorderChildren: false });
    expect(next['ctlA']).toEqual({ move: false });
    expect(next['inner']).toEqual({ move: false, reorderChildren: false });
    expect(next['ctlB']).toEqual({ move: false });
  });

  it('Immediate children: `move` on first-level children only', () => {
    const next = apply({}, { perm_cascade: 'children', perm_reorderChildren: false });
    expect(next['ctlA']).toEqual({ move: false });
    expect(next['inner']).toEqual({ move: false });
    expect(next['ctlB']).toBeUndefined();
  });
});

describe('Can add elements', () => {
  it('reaches nested CONTAINERS only — a leaf has nothing to add to', () => {
    const next = apply({}, { perm_addChildren: false });
    expect(next['inner']).toEqual({ addChildren: false });
    expect(next['ctlA']).toBeUndefined();
    expect(next['ctlB']).toBeUndefined();
  });

  it('Immediate children: first-level child containers', () => {
    const next = apply({}, { perm_cascade: 'children', perm_addChildren: false });
    expect(next['inner']).toEqual({ addChildren: false });
  });
});

describe('what a cascade does NOT do', () => {
  it('changing the scope alone rewrites nothing but the scope (rule 4)', () => {
    const next = apply({}, { perm_cascade: 'children' });
    expect(next).toEqual({ outer: { cascade: 'children' } });
  });

  it('keeps every other key on a target entry, overwriting only the mapped one (rule 5)', () => {
    const next = apply(
      { elements: { ctlA: { edit: ['label'], remove: true, move: false } } },
      { perm_removeChildren: false },
    );
    expect(next['ctlA']).toEqual({ edit: ['label'], remove: false, move: false });
  });

  it('a cascade of TRUE re-opens a pinned child (rule 5)', () => {
    const next = apply(
      { elements: { outer: { removeChildren: false }, ctlA: { remove: false } } },
      { perm_removeChildren: true },
    );
    expect(next['ctlA']).toEqual({ remove: true });
  });

  it('uses the scope from the SAME pass (rule 6)', () => {
    const next = apply(
      { elements: { outer: { cascade: 'self' } } },
      { perm_cascade: 'children', perm_removeChildren: false },
    );
    expect(next['ctlA']).toEqual({ remove: false });
  });

  it('skips targets without an authored id (rule 7)', () => {
    const next = apply({}, { perm_removeChildren: false });
    expect(Object.keys(next).toSorted()).toEqual(['ctlA', 'ctlB', 'inner', 'outer']);
  });

  it("never writes a target's own `cascade` (rule 8)", () => {
    const next = apply(
      { elements: { inner: { cascade: 'self' } } },
      { perm_removeChildren: false },
    );
    expect(next['inner']).toEqual({ cascade: 'self', remove: false, removeChildren: false });
  });

  it('does not cascade Can change connections (rule 9)', () => {
    const flowStage = el({ type: 'Stage', id: 'stg1', options: { id: 'stg1' }, elements: [] });
    const flow = el({ type: 'Flow', id: 'flow1', label: 'F', elements: [flowStage] });
    const ids = createElementIds();
    const ctx = inspectorContext({ schema, uischema: flow }, ids.idOf(flow), ids)!;
    const next = applyPermissions({}, ctx, { perm_edges: false }).elements ?? {};
    expect(next).toEqual({ flow1: { edges: false } });
  });

  it('returns the SAME map when nothing changed (rule 10)', () => {
    const before: CapabilityMap = {};
    const ids = createElementIds();
    const uischema = tree();
    const ctx = inspectorContext({ schema, uischema }, ids.idOf(outerOf(uischema)), ids)!;
    expect(
      applyPermissions(before, ctx, { perm_cascade: 'descendants', perm_removeChildren: true }),
    ).toBe(before);
  });

  it('never mutates an element (rule 11)', () => {
    const uischema = tree();
    const snapshot = JSON.stringify(uischema);
    cascadePermissions({}, outerOf(uischema), 'removeChildren', false, 'descendants');
    expect(JSON.stringify(uischema)).toBe(snapshot);
  });
});
