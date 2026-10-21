import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { createElementIds } from '../src/studio/layout/element-ids';
import {
  collapsePath,
  elementLabel,
  elementPath,
  pathSegments,
} from '../src/studio/layout/element-path';

// Doc 186 rules 11, 16, 19-20 — the pure path and label helpers behind the studio breadcrumbs.

const schema: JsonSchema = {
  type: 'object',
  properties: {
    cityKey: { type: 'string', title: 'City' },
    plainKey: { type: 'string' },
  },
};

const el = (element: object) => element as UISchemaElement;

const city = el({ type: 'Control', scope: '#/properties/cityKey' });
const untitled = el({ type: 'Control', scope: '#/properties/plainKey' });
const heading = el({ type: 'Heading', text: 'Delivery address' });
const grid = el({ type: 'Grid', elements: [heading, city] });
const root = el({ type: 'VerticalLayout', elements: [grid, untitled] });

describe('elementPath (rule 19)', () => {
  it('returns the elements from the root down to the element, inclusive', () => {
    const ids = createElementIds();
    const path = elementPath(root, ids.idOf(city), ids);
    expect(path).toHaveLength(3);
    expect(path[0]).toBe(root);
    expect(path[1]).toBe(grid);
    expect(path[2]).toBe(city);
  });

  it('returns just the root for the root id', () => {
    const ids = createElementIds();
    const path = elementPath(root, ids.idOf(root), ids);
    expect(path).toHaveLength(1);
    expect(path[0]).toBe(root);
  });

  it('returns an empty path for an id not in the tree', () => {
    const ids = createElementIds();
    expect(elementPath(root, 'el-999', ids)).toEqual([]);
  });
});

describe('elementLabel (rule 11)', () => {
  it("labels a Control by its string label first, trimmed, over the property's title", () => {
    expect(elementLabel(el({ ...city, label: '  Town ' }), schema)).toBe('Town');
  });

  it("labels a Control by its property's title when it has no string label", () => {
    expect(elementLabel(city, schema)).toBe('City');
    expect(elementLabel(el({ ...city, label: false }), schema)).toBe('City');
    expect(elementLabel(el({ ...city, label: '   ' }), schema)).toBe('City');
  });

  it('falls back to "Control" without a label or title, or for a non-own property', () => {
    expect(elementLabel(untitled, schema)).toBe('Control');
    expect(elementLabel(el({ type: 'Control', scope: '#/properties/toString' }), schema)).toBe(
      'Control',
    );
    expect(
      elementLabel(el({ type: 'Control', scope: '#/properties/a/properties/b' }), schema),
    ).toBe('Control');
  });

  it('labels a Heading by its text, else "Heading"', () => {
    expect(elementLabel(heading, schema)).toBe('Delivery address');
    expect(elementLabel(el({ type: 'Heading', text: '  ' }), schema)).toBe('Heading');
    expect(elementLabel(el({ type: 'Heading', text: 42 }), schema)).toBe('Heading');
  });

  it('labels any other element by its string label, else its type', () => {
    expect(elementLabel(el({ type: 'Group', label: 'Contact' }), schema)).toBe('Contact');
    expect(elementLabel(grid, schema)).toBe('Grid');
    expect(elementLabel(el({ type: 'HorizontalLayout', label: { text: 'x' } }), schema)).toBe(
      'HorizontalLayout',
    );
  });
});

describe('pathSegments (rule 20)', () => {
  it('names each element from the root to the selected one with its id and label', () => {
    const ids = createElementIds();
    expect(pathSegments(root, ids.idOf(city), schema, ids)).toEqual([
      { id: ids.idOf(root), label: 'VerticalLayout' },
      { id: ids.idOf(grid), label: 'Grid' },
      { id: ids.idOf(city), label: 'City' },
    ]);
  });

  it('is the root segment alone when nothing is selected or the id is unknown', () => {
    const ids = createElementIds();
    const rootOnly = [{ id: ids.idOf(root), label: 'VerticalLayout' }];
    expect(pathSegments(root, null, schema, ids)).toEqual(rootOnly);
    expect(pathSegments(root, 'el-999', schema, ids)).toEqual(rootOnly);
  });
});

const segments = (...labels: string[]) => labels.map((label) => ({ id: label, label }));

describe('collapsePath (rule 16)', () => {
  it('keeps a path of up to 4 segments whole', () => {
    const path = segments('a', 'b', 'c', 'd');
    expect(collapsePath(path, 4)).toEqual({ leading: path, hidden: [], trailing: [] });
    expect(collapsePath(segments('a'), 4)).toEqual({
      leading: segments('a'),
      hidden: [],
      trailing: [],
    });
  });

  it('collapses a longer path to the root, the hidden middle, then the parent and current', () => {
    expect(collapsePath(segments('a', 'b', 'c', 'd', 'e'), 4)).toEqual({
      leading: segments('a'),
      hidden: segments('b', 'c'),
      trailing: segments('d', 'e'),
    });
    expect(collapsePath(segments('a', 'b', 'c', 'd', 'e', 'f'), 4)).toEqual({
      leading: segments('a'),
      hidden: segments('b', 'c', 'd'),
      trailing: segments('e', 'f'),
    });
  });
});
