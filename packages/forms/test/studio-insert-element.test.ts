import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { withoutAuthoredIds } from './without-ids';
import { describe, expect, it } from 'vitest';
import { horizontalWidth } from '../src/renderers/gridstack/grid-layouts';
import { createElementIds } from '../src/studio/layout/element-ids';
import { findById, type TreeElement } from '../src/studio/layout/element-tree';
import { insertElement } from '../src/studio/layout/insert-element';

// Doc 189 rules 18, 20-23 — inserting a palette template into the studio document.

const el = (element: object) => element as UISchemaElement;

function fixture() {
  const schema: JsonSchema = {
    type: 'object',
    properties: { name: { type: 'string', title: 'Text 1' } },
    required: ['name'],
  };
  const name = el({
    type: 'Control',
    scope: '#/properties/name',
    options: { gridItem: { x: 0, y: 0, w: 6 } },
  });
  const grid = el({ type: 'Grid', options: { column: 6 }, elements: [name] });
  const plainGrid = el({ type: 'Grid', elements: [] });
  const stackHeading = el({ type: 'Heading', text: 'A' });
  const stack = el({ type: 'VerticalLayout', elements: [stackHeading] });
  const rowHeading = el({ type: 'Heading', text: 'r' });
  const row = el({ type: 'HorizontalLayout', options: { columns: 3 }, elements: [rowHeading] });
  const fullRow = el({
    type: 'HorizontalLayout',
    options: { columns: 2 },
    elements: [el({ type: 'Heading', text: 'x', options: { gridItem: { w: 2 } } })],
  });
  const heading = el({ type: 'Heading', text: 'Top' });
  const root = el({
    type: 'VerticalLayout',
    elements: [grid, plainGrid, stack, row, fullRow, heading],
  });
  const ids = createElementIds();
  const document = { schema, uischema: root };
  return {
    document,
    ids,
    name,
    grid,
    plainGrid,
    stack,
    stackHeading,
    row,
    rowHeading,
    fullRow,
    heading,
    root,
  };
}

type Fixture = ReturnType<typeof fixture>;

/** A key generator handing out `values` in order. */
const keys = (...values: string[]) => {
  const queue = [...values];
  return () => queue.shift() ?? 'fallback';
};

/** The element with the id of `element` in `uischema`. */
const nodeIn = (fx: Fixture, uischema: UISchemaElement, element: UISchemaElement) =>
  findById(uischema as TreeElement, fx.ids.idOf(element), fx.ids);

describe('click placement (rule 22)', () => {
  it('appends a Heading to a VerticalLayout, leaving the schema object alone', () => {
    const fx = fixture();
    const result = insertElement(
      fx.document,
      'heading',
      { gridId: fx.ids.idOf(fx.stack) },
      fx.ids,
      keys(),
    );
    expect(withoutAuthoredIds(result.inserted)).toEqual({
      type: 'Heading',
      text: 'Heading',
      options: { level: 2 },
    });
    expect(result.schema).toBe(fx.document.schema);
    expect(nodeIn(fx, result.uischema, fx.stack)?.elements).toEqual([
      fx.stackHeading,
      result.inserted,
    ]);
  });

  it("gives an item in a Grid the Grid's column count as width, else 12, and no x/y", () => {
    const fx = fixture();
    const inGrid = insertElement(
      fx.document,
      'heading',
      { gridId: fx.ids.idOf(fx.grid) },
      fx.ids,
      keys(),
    );
    expect(inGrid.inserted?.options).toEqual({ level: 2, gridItem: { w: 6 } });
    const inPlain = insertElement(
      fx.document,
      'grid',
      { gridId: fx.ids.idOf(fx.plainGrid) },
      fx.ids,
      keys(),
    );
    expect(withoutAuthoredIds(inPlain.inserted)).toEqual({
      type: 'Grid',
      elements: [],
      options: { gridItem: { w: 12 } },
    });
  });

  it('gives an item in a HorizontalLayout width 1', () => {
    const fx = fixture();
    const result = insertElement(
      fx.document,
      'checkbox',
      { gridId: fx.ids.idOf(fx.row) },
      fx.ids,
      keys('c1'),
    );
    expect(result.inserted?.options).toEqual({ gridItem: { w: 1 } });
    expect(nodeIn(fx, result.uischema, fx.row)?.elements).toEqual([fx.rowHeading, result.inserted]);
  });
});

describe('fields (rules 17-18)', () => {
  it('adds a property with a fresh key and the next numbered title, scoping the Control to it', () => {
    const fx = fixture();
    const result = insertElement(
      fx.document,
      'text',
      { gridId: fx.ids.idOf(fx.root) },
      fx.ids,
      keys('Kq6sJ1uA'),
    );
    expect(Object.keys(result.schema.properties ?? {})).toEqual(['name', 'Kq6sJ1uA']);
    expect(result.schema.properties?.['Kq6sJ1uA']).toEqual({ type: 'string', title: 'Text 2' });
    // A new field is required by default, appended after the properties already required.
    expect(result.schema.required).toEqual(['name', 'Kq6sJ1uA']);
    expect(withoutAuthoredIds(result.inserted)).toEqual({
      type: 'Control',
      scope: '#/properties/Kq6sJ1uA',
    });
    expect((result.uischema as TreeElement).elements?.at(-1)).toBe(result.inserted);
  });

  it('regenerates a key that collides with an existing property', () => {
    const fx = fixture();
    const result = insertElement(
      fx.document,
      'number',
      { gridId: fx.ids.idOf(fx.root) },
      fx.ids,
      keys('name', 'name', 'fresh'),
    );
    expect(result.schema.properties?.['fresh']).toEqual({ type: 'number', title: 'Number 1' });
    expect(result.schema.properties?.['name']).toEqual({ type: 'string', title: 'Text 1' });
  });

  it('makes a new field required, but never a boolean — its gate is Must be checked (doc 187 rule 29)', () => {
    const fx = fixture();
    const result = insertElement(
      fx.document,
      'checkbox',
      { gridId: fx.ids.idOf(fx.root) },
      fx.ids,
      keys('tick'),
    );
    expect(result.schema.properties?.['tick']).toEqual({ type: 'boolean', title: 'Checkbox 1' });
    expect(result.schema.required).toEqual(['name']);
  });
});

describe('drop placement (rule 21)', () => {
  it('lays out a dropped item in a Grid from its placement, spanning a narrow Grid (rule 21d)', () => {
    const fx = fixture();
    const nodes = [{ id: fx.ids.idOf(fx.name), x: 0, y: 0, w: 6 }];
    const result = insertElement(
      fx.document,
      'heading',
      { gridId: fx.ids.idOf(fx.grid), placement: { x: 1, y: 2, w: 4 }, nodes },
      fx.ids,
      keys(),
    );
    const grid = nodeIn(fx, result.uischema, fx.grid);
    expect(grid?.elements).toHaveLength(2);
    expect(grid?.elements?.[1]).toBe(result.inserted);
    // A 6-column Grid, and Name sits on another line: up to 6 wide is every column, so x moves back to 0.
    expect(result.inserted?.options?.['gridItem']).toEqual({ x: 0, y: 2, w: 6 });
  });

  it.each([
    ['widens a 1-column drop to 6 columns', { x: 3, y: 0, w: 1 }, { x: 3, y: 0, w: 6 }],
    ['ignores an arriving width over 6', { x: 2, y: 1, w: 8 }, { x: 2, y: 1, w: 6 }],
    [
      'moves a widened drop left to stay inside the Grid',
      { x: 10, y: 0, w: 1 },
      { x: 6, y: 0, w: 6 },
    ],
    ['ignores an arriving width wider than the Grid', { x: 4, y: 0, w: 20 }, { x: 4, y: 0, w: 6 }],
  ])('in an empty 12-column Grid, %s (rule 21d)', (_name, placement, gridItem) => {
    const fx = fixture();
    const result = insertElement(
      fx.document,
      'heading',
      { gridId: fx.ids.idOf(fx.plainGrid), placement, nodes: [] },
      fx.ids,
      keys(),
    );
    expect(result.inserted?.options?.['gridItem']).toEqual(gridItem);
  });

  it('fits a drop beside a 7-column item at 5 columns, as the engine previews it (rule 21d)', () => {
    const fx = fixture();
    const result = insertElement(
      fx.document,
      'heading',
      {
        gridId: fx.ids.idOf(fx.plainGrid),
        placement: { x: 9, y: 0, w: 6 },
        nodes: [{ id: 'beside', x: 0, y: 0, w: 7, h: 5 }],
      },
      fx.ids,
      keys(),
    );
    expect(result.inserted?.options?.['gridItem']).toEqual({ x: 7, y: 0, w: 5 });
  });

  it('orders a dropped item by y in a VerticalLayout', () => {
    const fx = fixture();
    const nodes = [{ id: fx.ids.idOf(fx.stackHeading), x: 0, y: 2, w: 1 }];
    const result = insertElement(
      fx.document,
      'text',
      { gridId: fx.ids.idOf(fx.stack), placement: { x: 0, y: 0, w: 1 }, nodes },
      fx.ids,
      keys('k1'),
    );
    expect(nodeIn(fx, result.uischema, fx.stack)?.elements).toEqual([
      result.inserted,
      fx.stackHeading,
    ]);
    expect(withoutAuthoredIds(result.inserted)).toEqual({
      type: 'Control',
      scope: '#/properties/k1',
    });
  });

  it('orders a dropped item by x in a HorizontalLayout, at width 1', () => {
    const fx = fixture();
    const nodes = [{ id: fx.ids.idOf(fx.rowHeading), x: 1, y: 0, w: 1 }];
    const result = insertElement(
      fx.document,
      'heading',
      { gridId: fx.ids.idOf(fx.row), placement: { x: 0, y: 0, w: 3 }, nodes },
      fx.ids,
      keys(),
    );
    const row = nodeIn(fx, result.uischema, fx.row);
    expect(row?.elements?.[0]).toBe(result.inserted);
    expect(row?.elements?.[1]).toBe(fx.rowHeading);
    // Exactly as after a move (doc 183 rule 12b): width 1, which an element without `gridItem.w` already has.
    expect(horizontalWidth(result.inserted as UISchemaElement, 3)).toBe(1);
  });
});

describe('refusals (rule 20)', () => {
  it.each([
    ['an unknown template', 'video', (fx: Fixture) => fx.ids.idOf(fx.root)],
    ['an unknown grid id', 'heading', () => 'el-999'],
    ['a target that is not a layout', 'heading', (fx: Fixture) => fx.ids.idOf(fx.heading)],
    ['a full HorizontalLayout', 'heading', (fx: Fixture) => fx.ids.idOf(fx.fullRow)],
  ])('returns the same document for %s', (_name, template, gridIdOf) => {
    const fx = fixture();
    const result = insertElement(
      fx.document,
      template,
      { gridId: gridIdOf(fx) },
      fx.ids,
      keys('k'),
    );
    expect(result.inserted).toBeUndefined();
    expect(result.schema).toBe(fx.document.schema);
    expect(result.uischema).toBe(fx.document.uischema);
  });
});
