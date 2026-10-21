import { createAjv, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { authoredId } from '../src/renderers/ui/authored-id';
import { UISCHEMA_METASCHEMA } from '../src/studio/code/metaschema/uischema-metaschema';
import { copyElement } from '../src/studio/layout/copy-element';
import { createElementIds } from '../src/studio/layout/element-ids';
import type { TreeElement } from '../src/studio/layout/element-tree';
import {
  addressOf,
  allIdsUsed,
  authoredIdsUsed,
  formIdsUsed,
  resolveAddress,
} from '../src/studio/layout/form-address';
import { addTargetId, insertElement } from '../src/studio/layout/insert-element';
import { newPropertyKey } from '../src/studio/layout/schema-properties';
import { nodeIdsUsed } from '../src/studio/layout/flow-node-factory';
import { reviewDocument } from '../src/runner/review-document';

// Doc 219 — the authored element id, hoisted OUT of `options` to a top-level sibling of
// `type` / `scope` / `options` and stamped on every element. Pure module
// (`renderers/ui/authored-id.ts`), so no React and no rendering.

const el = (element: object) => element as UISchemaElement;
const schema: JsonSchema = { type: 'object', properties: {} };
const ajv = createAjv();
const uischemaOk = (value: unknown) => ajv.validate(UISCHEMA_METASCHEMA, value) === true;

describe('authoredId', () => {
  it('returns the top-level id when it is a non-empty string', () => {
    expect(authoredId(el({ type: 'Form', id: 'abcd1234' }))).toBe('abcd1234');
    expect(authoredId(el({ type: 'Control', id: 'f1', options: { gap: 'lg' } }))).toBe('f1');
  });

  it('returns undefined when the element has no id', () => {
    expect(authoredId(el({ type: 'Form' }))).toBeUndefined();
    expect(authoredId(el({ type: 'Form', options: { gap: 'md' } }))).toBeUndefined();
  });

  it('returns undefined for an empty-string id (rule 1 — the non-empty guard)', () => {
    expect(authoredId(el({ type: 'Form', id: '' }))).toBeUndefined();
  });

  it('returns undefined when id is not a string (number, object, null)', () => {
    expect(authoredId(el({ type: 'Form', id: 7 }))).toBeUndefined();
    expect(authoredId(el({ type: 'Form', id: null }))).toBeUndefined();
    expect(authoredId(el({ type: 'Form', id: { v: 'x' } }))).toBeUndefined();
    expect(authoredId(el({ type: 'Form', id: ['x'] }))).toBeUndefined();
  });

  it('does NOT read options.id — the removed shape is not a fallback (rule 2)', () => {
    expect(authoredId(el({ type: 'Form', options: { id: 'legacy1' } }))).toBeUndefined();
    // A top-level id wins outright; the inert options entry is never consulted.
    expect(authoredId(el({ type: 'Form', id: 'real1', options: { id: 'legacy1' } }))).toBe('real1');
  });
});

describe('id-spaces (rule 9)', () => {
  const doc = () =>
    el({
      type: 'Flow',
      id: 'flow1',
      elements: [
        {
          type: 'Stage',
          id: 's1',
          elements: [
            { type: 'Form', id: 'f1', elements: [] },
            { type: 'Form', elements: [] },
          ],
        },
        { type: 'Condition', id: 'c1', options: { rows: [] } },
        { type: 'Stage', id: 's2', elements: [{ type: 'Form', id: 'f3', elements: [] }] },
      ],
    });

  it('formIdsUsed collects only Form ids', () => {
    expect(formIdsUsed(doc())).toEqual(new Set(['f1', 'f3']));
  });

  it('nodeIdsUsed collects Stage and Condition ids into ONE shared space', () => {
    expect(nodeIdsUsed(doc() as TreeElement)).toEqual(new Set(['s1', 'c1', 's2']));
  });

  it('authoredIdsUsed is the union a copy regenerates against', () => {
    expect(authoredIdsUsed(doc())).toEqual(new Set(['s1', 's2', 'f1', 'f3']));
  });

  it('allIdsUsed is EVERY id in the document, whatever the type (rule 10)', () => {
    // Wider than the addressable space: a capability keys on any element id, so uniqueness must hold
    // across the whole document.
    expect(allIdsUsed(doc())).toEqual(new Set(['flow1', 's1', 'f1', 'c1', 's2', 'f3']));
  });

  it('authoredIdsUsed EXCLUDES Tab and TabContent — they carry an id but are not addressable (rule 5)', () => {
    const tabbed = el({
      type: 'Form',
      id: 'root1',
      elements: [
        {
          type: 'Tabs',
          id: 'tabs1',
          elements: [
            {
              type: 'Tab',
              id: 'tab1',
              label: 'One',
              elements: [{ type: 'TabContent', id: 'panel1', elements: [] }],
            },
          ],
        },
      ],
    });
    // Every one of them HAS an id...
    expect(allIdsUsed(tabbed)).toEqual(new Set(['root1', 'tabs1', 'tab1', 'panel1']));
    // ...but no TAB is addressable — only the Form root is, because a Form is.
    expect(authoredIdsUsed(tabbed)).toEqual(new Set(['root1']));
  });
});

describe('addressing reads the top-level id (doc 197, re-pointed)', () => {
  const build = () => {
    const ids = createElementIds();
    const contact = { type: 'Form', id: 'f1', label: 'Contact', elements: [] };
    const decision = { type: 'Form', id: 'f3', label: 'Decision', elements: [] };
    const root = el({
      type: 'Flow',
      id: 'flow1',
      elements: [
        { type: 'Stage', id: 's1', elements: [contact] },
        { type: 'Stage', id: 's2', elements: [decision] },
      ],
    });
    return { ids, root, contact: contact as unknown as UISchemaElement };
  };

  it('addressOf resolves a Form studio id to its authored top-level id', () => {
    const { ids, root, contact } = build();
    expect(addressOf(root, ids.idOf(contact), ids)).toBe('f1');
  });

  it('resolveAddress finds the Form carrying that authored id', () => {
    const { ids, root, contact } = build();
    expect(resolveAddress(root, 'f1', ids)).toBe(ids.idOf(contact));
  });

  it('resolves duplicates to the first in document order, as drawnStages does', () => {
    const ids = createElementIds();
    const first = { type: 'Form', id: 'dup', label: 'First', elements: [] };
    const second = { type: 'Form', id: 'dup', label: 'Second', elements: [] };
    const root = el({
      type: 'Flow',
      id: 'flow1',
      elements: [
        { type: 'Stage', id: 's1', elements: [first] },
        { type: 'Stage', id: 's2', elements: [second] },
      ],
    });
    expect(resolveAddress(root, 'dup', ids)).toBe(ids.idOf(first as unknown as UISchemaElement));
  });
});

describe('stamping and copying', () => {
  const root = () =>
    el({
      type: 'Form',
      id: 'root1',
      label: 'Untitled form',
      elements: [{ type: 'VerticalLayout', id: 'stack1', elements: [] }],
    });

  it('insertElement stamps a fresh id on an inserted element', () => {
    const ids = createElementIds();
    const base = root();
    const stackId = ids.idOf((base as TreeElement).elements?.[0] as UISchemaElement);
    const result = insertElement(
      { schema, uischema: base },
      'heading',
      { gridId: addTargetId(base, stackId, ids) },
      ids,
      newPropertyKey,
    );
    expect(authoredId(result.inserted as UISchemaElement)).toBeTypeOf('string');
    expect(authoredId(result.inserted as UISchemaElement)).not.toBe('');
  });

  it('copyElement regenerates the id of EVERY element in a copied subtree (rule 10)', () => {
    const ids = createElementIds();
    const nested = {
      type: 'VerticalLayout',
      id: 'inner1',
      elements: [{ type: 'Heading', id: 'head1', text: 'H' }],
    };
    const base = el({
      type: 'Form',
      id: 'root1',
      label: 'Untitled form',
      elements: [nested],
    });
    const result = copyElement(
      { schema, uischema: base },
      ids.idOf(nested as unknown as UISchemaElement),
      { x: 0, y: 0, w: 1, h: 4 },
      ids,
      newPropertyKey,
    );
    const copied = result.copy as TreeElement | undefined;
    expect(copied).toBeDefined();
    expect(authoredId(copied as UISchemaElement)).not.toBe('inner1');
    const copiedChild = copied?.elements?.[0] as UISchemaElement | undefined;
    expect(copiedChild).toBeDefined();
    // The whole subtree, not just the copied root.
    expect(authoredId(copiedChild as UISchemaElement)).not.toBe('head1');
  });

  it('a regenerated id collides with nothing already in the document', () => {
    const ids = createElementIds();
    const nested = { type: 'VerticalLayout', id: 'inner1', elements: [] };
    const base = el({
      type: 'Form',
      id: 'root1',
      label: 'Untitled form',
      elements: [nested],
    });
    const before = allIdsUsed(base);
    const result = copyElement(
      { schema, uischema: base },
      ids.idOf(nested as unknown as UISchemaElement),
      { x: 0, y: 0, w: 1, h: 4 },
      ids,
      newPropertyKey,
    );
    const copiedId = authoredId(result.copy as UISchemaElement);
    expect(copiedId).toBeTypeOf('string');
    expect(before.has(copiedId as string)).toBe(false);
    // And the finished document has one id per element — no duplicates.
    const after = [...allIdsUsed(result.uischema)];
    expect(new Set(after).size).toBe(after.length);
  });

  it('review-document still DROPS the id on projection (rule 8, doc 197)', () => {
    const flow = el({
      type: 'Flow',
      id: 'flow1',
      label: 'Flow',
      elements: [
        {
          type: 'Stage',
          id: 's1',
          elements: [{ type: 'Form', id: 'f1', label: 'One', elements: [] }],
        },
      ],
    });
    const projected = reviewDocument(flow, ['s1']) as TreeElement;
    const projectedForm = projected.elements?.[0] as UISchemaElement | undefined;
    expect(projectedForm).toBeDefined();
    expect(authoredId(projectedForm as UISchemaElement)).toBeUndefined();
  });
});

// The sharpest trap in this feature: flow-metaschema has FIVE `required: ['id']` entries that look
// identical. Only Stage options and Condition options moved. Editing the other three strips a
// required id from rows, clauses or edges — and it fails quietly.
const metaForm = (extra: object = {}) => ({
  type: 'Form',
  label: 'Untitled form',
  elements: [],
  ...extra,
});
const flowOf = (...elements: object[]) => ({ type: 'Flow', label: 'Flow', elements });
const stage = (extra: object = {}) => ({ type: 'Stage', elements: [metaForm()], ...extra });
const condition = (extra: object = {}) => ({
  type: 'Condition',
  options: { rows: [] },
  ...extra,
});

describe('metaschema id placement (the five required:[id] entries)', () => {
  it('a Stage requires a TOP-LEVEL id', () => {
    expect(uischemaOk(flowOf(stage({ id: 's1' })))).toBe(true);
    expect(uischemaOk(flowOf(stage()))).toBe(false);
    expect(uischemaOk(flowOf(stage({ id: '' })))).toBe(false);
  });

  it('a Condition requires a TOP-LEVEL id, and options still requires rows', () => {
    expect(uischemaOk(flowOf(stage({ id: 's1' }), condition({ id: 'c1' })))).toBe(true);
    expect(uischemaOk(flowOf(stage({ id: 's1' }), condition()))).toBe(false);
    expect(
      uischemaOk(flowOf(stage({ id: 's1' }), { type: 'Condition', id: 'c1', options: {} })),
    ).toBe(false);
  });

  it('Stage options no longer requires id and is fully optional', () => {
    // No options at all is legal now — the only key left is the INERT `position` (doc 198).
    expect(uischemaOk(flowOf(stage({ id: 's1' })))).toBe(true);
    expect(uischemaOk(flowOf(stage({ id: 's1', options: { position: { x: 0, y: 0 } } })))).toBe(
      true,
    );
  });

  it('a ConditionRow STILL requires its own top-level id — unchanged', () => {
    const rowed = (row: object) =>
      flowOf(stage({ id: 's1' }), { type: 'Condition', id: 'c1', options: { rows: [row] } });
    const clause = { id: 'cl1', field: 'k', operator: 'equals', value: 'v' };
    expect(uischemaOk(rowed({ id: 'r1', label: 'R', match: 'all', clauses: [clause] }))).toBe(true);
    expect(uischemaOk(rowed({ label: 'R', match: 'all', clauses: [clause] }))).toBe(false);
  });

  it('a Clause STILL requires its own top-level id — unchanged', () => {
    const claused = (clause: object) =>
      flowOf(stage({ id: 's1' }), {
        type: 'Condition',
        id: 'c1',
        options: { rows: [{ id: 'r1', label: 'R', match: 'all', clauses: [clause] }] },
      });
    expect(uischemaOk(claused({ id: 'cl1', field: 'k', operator: 'equals', value: 'v' }))).toBe(
      true,
    );
    expect(uischemaOk(claused({ field: 'k', operator: 'equals', value: 'v' }))).toBe(false);
  });

  it('a FlowEdge STILL requires its own top-level id — unchanged', () => {
    const edged = (edge: object) => ({
      type: 'Flow',
      label: 'Flow',
      elements: [stage({ id: 's1' }), stage({ id: 's2' })],
      options: { edges: [edge] },
    });
    expect(edged).toBeTypeOf('function');
    expect(uischemaOk(edged({ id: 'e1', source: 's1', target: 's2' }))).toBe(true);
    expect(uischemaOk(edged({ source: 's1', target: 's2' }))).toBe(false);
  });

  // AMENDED WHILE BUILDING: the metaschema sets `additionalProperties` NOWHERE, so an authored
  // `options.id` cannot be refused — only left undeclared and inert. Doc 215 rule 22 hit this first.
  // Pin the absence from the definition, never a refusal that cannot exist.
  it('the Stage options definition no longer declares id', () => {
    const definitions = (UISCHEMA_METASCHEMA as { definitions: Record<string, unknown> })
      .definitions;
    const stageDef = definitions['stage'] as {
      required: string[];
      properties: { id?: unknown; options?: { required?: string[]; properties: object } };
    };
    expect(stageDef.required).toContain('id');
    expect(stageDef.properties.id).toBeDefined();
    expect(stageDef.properties.options?.properties).not.toHaveProperty('id');
    expect(stageDef.properties.options?.required ?? []).not.toContain('id');
  });

  it('an authored options.id is tolerated but inert — it is not read as the id', () => {
    // Tolerated by the metaschema (no `additionalProperties`)...
    expect(uischemaOk(flowOf(stage({ id: 's1', options: { id: 'legacy1' } })))).toBe(true);
    // ...and completely ignored by the one reader.
    expect(authoredId(el({ type: 'Stage', id: 's1', options: { id: 'legacy1' } }))).toBe('s1');
  });
});
