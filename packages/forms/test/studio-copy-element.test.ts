import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it, vi } from 'vitest';
import { copyElement } from '../src/studio/layout/copy-element';
import { createElementIds } from '../src/studio/layout/element-ids';

// Doc 185 rules 15-20 — pure copy of a grid element and its data properties.

type Element = UISchemaElement & { elements?: Element[]; scope?: string };

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/** Root Grid [heading, name, inner Grid [city, cityMirror, street, proto], tail] and its schema. */
function fixture() {
  const heading = { type: 'Heading', text: 'H', options: { level: 1, gridItem: { w: 12 } } };
  const name = {
    type: 'Control',
    scope: '#/properties/aaaaaaaa',
    options: { placeholder: 'Jane', gridItem: { x: 0, y: 3, w: 6, minW: 2 } },
  };
  const city = { type: 'Control', scope: '#/properties/bbbbbbbb', options: { gridItem: { w: 8 } } };
  const cityMirror = { type: 'Control', scope: '#/properties/bbbbbbbb' };
  const street = { type: 'Control', scope: '#/properties/address/properties/street' };
  const proto = { type: 'Control', scope: '#/properties/toString' };
  const inner = {
    type: 'Grid',
    options: { gridItem: { w: 12, h: 9 } },
    elements: [city, cityMirror, street, proto],
  };
  const tail = { type: 'Heading', text: 'T', options: { level: 2 } };
  const root = { type: 'Grid', elements: [heading, name, inner, tail] } as Element;
  const schema = {
    type: 'object',
    properties: {
      aaaaaaaa: { type: 'string', title: 'Name', maxLength: 80 },
      zzzzzzzz: { type: 'number', title: 'Other' },
      bbbbbbbb: { type: 'string', maxLength: 60 },
      address: { type: 'object', properties: { street: { type: 'string' } } },
    },
    required: ['aaaaaaaa', 'zzzzzzzz'],
  } as JsonSchema;
  deepFreeze(root);
  deepFreeze(schema);
  return { root, schema, heading, name, inner, city, cityMirror, street, proto, tail };
}

/** A key generator handing out `values` in order. */
const keys = (...values: string[]) => {
  const queue = [...values];
  return vi.fn(() => {
    const next = queue.shift();
    if (next === undefined) throw new Error('no more keys');
    return next;
  });
};

const PLACEMENT = { x: 2, y: 3, w: 6, h: 5 };
const elementsOf = (element: UISchemaElement | undefined) =>
  (element as Element | undefined)?.elements ?? [];

describe('copyElement — uischema (rules 15-16)', () => {
  it('inserts the copy directly after the original in the same Grid, leaving siblings untouched', () => {
    const { root, schema, heading, name, inner, tail } = fixture();
    const ids = createElementIds();
    const result = copyElement(
      { schema, uischema: root },
      ids.idOf(name),
      PLACEMENT,
      ids,
      keys('cccccccc'),
    );

    const elements = elementsOf(result.uischema);
    expect(elements).toHaveLength(5);
    expect(elements[0]).toBe(heading);
    expect(elements[1]).toBe(name);
    expect(elements[2]).toBe(result.copy);
    expect(elements[3]).toBe(inner);
    expect(elements[4]).toBe(tail);
    expect(ids.idOf(result.uischema)).toBe(ids.idOf(root));
  });

  it('places the copy below the original: engine x and w, y + h, other gridItem keys kept, no h', () => {
    const { root, schema, name } = fixture();
    const ids = createElementIds();
    const { copy } = copyElement(
      { schema, uischema: root },
      ids.idOf(name),
      PLACEMENT,
      ids,
      keys('cccccccc'),
    );

    expect(copy?.options?.['gridItem']).toEqual({ x: 2, y: 8, w: 6, minW: 2 });
    expect(copy?.options?.['placeholder']).toBe('Jane');
  });

  it('keeps an authored h on the copy', () => {
    const { root, schema, inner } = fixture();
    const ids = createElementIds();
    const { copy } = copyElement(
      { schema, uischema: root },
      ids.idOf(inner),
      { x: 0, y: 10, w: 12, h: 9 },
      ids,
      keys('cccccccc'),
    );

    expect(copy?.options?.['gridItem']).toEqual({ x: 0, y: 19, w: 12, h: 9 });
  });

  it('deep-copies a Grid: new objects and new studio ids for it and every descendant', () => {
    const { root, schema, inner } = fixture();
    const ids = createElementIds();
    const originals = [inner, ...inner.elements];
    const originalIds = originals.map((element) => ids.idOf(element));
    const { copy } = copyElement(
      { schema, uischema: root },
      ids.idOf(inner),
      PLACEMENT,
      ids,
      keys('cccccccc'),
    );

    const copies = [copy, ...elementsOf(copy)] as object[];
    expect(copies).toHaveLength(5);
    copies.forEach((element, index) => {
      expect(element).not.toBe(originals[index]);
      expect(ids.idOf(element)).not.toBe(originalIds[index]);
    });
    expect(originals.map((element) => ids.idOf(element))).toEqual(originalIds);
  });

  it('returns the same document and no copy for the root or an unknown id', () => {
    const { root, schema } = fixture();
    const ids = createElementIds();
    const newKey = keys('cccccccc');
    for (const id of [ids.idOf(root), 'el-unknown']) {
      const result = copyElement({ schema, uischema: root }, id, PLACEMENT, ids, newKey);
      expect(result.uischema).toBe(root);
      expect(result.schema).toBe(schema);
      expect(result.copy).toBeUndefined();
    }
    expect(newKey).not.toHaveBeenCalled();
  });
});

describe('copyElement — schema (rules 17-18)', () => {
  it('gives a copied Control a new key with a cloned property titled "<title> (copy)" after the original', () => {
    const { root, schema, name } = fixture();
    const ids = createElementIds();
    const result = copyElement(
      { schema, uischema: root },
      ids.idOf(name),
      PLACEMENT,
      ids,
      keys('cccccccc'),
    );

    expect((result.copy as Element).scope).toBe('#/properties/cccccccc');
    expect(Object.keys(result.schema.properties ?? {})).toEqual([
      'aaaaaaaa',
      'cccccccc',
      'zzzzzzzz',
      'bbbbbbbb',
      'address',
    ]);
    expect(result.schema.properties?.['cccccccc']).toEqual({
      type: 'string',
      title: 'Name (copy)',
      maxLength: 80,
    });
    expect(result.schema.properties?.['aaaaaaaa']).toBe(schema.properties?.['aaaaaaaa']);
    expect(result.schema.required).toEqual(['aaaaaaaa', 'cccccccc', 'zzzzzzzz']);
  });

  it('titles a copied property without a title "<key> (copy)" and leaves required alone when not required', () => {
    const { root, schema, city } = fixture();
    const ids = createElementIds();
    const result = copyElement(
      { schema, uischema: root },
      ids.idOf(city),
      PLACEMENT,
      ids,
      keys('cccccccc'),
    );

    expect(result.schema.properties?.['cccccccc']).toEqual({
      type: 'string',
      title: 'bbbbbbbb (copy)',
      maxLength: 60,
    });
    expect(result.schema.required).toEqual(['aaaaaaaa', 'zzzzzzzz']);
  });

  it('regenerates a key that collides with an existing property', () => {
    const { root, schema, name } = fixture();
    const ids = createElementIds();
    const newKey = keys('zzzzzzzz', 'aaaaaaaa', 'cccccccc');
    const result = copyElement({ schema, uischema: root }, ids.idOf(name), PLACEMENT, ids, newKey);

    expect((result.copy as Element).scope).toBe('#/properties/cccccccc');
    expect(newKey).toHaveBeenCalledTimes(3);
  });

  it('shares one new key between Controls of a copied Grid that shared a key, and leaves other scopes alone', () => {
    const { root, schema, inner } = fixture();
    const ids = createElementIds();
    const newKey = keys('cccccccc', 'dddddddd');
    const result = copyElement({ schema, uischema: root }, ids.idOf(inner), PLACEMENT, ids, newKey);

    const scopes = elementsOf(result.copy).map((element) => element.scope);
    expect(scopes).toEqual([
      '#/properties/cccccccc',
      '#/properties/cccccccc',
      '#/properties/address/properties/street',
      '#/properties/toString',
    ]);
    expect(newKey).toHaveBeenCalledTimes(1);
    expect(Object.keys(result.schema.properties ?? {})).toEqual([
      'aaaaaaaa',
      'zzzzzzzz',
      'bbbbbbbb',
      'cccccccc',
      'address',
    ]);
  });

  it('never treats an inherited key (toString) as a property', () => {
    const { root, schema, proto } = fixture();
    const ids = createElementIds();
    const newKey = keys('cccccccc');
    const result = copyElement({ schema, uischema: root }, ids.idOf(proto), PLACEMENT, ids, newKey);

    expect((result.copy as Element).scope).toBe('#/properties/toString');
    expect(result.schema).toBe(schema);
    expect(newKey).not.toHaveBeenCalled();
  });

  it('leaves the schema object untouched when the copy has no Controls', () => {
    const { root, schema, heading } = fixture();
    const ids = createElementIds();
    const newKey = keys('cccccccc');
    const result = copyElement(
      { schema, uischema: root },
      ids.idOf(heading),
      PLACEMENT,
      ids,
      newKey,
    );

    expect(result.schema).toBe(schema);
    expect(result.copy).toEqual({
      ...heading,
      options: { level: 1, gridItem: { w: 6, x: 2, y: 8 } },
    });
    expect(newKey).not.toHaveBeenCalled();
  });

  it('adds no required array to a schema that had none', () => {
    const { root, name } = fixture();
    const schema = deepFreeze({
      type: 'object',
      properties: { aaaaaaaa: { type: 'string' } },
    } as JsonSchema);
    const ids = createElementIds();
    const result = copyElement(
      { schema, uischema: root },
      ids.idOf(name),
      PLACEMENT,
      ids,
      keys('cccccccc'),
    );

    expect(result.schema).not.toHaveProperty('required');
    expect(Object.keys(result.schema.properties ?? {})).toEqual(['aaaaaaaa', 'cccccccc']);
  });
});

// Doc 197 rules 19-20 — a copied subtree must not duplicate an authored Stage/Form id: an ambiguous
// address breaks edge targeting and deep linking. Defensive today, since no UI path copies either.
describe('copyElement — authored ids (doc 197 rules 19-20)', () => {
  const EMPTY_SCHEMA = { type: 'object', properties: {} } as JsonSchema;

  /** Flow [ Applicant 's1' [ contact 'f1', plain (no id) ] ] with one edge out of s1. */
  function flowFixture() {
    const contact = { type: 'Form', label: 'Contact', options: { id: 'f1' }, elements: [] };
    const plain = { type: 'Form', label: 'Plain', elements: [] };
    const stage = {
      type: 'Stage',
      label: 'Applicant',
      options: { id: 's1' },
      elements: [contact, plain],
    };
    const flow = {
      type: 'Flow',
      options: { edges: [{ id: 'e1', source: 's1', target: 's2' }] },
      elements: [stage],
    } as Element;
    return { flow, stage, contact, plain };
  }

  const optionsOf = (element: UISchemaElement | undefined) =>
    (element as Element | undefined)?.options ?? {};

  it('gives a copied Form a fresh authored id, leaving the original alone', () => {
    const { flow, contact } = flowFixture();
    const ids = createElementIds();
    const result = copyElement(
      { schema: EMPTY_SCHEMA, uischema: flow },
      ids.idOf(contact as UISchemaElement),
      PLACEMENT,
      ids,
      keys('cccccccc'),
    );

    expect(optionsOf(result.copy)['id']).toBe('cccccccc');
    expect(contact.options.id).toBe('f1');
  });

  it('gives a copied Stage a fresh id, and fresh ids to every Form inside it', () => {
    const { flow, stage } = flowFixture();
    const ids = createElementIds();
    const result = copyElement(
      { schema: EMPTY_SCHEMA, uischema: flow },
      ids.idOf(stage as UISchemaElement),
      PLACEMENT,
      ids,
      keys('cccccccc', 'dddddddd'),
    );

    expect(optionsOf(result.copy)['id']).toBe('cccccccc');
    const copiedForms = elementsOf(result.copy);
    expect(optionsOf(copiedForms[0])['id']).toBe('dddddddd');
    expect(stage.options.id).toBe('s1');
  });

  it('regenerates an id that collides with one already in the document', () => {
    const { flow, contact } = flowFixture();
    const ids = createElementIds();
    const newKey = keys('f1', 's1', 'cccccccc');
    const result = copyElement(
      { schema: EMPTY_SCHEMA, uischema: flow },
      ids.idOf(contact as UISchemaElement),
      PLACEMENT,
      ids,
      newKey,
    );

    expect(optionsOf(result.copy)['id']).toBe('cccccccc');
    expect(newKey).toHaveBeenCalledTimes(3);
  });

  it('leaves an element with no authored id without one', () => {
    const { flow, plain } = flowFixture();
    const ids = createElementIds();
    const newKey = keys('cccccccc');
    const result = copyElement(
      { schema: EMPTY_SCHEMA, uischema: flow },
      ids.idOf(plain as UISchemaElement),
      PLACEMENT,
      ids,
      newKey,
    );

    expect(optionsOf(result.copy)['id']).toBeUndefined();
    expect(newKey).not.toHaveBeenCalled();
  });

  it('copies no edges, so a copied Stage arrives unconnected', () => {
    const { flow, stage } = flowFixture();
    const ids = createElementIds();
    const result = copyElement(
      { schema: EMPTY_SCHEMA, uischema: flow },
      ids.idOf(stage as UISchemaElement),
      PLACEMENT,
      ids,
      keys('cccccccc', 'dddddddd'),
    );

    const edges = (result.uischema as Element).options?.['edges'];
    expect(edges).toEqual([{ id: 'e1', source: 's1', target: 's2' }]);
    expect(optionsOf(result.copy)['id']).not.toBe('s1');
  });
});
