import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { authoredId } from '../src/renderers/ui/authored-id';
import type { TreeElement } from '../src/studio/layout/element-tree';
import { allIdsUsed } from '../src/studio/layout/form-address';
import { stampMissingIds } from '../src/studio/layout/stamp-ids';
import { useStudioDocument } from '../src/studio/use-studio-document';

// Doc 219 — normalisation on seed. `fromSource` (`use-studio-document.ts`) stamps every id-less element
// when a document is SEEDED, so every element in an open document has an id regardless of how the
// document arrived (seeded template root, import, fixture).
//
// The location is the point: fromSource is where the BASELINE is computed, so the normalised document IS
// the baseline. Opening a template and editing nothing must leave it NOT dirty — stamping in an effect or
// on save would dirty a document merely by opening it and bump its revision for no authored change.

const schema: JsonSchema = { type: 'object', properties: {} };
const el = (element: object) => element as UISchemaElement;

/** A counter, so a stamped id is predictable in a test. */
const counter = () => {
  let n = 0;
  return () => `gen${(n += 1)}`;
};

const idsIn = (root: UISchemaElement): string[] => {
  const out: string[] = [];
  const walk = (node: TreeElement) => {
    const id = authoredId(node);
    if (id !== undefined) out.push(id);
    for (const child of node.elements ?? []) walk(child as TreeElement);
  };
  walk(root as TreeElement);
  return out;
};

const NESTED = () =>
  el({
    type: 'Form',
    label: 'Untitled form',
    elements: [
      { type: 'VerticalLayout', elements: [{ type: 'Heading', text: 'H' }] },
      { type: 'Grid', elements: [] },
    ],
  });

describe('seed normalisation', () => {
  it('stamps an id on every id-less element in a seeded document', () => {
    const stamped = stampMissingIds(NESTED(), counter());
    expect(idsIn(stamped)).toEqual(['gen4', 'gen2', 'gen1', 'gen3']);
  });

  it('stamps nested elements at every depth, not just the root', () => {
    const stamped = stampMissingIds(NESTED(), counter()) as TreeElement;
    const stack = stamped.elements?.[0] as TreeElement;
    const heading = stack.elements?.[0] as UISchemaElement;
    expect(authoredId(stamped as UISchemaElement)).toBeTypeOf('string');
    expect(authoredId(stack as UISchemaElement)).toBeTypeOf('string');
    expect(authoredId(heading)).toBeTypeOf('string');
  });

  it('stamps the ROOT — the case seeded templates depend on', () => {
    const stamped = stampMissingIds(el({ type: 'Form', label: 'x', elements: [] }), counter());
    expect(authoredId(stamped)).toBe('gen1');
  });

  it('leaves an element that already has an id untouched (idempotent)', () => {
    const already = el({
      type: 'Form',
      id: 'keepme1',
      label: 'x',
      elements: [{ type: 'Heading', id: 'keepme2', text: 'H' }],
    });
    const stamped = stampMissingIds(already, counter());
    // Nothing was missing, so the SAME object comes back — a fresh one would make every reseed look
    // like a change.
    expect(stamped).toBe(already);
    expect(idsIn(stamped)).toEqual(['keepme1', 'keepme2']);
  });

  it('gives every stamped element a DISTINCT id', () => {
    const ids = idsIn(stampMissingIds(NESTED(), counter()));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('a stamped id never collides with an authored id already in the document', () => {
    // The generator hands out 'gen1' first, which is already taken — `freshId` must skip past it.
    const mixed = el({
      type: 'Form',
      id: 'gen1',
      label: 'x',
      elements: [{ type: 'Heading', text: 'H' }],
    });
    const stamped = stampMissingIds(mixed, counter());
    const ids = idsIn(stamped);
    expect(ids).toContain('gen1');
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('re-seeding the same document twice produces the same shape (StrictMode-safe)', () => {
    const once = stampMissingIds(NESTED(), counter());
    const twice = stampMissingIds(once, counter());
    // The first pass filled every id, so the second is a no-op and returns the same object.
    expect(twice).toBe(once);
  });
});

// Doc 218's identity trap lives in exactly this machinery. These are the cases that stop a future change
// moving stamping out of fromSource.
describe('baseline and dirty behaviour', () => {
  it('the studio opens on the NORMALISED document, so it IS the baseline', () => {
    const { result } = renderHook(() => useStudioDocument({ schema, uischema: NESTED() }));
    const opened = result.current.uischema;
    expect(idsIn(opened).length).toBe(4);
    expect(idsIn(opened).every((id) => id.length > 0)).toBe(true);
  });

  it('opening a document with id-less elements and editing nothing keeps the SAME object', () => {
    const source = NESTED();
    const { result, rerender } = renderHook(() => useStudioDocument({ schema, uischema: source }));
    const first = result.current.uischema;
    rerender();
    // A host comparing what it holds now to what it held on mount reads clean, not dirty.
    expect(result.current.uischema).toBe(first);
  });

  it('normalisation does not clear element ids or change them across a re-render', () => {
    const source = NESTED();
    const { result, rerender } = renderHook(() => useStudioDocument({ schema, uischema: source }));
    const stack = (result.current.uischema as TreeElement).elements?.[0] as UISchemaElement;
    const studioId = result.current.ids.idOf(stack);
    rerender();
    const afterStack = (result.current.uischema as TreeElement).elements?.[0] as UISchemaElement;
    expect(result.current.ids.idOf(afterStack)).toBe(studioId);
  });

  it('a document that already carries ids is seeded without being rebuilt', () => {
    const already = el({
      type: 'Form',
      id: 'root1',
      label: 'x',
      elements: [{ type: 'Heading', id: 'head1', text: 'H' }],
    });
    const { result } = renderHook(() => useStudioDocument({ schema, uischema: already }));
    // Identity is preserved, so a host holding a reference to an element still matches the studio's.
    expect(result.current.uischema).toBe(already);
  });
});

describe('seeded template roots (the gap normalisation closes)', () => {
  // The three seeded templates are EMPTY ROOTS — `packages/database/src/seed-data/blank-documents.ts`.
  // Stamping only on insert would leave every one of them without an id.
  const blankService = () => el({ type: 'Service', label: 'Service', elements: [] });
  const blankForm = () => el({ type: 'Form', label: 'Application method', elements: [] });

  it('an empty Service root { type, label, elements: [] } gets an id', () => {
    const { result } = renderHook(() => useStudioDocument({ schema, uischema: blankService() }));
    expect(authoredId(result.current.uischema)).toBeTypeOf('string');
  });

  it('an empty Form root gets an id', () => {
    const { result } = renderHook(() => useStudioDocument({ schema, uischema: blankForm() }));
    expect(authoredId(result.current.uischema)).toBeTypeOf('string');
  });

  it('the stamped root id is what a capability map can key on', () => {
    const { result } = renderHook(() => useStudioDocument({ schema, uischema: blankForm() }));
    const rootId = authoredId(result.current.uischema);
    expect(rootId).toBeDefined();
    // Doc 220 keys a capability by element id — `add` on the ROOT is what decides whether the owner of
    // a derived document may add top-level fields at all.
    expect(allIdsUsed(result.current.uischema)).toEqual(new Set([rootId]));
  });
});
