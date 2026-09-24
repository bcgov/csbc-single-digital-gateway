import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { applyInspector } from '../src/studio/inspector/apply-inspector';
import { inspectorForm } from '../src/studio/inspector/inspector-form';
import { createElementIds } from '../src/studio/layout/element-ids';
import { findById, type TreeElement } from '../src/studio/layout/element-tree';
import type { EditableDocument } from '../src/studio/layout/schema-properties';

// Doc 187 rules 15-22 — writing inspector values back into the studio document.

type Values = Record<string, unknown>;
type Node = UISchemaElement & { label?: string; text?: string; elements?: Node[] };

const el = (element: object) => element as UISchemaElement;

function fixture() {
  const schema: JsonSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Name', description: 'Your name', maxLength: 80 },
      qty: { type: 'number', title: 'Quantity', minimum: 0 },
      agree: { type: 'boolean', title: 'Agree' },
      plan: {
        type: 'string',
        title: 'Plan',
        oneOf: [
          { const: 'basic', title: 'Basic' },
          { const: 'pro', title: 'Pro' },
        ],
      },
    },
    required: ['name'],
  };
  const name = el({
    type: 'Control',
    scope: '#/properties/name',
    label: 'Full name',
    rule: { effect: 'HIDE', condition: {} },
    options: { placeholder: 'Jane', gridItem: { w: 8, x: 0 } },
  });
  const about = el({
    type: 'Control',
    scope: '#/properties/name',
    options: { component: 'textarea' },
  });
  const qty = el({ type: 'Control', scope: '#/properties/qty', options: { gridItem: { w: 4 } } });
  const heading = el({ type: 'Heading', text: 'Hello', options: { level: 2, size: 4 } });
  const rowQty = el({
    type: 'Control',
    scope: '#/properties/qty',
    options: { gridItem: { w: 2 } },
  });
  const rowHeading = el({ type: 'Heading', text: 'Row', options: { gridItem: { w: 1 } } });
  const row = el({
    type: 'HorizontalLayout',
    options: { columns: 4 },
    elements: [rowQty, rowHeading],
  });
  const agree = el({ type: 'Control', scope: '#/properties/agree' });
  const plan = el({
    type: 'Control',
    scope: '#/properties/plan',
    options: { placeholder: 'Choose' },
  });
  const grid = el({ type: 'Grid', elements: [name, qty, heading] });
  const uischema = el({ type: 'VerticalLayout', elements: [grid, row, about, agree, plan] });
  const ids = createElementIds();
  const document: EditableDocument = { schema, uischema };
  const elements = { name, about, qty, heading, rowQty, row, grid, agree, plan };
  return { document, ids, elements };
}

type Fixture = ReturnType<typeof fixture>;
type Key = keyof Fixture['elements'];

/** The element's current inspector values with `changes` applied. */
function apply(fx: Fixture, key: Key, changes: Values, document = fx.document) {
  const id = fx.ids.idOf(fx.elements[key]);
  const current = inspectorForm(document, id, fx.ids)?.data ?? {};
  const values = { ...current, ...changes };
  for (const [k, v] of Object.entries(changes)) if (v === undefined) delete values[k];
  return { id, next: applyInspector(document, id, values, fx.ids) };
}

const nodeOf = (fx: Fixture, doc: EditableDocument, id: string) =>
  findById(doc.uischema as TreeElement, id, fx.ids) as Node | undefined;

const property = (doc: EditableDocument, key: string) =>
  doc.schema.properties?.[key] as Record<string, unknown> | undefined;

describe('no change (rule 21)', () => {
  it('returns the same document when the values equal what the document reads', () => {
    const fx = fixture();
    for (const key of Object.keys(fx.elements) as Key[]) {
      expect(apply(fx, key, {}).next, key).toBe(fx.document);
    }
  });

  it('returns the same document for an unknown id', () => {
    const fx = fixture();
    expect(applyInspector(fx.document, 'el-999', { label: 'x' }, fx.ids)).toBe(fx.document);
  });

  it('ignores values for fields that do not apply', () => {
    const fx = fixture();
    expect(apply(fx, 'heading', { maxLength: 5, required: true, label: 'x' }).next).toBe(
      fx.document,
    );
  });
});

describe('uischema fields (rules 15, 17, 19-21)', () => {
  it('writes Label into a new element that keeps its id, its other keys and the schema object', () => {
    const fx = fixture();
    const { id, next } = apply(fx, 'name', { label: 'Your full name' });
    const node = nodeOf(fx, next, id);
    expect(node).not.toBe(fx.elements.name);
    expect(node?.label).toBe('Your full name');
    expect(node).toMatchObject({
      scope: '#/properties/name',
      rule: { effect: 'HIDE' },
      options: { placeholder: 'Jane', gridItem: { w: 8, x: 0 } },
    });
    expect(next.schema).toBe(fx.document.schema);
    expect(next.uischema).not.toBe(fx.document.uischema);
  });

  it('removes Label when cleared', () => {
    const fx = fixture();
    const { id, next } = apply(fx, 'name', { label: undefined });
    expect(nodeOf(fx, next, id)).not.toHaveProperty('label');
  });

  it('writes and removes Placeholder, keeping the rest of options', () => {
    const fx = fixture();
    const written = apply(fx, 'name', { placeholder: 'John' });
    expect(nodeOf(fx, written.next, written.id)?.options).toEqual({
      placeholder: 'John',
      gridItem: { w: 8, x: 0 },
    });
    const cleared = apply(fx, 'name', { placeholder: undefined });
    expect(nodeOf(fx, cleared.next, cleared.id)?.options).toEqual({ gridItem: { w: 8, x: 0 } });
  });

  it('sets options.component for a non-default Component and removes it for the default (doc 188 rule 28)', () => {
    const fx = fixture();
    const textarea = apply(fx, 'name', { component: 'textarea' });
    expect(nodeOf(fx, textarea.next, textarea.id)?.options).toEqual({
      placeholder: 'Jane',
      gridItem: { w: 8, x: 0 },
      component: 'textarea',
    });
    const input = apply(fx, 'about', { component: 'input' });
    expect(nodeOf(fx, input.next, input.id)).not.toHaveProperty('options');

    const radios = apply(fx, 'plan', { component: 'radio-group' });
    expect(nodeOf(fx, radios.next, radios.id)?.options).toEqual({
      placeholder: 'Choose',
      component: 'radio-group',
    });
    const toggle = apply(fx, 'agree', { component: 'switch' });
    expect(nodeOf(fx, toggle.next, toggle.id)?.options).toEqual({ component: 'switch' });
    expect(toggle.next.schema).toBe(fx.document.schema);
  });

  it('writes Width into gridItem, keeping its other keys, and drops an emptied gridItem', () => {
    const fx = fixture();
    const wider = apply(fx, 'name', { width: 6 });
    expect(nodeOf(fx, wider.next, wider.id)?.options?.['gridItem']).toEqual({ w: 6, x: 0 });
    const cleared = apply(fx, 'qty', { width: undefined });
    expect(nodeOf(fx, cleared.next, cleared.id)).not.toHaveProperty('options');
  });

  it('writes Heading text, level and size — clearing text writes an empty string', () => {
    const fx = fixture();
    const text = apply(fx, 'heading', { text: undefined });
    expect(nodeOf(fx, text.next, text.id)?.text).toBe('');
    const sized = apply(fx, 'heading', { level: 3, size: undefined });
    expect(nodeOf(fx, sized.next, sized.id)?.options).toEqual({ level: 3 });
  });

  it('writes Columns to a HorizontalLayout and to a Grid', () => {
    const fx = fixture();
    const row = apply(fx, 'row', { columns: 5 });
    expect(nodeOf(fx, row.next, row.id)?.options).toEqual({ columns: 5 });
    const grid = apply(fx, 'grid', { columns: 6 });
    expect(nodeOf(fx, grid.next, grid.id)?.options).toEqual({ column: 6 });
  });
});

describe('schema fields (rules 17-18, 21-22)', () => {
  it('writes Description to the bound property, leaving the uischema object alone', () => {
    const fx = fixture();
    const { next } = apply(fx, 'name', { description: 'What we call you' });
    expect(property(next, 'name')?.['description']).toBe('What we call you');
    expect(next.uischema).toBe(fx.document.uischema);
    expect(property(fx.document, 'name')?.['description']).toBe('Your name');
  });

  it('removes Description when cleared', () => {
    const fx = fixture();
    const { next } = apply(fx, 'name', { description: undefined });
    expect(property(next, 'name')).not.toHaveProperty('description');
  });

  it('adds a key to required, and removes it, dropping an emptied required', () => {
    const fx = fixture();
    const added = apply(fx, 'qty', { required: true }).next;
    expect(added.schema.required).toEqual(['name', 'qty']);
    const removed = apply(fx, 'name', { required: false }).next;
    expect(removed.schema).not.toHaveProperty('required');
  });

  it('writes Max length, Minimum and Maximum — a maximum below the minimum is still written', () => {
    const fx = fixture();
    expect(property(apply(fx, 'name', { maxLength: 120 }).next, 'name')?.['maxLength']).toBe(120);
    const range = apply(fx, 'qty', { minimum: 10, maximum: 5 }).next;
    expect(property(range, 'qty')).toMatchObject({ minimum: 10, maximum: 5 });
  });

  it('edits a property shared by several Controls from any of them', () => {
    const fx = fixture();
    const { next } = apply(fx, 'about', { description: 'Shared' });
    expect(property(next, 'name')?.['description']).toBe('Shared');
  });

  it('writes Step to options, not the schema', () => {
    const fx = fixture();
    const { id, next } = apply(fx, 'qty', { step: 0.5 });
    expect(nodeOf(fx, next, id)?.options).toMatchObject({ step: 0.5 });
    expect(next.schema).toBe(fx.document.schema);
  });
});

describe('only valid values are written (rule 16)', () => {
  it.each([
    ['name', { maxLength: 2.5 }],
    ['name', { maxLength: -1 }],
    ['name', { label: 42 }],
    ['heading', { level: 7 }],
    ['heading', { size: 0 }],
    ['row', { columns: 7 }],
    ['grid', { columns: 13 }],
    ['rowQty', { width: 4 }],
    ['name', { width: 13 }],
    ['qty', { step: 0 }],
    ['qty', { minimum: 'ten' }],
    ['name', { required: 'yes' }],
    // Doc 188 rules 25, 29: a component outside the kind's list, or on a kind without one.
    ['name', { component: 'combobox' }],
    ['name', { component: 5 }],
    ['plan', { component: 'textarea' }],
    ['agree', { component: 'radio-group' }],
    ['qty', { component: 'textarea' }],
    ['plan', { maxLength: 5 }],
  ] as [Key, Values][])('does not write %s %o', (key, changes) => {
    const fx = fixture();
    expect(apply(fx, key, changes).next).toBe(fx.document);
  });

  it('still writes the valid values alongside an invalid one', () => {
    const fx = fixture();
    const { id, next } = apply(fx, 'name', { maxLength: -1, label: 'Kept' });
    expect(nodeOf(fx, next, id)?.label).toBe('Kept');
    expect(property(next, 'name')?.['maxLength']).toBe(80);
  });
});
