import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { checkCapabilities, type CapabilityMap } from '../src/capabilities/index';
import { sameValue } from '../src/capabilities/document-index';
import {
  governedSchemaValidator,
  governedUischemaValidator,
} from '../src/studio/code/validate-document';

// Doc 222 — the enforcement the studio's gates only advertise.
//
// Every case is a DELTA between two whole documents, because that is the question the function asks:
// "what is this owner doing right now, and may they?". A test that built one document and asked
// about it would be testing `capabilityFor`, which doc 220 already covers.

const schema: JsonSchema = {
  type: 'object',
  properties: {
    a: { type: 'string', title: 'A' },
    b: { type: 'string', title: 'B' },
  },
};

const CLOSED = {
  edit: 'none',
  remove: false,
  move: false,
  addChildren: false,
  removeChildren: false,
  reorderChildren: false,
  edges: false,
} as const;

const el = (element: object) => element as UISchemaElement;
const control = (id: string, property: string, extra: object = {}) =>
  el({ type: 'Control', id, scope: `#/properties/${property}`, ...extra });
const stack = (id: string, ...children: UISchemaElement[]) =>
  el({ type: 'VerticalLayout', id, elements: children });
const form = (...children: UISchemaElement[]) =>
  el({ type: 'Form', id: 'root1', label: 'A form', elements: children });

const doc = (uischema: UISchemaElement) => ({ schema, uischema });

/** The baseline document every case starts from: two controls in one stack. */
const base = () => doc(form(stack('stack1', control('a1', 'a'), control('b1', 'b'))));

const codes = (violations: readonly { code: string }[]) => violations.map((v) => v.code);

describe('an ungoverned document', () => {
  it('permits anything at all', () => {
    const wildlyDifferent = doc(form(stack('other', control('zz', 'b'))));
    expect(checkCapabilities(base(), wildlyDifferent, undefined)).toEqual([]);
  });
});

describe('a governed document that did not change', () => {
  it('reports nothing when the submission is identical', () => {
    expect(checkCapabilities(base(), base(), { default: { '*': CLOSED } })).toEqual([]);
  });

  it('reports nothing when only OBJECT KEY ORDER differs', () => {
    // Zod's parse reorders keys (declared first, catchall after) — the bug that already cost this
    // codebase a "dirty for ever after a successful save". An order-sensitive compare here would
    // refuse a save whose content did not change at all.
    const before = doc(
      form(stack('stack1', el({ type: 'Control', id: 'a1', scope: '#/properties/a', label: 'A' }))),
    );
    const after = doc(
      form(stack('stack1', el({ type: 'Control', label: 'A', id: 'a1', scope: '#/properties/a' }))),
    );
    expect(checkCapabilities(before, after, { default: { '*': CLOSED } })).toEqual([]);
  });
});

describe('remove', () => {
  const withoutB = doc(form(stack('stack1', control('a1', 'a'))));

  it('refuses a removal the template did not allow', () => {
    const result = checkCapabilities(base(), withoutB, { default: { '*': CLOSED } });
    expect(codes(result)).toEqual(['remove']);
    expect(result[0]?.elementId).toBe('b1');
    expect(result[0]?.severity).toBe('refused');
  });

  it('allows it when the element and its container both permit it', () => {
    const map: CapabilityMap = {
      default: { '*': CLOSED },
      elements: { b1: { remove: true }, stack1: { removeChildren: true } },
    };
    expect(checkCapabilities(base(), withoutB, map)).toEqual([]);
  });

  it("refuses when the element may go but its container's contents are frozen", () => {
    const map: CapabilityMap = { default: { '*': CLOSED }, elements: { b1: { remove: true } } };
    expect(codes(checkCapabilities(base(), withoutB, map))).toEqual(['remove']);
  });
});

describe('edit — compared through the inspector fields, not a raw key diff', () => {
  const relabelled = doc(
    form(stack('stack1', control('a1', 'a', { label: 'Renamed' }), control('b1', 'b'))),
  );

  it('refuses a changed setting the template froze', () => {
    const result = checkCapabilities(base(), relabelled, { default: { '*': CLOSED } });
    expect(codes(result)).toEqual(['edit']);
    expect(result[0]?.field).toBe('label');
  });

  it('allows it when `edit` names that field key', () => {
    const map: CapabilityMap = { default: { '*': CLOSED }, elements: { a1: { edit: ['label'] } } };
    expect(checkCapabilities(base(), relabelled, map)).toEqual([]);
  });

  it('refuses a DIFFERENT field even when another one is named', () => {
    // What makes the field list worth comparing at all: `edit: ['label']` has to mean label ONLY.
    const map: CapabilityMap = { default: { '*': CLOSED }, elements: { a1: { edit: ['label'] } } };
    const described = doc(
      form(
        stack(
          'stack1',
          control('a1', 'a', { options: { placeholder: 'Type here' } }),
          control('b1', 'b'),
        ),
      ),
    );
    const result = checkCapabilities(base(), described, map);
    expect(result.every((v) => v.code === 'edit')).toBe(true);
    expect(result.map((v) => v.field)).not.toContain('label');
    expect(result.length).toBeGreaterThan(0);
  });

  it("allows everything under edit: 'all'", () => {
    const map: CapabilityMap = { default: { '*': CLOSED }, elements: { a1: { edit: 'all' } } };
    expect(checkCapabilities(base(), relabelled, map)).toEqual([]);
  });
});

describe('move', () => {
  it('refuses a reorder within a frozen container', () => {
    const swapped = doc(form(stack('stack1', control('b1', 'b'), control('a1', 'a'))));
    const result = checkCapabilities(base(), swapped, { default: { '*': CLOSED } });
    expect(result.every((v) => v.code === 'move')).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('allows a reorder when the element may move and its container may be reordered', () => {
    const swapped = doc(form(stack('stack1', control('b1', 'b'), control('a1', 'a'))));
    const map: CapabilityMap = {
      default: { '*': CLOSED },
      elements: {
        a1: { move: true },
        b1: { move: true },
        stack1: { reorderChildren: true, addChildren: true },
      },
    };
    expect(checkCapabilities(base(), swapped, map)).toEqual([]);
  });

  it('refuses a move into a different container', () => {
    const before = doc(form(stack('stack1', control('a1', 'a')), stack('stack2')));
    const after = doc(form(stack('stack1'), stack('stack2', control('a1', 'a'))));
    const map: CapabilityMap = {
      default: { '*': CLOSED },
      elements: { a1: { move: true }, stack1: { reorderChildren: true } },
    };
    // `stack2` never granted `addChildren`, so the element has nowhere to land.
    expect(codes(checkCapabilities(before, after, map))).toContain('move');
  });
});

describe('add — doc 219 provenance', () => {
  const withExtra = doc(
    form(stack('stack1', control('a1', 'a'), control('b1', 'b'), control('new1', 'b'))),
  );

  it('refuses a new element in a container that accepts none', () => {
    const result = checkCapabilities(base(), withExtra, { default: { '*': CLOSED } });
    expect(codes(result)).toEqual(['add']);
    expect(result[0]?.elementId).toBe('new1');
  });

  it('allows it when the container accepts children', () => {
    const map: CapabilityMap = {
      default: { '*': CLOSED },
      elements: { stack1: { addChildren: true } },
    };
    expect(checkCapabilities(base(), withExtra, map)).toEqual([]);
  });

  it('treats an element with NO authored id as new', () => {
    // The Monaco bypass: hand-written JSON carries no id, and an id the template never saw is the
    // owner's own either way.
    const handWritten = doc(
      form(stack('stack1', control('a1', 'a'), control('b1', 'b'), el({ type: 'Separator' }))),
    );
    const result = checkCapabilities(base(), handWritten, { default: { '*': CLOSED } });
    expect(codes(result)).toEqual(['add']);
    expect(result[0]?.elementId).toBeUndefined();
  });
});

describe('Flow edges', () => {
  const flow = (edges: unknown) =>
    doc(
      el({
        type: 'Flow',
        id: 'flow1',
        options: { edges },
        elements: [el({ type: 'Stage', id: 's1' }), el({ type: 'Stage', id: 's2' })],
      }),
    );

  it('refuses a reconnection when `edges` is denied', () => {
    const before = flow([{ id: 'e1', source: 's1', target: 's2' }]);
    const after = flow([{ id: 'e1', source: 's2', target: 's1' }]);
    expect(codes(checkCapabilities(before, after, { default: { '*': CLOSED } }))).toEqual([
      'edges',
    ]);
  });

  it('allows it when the Flow grants `edges`', () => {
    const before = flow([{ id: 'e1', source: 's1', target: 's2' }]);
    const after = flow([{ id: 'e1', source: 's2', target: 's1' }]);
    const map: CapabilityMap = { default: { '*': CLOSED }, elements: { flow1: { edges: true } } };
    expect(checkCapabilities(before, after, map)).toEqual([]);
  });

  it('reports nothing when the edges are untouched', () => {
    const edges = [{ id: 'e1', source: 's1', target: 's2' }];
    expect(checkCapabilities(flow(edges), flow(edges), { default: { '*': CLOSED } })).toEqual([]);
  });
});

describe('a dangling capability entry', () => {
  const map: CapabilityMap = { default: { '*': CLOSED }, elements: { ghost1: { remove: true } } };

  it('is reported, rather than silently ignored', () => {
    const result = checkCapabilities(base(), base(), map);
    expect(codes(result)).toEqual(['dangling']);
    expect(result[0]?.elementId).toBe('ghost1');
  });

  it('does NOT refuse the save', () => {
    // Otherwise a document whose owner legitimately removed an element they were allowed to remove
    // would be wedged for ever: that id is absent from both sides from then on.
    const result = checkCapabilities(base(), base(), map);
    expect(result.every((v) => v.severity === 'dangling')).toBe(true);
  });
});

describe('sameValue — order-insensitive, because storage reorders keys', () => {
  it('ignores key order at every depth', () => {
    expect(sameValue({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true);
  });

  it('still respects ARRAY order', () => {
    expect(sameValue([1, 2], [2, 1])).toBe(false);
  });

  it('separates a missing key from an undefined one by key count', () => {
    expect(sameValue({ a: 1 }, { a: 1, b: undefined })).toBe(false);
  });

  it('compares scalars and null as expected', () => {
    expect(sameValue(null, null)).toBe(true);
    expect(sameValue(null, {})).toBe(false);
    expect(sameValue('x', 'x')).toBe(true);
    expect(sameValue(1, '1')).toBe(false);
  });
});

describe('the code panel apply gate (doc 222)', () => {
  // The studio's own bypass: every gate doc 221 installed sits on an affordance, and these panes
  // replace a whole half of the document with hand-written JSON.
  const current = base();
  const map: CapabilityMap = { default: { '*': CLOSED } };

  it('applies a pasted uischema that changes nothing governed', () => {
    const validate = governedUischemaValidator(current, map);
    const result = validate(current.uischema);
    expect(result.valid).toBe(true);
  });

  it('refuses a pasted uischema that edits a frozen setting', () => {
    const validate = governedUischemaValidator(current, map);
    const result = validate(
      form(stack('stack1', control('a1', 'a', { label: 'Renamed' }), control('b1', 'b'))),
    );
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.problems[0]?.message).toContain('may not be changed');
  });

  it('refuses a pasted uischema that deletes a pinned element', () => {
    const validate = governedUischemaValidator(current, map);
    const result = validate(form(stack('stack1', control('a1', 'a'))));
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.problems[0]?.message).toContain('may not be removed');
  });

  it('is ungated when no template governs the document', () => {
    const validate = governedUischemaValidator(current, undefined);
    expect(validate(form(stack('stack1', control('a1', 'a')))).valid).toBe(true);
  });

  it('still refuses what the METASCHEMA rejects, capabilities or not', () => {
    // The capability check is a THIRD gate, not a replacement for the first two.
    const validate = governedUischemaValidator(current, map);
    expect(validate({ type: 'NotAnElement' }).valid).toBe(false);
  });

  it('gates the SCHEMA pane too — marking a field Required is a schema edit', () => {
    // `Required` is read from the ROOT schema, not the uischema, so gating only the uischema pane
    // would leave that door open: an author could freeze a control's settings and still make it
    // mandatory by hand.
    const validate = governedSchemaValidator(current, map);
    const result = validate({ ...current.schema, required: ['a'] });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.problems[0]?.message).toContain('Required');
  });

  it('does NOT gate a schema keyword the inspector never exposes', () => {
    // A real limit of the language, worth pinning rather than discovering later: `edit` names
    // INSPECTOR field keys (doc 220), so a keyword with no field — `minLength` has none today — is
    // outside the vocabulary and no `edit` list can freeze it.
    const validate = governedSchemaValidator(current, map);
    const withMinLength = {
      ...current.schema,
      properties: {
        a: { type: 'string', title: 'A', minLength: 5 },
        b: { type: 'string', title: 'B' },
      },
    };
    expect(validate(withMinLength).valid).toBe(true);
  });

  it('applies an unrelated schema change', () => {
    const validate = governedSchemaValidator(current, map);
    expect(validate(current.schema).valid).toBe(true);
  });
});
