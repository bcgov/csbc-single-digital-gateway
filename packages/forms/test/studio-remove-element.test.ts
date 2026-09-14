import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { createElementIds } from '../src/studio/layout/element-ids';
import { removeElement } from '../src/studio/layout/remove-element';

// Doc 185 rules 24-26 — pure removal of a grid element and the data properties nothing else uses.

type Element = UISchemaElement & { elements?: Element[]; scope?: string };

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/** Root Grid [heading, name, inner Grid [city, postal], cityMirror, proto] and its schema. */
function fixture(required: string[] = ['aaaaaaaa', 'cccccccc']) {
  const heading = { type: 'Heading', text: 'H', options: { level: 1 } };
  const name = { type: 'Control', scope: '#/properties/aaaaaaaa', options: { gridItem: { y: 3 } } };
  const city = { type: 'Control', scope: '#/properties/bbbbbbbb' };
  const postal = { type: 'Control', scope: '#/properties/cccccccc' };
  const inner = { type: 'Grid', elements: [city, postal] };
  const cityMirror = { type: 'Control', scope: '#/properties/bbbbbbbb' };
  const proto = { type: 'Control', scope: '#/properties/toString' };
  const root = { type: 'Grid', elements: [heading, name, inner, cityMirror, proto] } as Element;
  const schema = {
    type: 'object',
    properties: {
      aaaaaaaa: { type: 'string', title: 'Name' },
      bbbbbbbb: { type: 'string', title: 'City' },
      cccccccc: { type: 'string', title: 'Postal Code' },
      dddddddd: { type: 'number', title: 'Unused' },
    },
    required,
  } as JsonSchema;
  deepFreeze(root);
  deepFreeze(schema);
  return { root, schema, heading, name, inner, city, postal, cityMirror, proto };
}

const elementsOf = (element: UISchemaElement | undefined) =>
  (element as Element | undefined)?.elements ?? [];

describe('removeElement — uischema (rule 24)', () => {
  it('removes the element from its Grid, keeping siblings and the root id', () => {
    const { root, schema, heading, name, inner, cityMirror, proto } = fixture();
    const ids = createElementIds();
    const result = removeElement({ schema, uischema: root }, ids.idOf(name), ids);

    expect(elementsOf(result.uischema)).toEqual([heading, inner, cityMirror, proto]);
    elementsOf(result.uischema).forEach((element, index) =>
      expect(element).toBe([heading, inner, cityMirror, proto][index]),
    );
    expect(ids.idOf(result.uischema)).toBe(ids.idOf(root));
  });

  it('removes a nested element, rebuilding its Grid with the Grid id carried', () => {
    const { root, schema, inner, city, postal } = fixture();
    const ids = createElementIds();
    const result = removeElement({ schema, uischema: root }, ids.idOf(postal), ids);

    const nextInner = elementsOf(result.uischema)[2];
    expect(nextInner).not.toBe(inner);
    expect(ids.idOf(nextInner as object)).toBe(ids.idOf(inner));
    expect(elementsOf(nextInner)).toEqual([city]);
  });

  it('removes a Grid with everything inside it', () => {
    const { root, schema, heading, name, inner, cityMirror, proto } = fixture();
    const ids = createElementIds();
    const result = removeElement({ schema, uischema: root }, ids.idOf(inner), ids);

    expect(elementsOf(result.uischema)).toEqual([heading, name, cityMirror, proto]);
  });

  it('returns the same document for the root or an unknown id', () => {
    const { root, schema } = fixture();
    const ids = createElementIds();
    for (const id of [ids.idOf(root), 'el-unknown']) {
      const result = removeElement({ schema, uischema: root }, id, ids);
      expect(result.uischema).toBe(root);
      expect(result.schema).toBe(schema);
    }
  });
});

describe('removeElement — schema cleanup (rule 25)', () => {
  it("deletes a removed Control's property and its required entry, keeping the rest in order", () => {
    const { root, schema, name } = fixture();
    const ids = createElementIds();
    const result = removeElement({ schema, uischema: root }, ids.idOf(name), ids);

    expect(Object.keys(result.schema.properties ?? {})).toEqual([
      'bbbbbbbb',
      'cccccccc',
      'dddddddd',
    ]);
    expect(result.schema.properties?.['bbbbbbbb']).toBe(schema.properties?.['bbbbbbbb']);
    expect(result.schema.required).toEqual(['cccccccc']);
  });

  it('keeps a property another remaining Control still uses', () => {
    const { root, schema, city } = fixture();
    const ids = createElementIds();
    const result = removeElement({ schema, uischema: root }, ids.idOf(city), ids);

    expect(result.schema).toBe(schema);
  });

  it('cleans up every unused property of a removed Grid, but not shared or unrelated ones', () => {
    const { root, schema, inner } = fixture();
    const ids = createElementIds();
    const result = removeElement({ schema, uischema: root }, ids.idOf(inner), ids);

    expect(Object.keys(result.schema.properties ?? {})).toEqual([
      'aaaaaaaa',
      'bbbbbbbb',
      'dddddddd',
    ]);
    expect(result.schema.required).toEqual(['aaaaaaaa']);
  });

  it('drops a required array the removal empties', () => {
    const { root, schema, name } = fixture(['aaaaaaaa']);
    const ids = createElementIds();
    const result = removeElement({ schema, uischema: root }, ids.idOf(name), ids);

    expect(result.schema).not.toHaveProperty('required');
  });

  it('leaves the schema object untouched when removing a Heading or a Control without an own property', () => {
    const { root, schema, heading, proto } = fixture();
    const ids = createElementIds();

    expect(removeElement({ schema, uischema: root }, ids.idOf(heading), ids).schema).toBe(schema);
    expect(removeElement({ schema, uischema: root }, ids.idOf(proto), ids).schema).toBe(schema);
  });
});
