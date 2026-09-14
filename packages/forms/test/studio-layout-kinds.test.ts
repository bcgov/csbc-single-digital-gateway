import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it, vi } from 'vitest';
import type { LayoutNode } from '../src/renderers/gridstack/grid-editor';
import { applyLayout, applyMove } from '../src/studio/layout/apply-layout';
import { copyElement } from '../src/studio/layout/copy-element';
import { createElementIds, type ElementIds } from '../src/studio/layout/element-ids';
import { findById, type TreeElement } from '../src/studio/layout/element-tree';

// Doc 183 rule 12b and doc 185 rule 15b — write-back and copy inside VerticalLayout / HorizontalLayout.

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/** Root Grid [vertical [tall, name], horizontal (4 columns) [wide, label], footer], all frozen. */
function fixture() {
  const tall = { type: 'Heading', text: 'Tall', options: { gridItem: { x: 3, y: 2, w: 6, h: 9 } } };
  const name = { type: 'Control', scope: '#/properties/aaaaaaaa' };
  const vertical = { type: 'VerticalLayout', elements: [tall, name] };
  const wide = {
    type: 'Control',
    scope: '#/properties/bbbbbbbb',
    options: { gridItem: { x: 5, w: 2 } },
  };
  const label = { type: 'Heading', text: 'Label' };
  const horizontal = { type: 'HorizontalLayout', options: { columns: 4 }, elements: [wide, label] };
  const footer = {
    type: 'Heading',
    text: 'Footer',
    options: { gridItem: { x: 0, y: 20, w: 12, h: 8 } },
  };
  const root = { type: 'Grid', elements: [vertical, horizontal, footer] } as TreeElement;
  const schema = {
    type: 'object',
    properties: { aaaaaaaa: { type: 'string' }, bbbbbbbb: { type: 'string' } },
  } as JsonSchema;
  deepFreeze(root);
  deepFreeze(schema);
  return { root, schema, vertical, tall, name, horizontal, wide, label, footer };
}

const node = (
  ids: ElementIds,
  element: object,
  x: number,
  y: number,
  w: number,
  extra: Partial<LayoutNode> = {},
): LayoutNode => ({ id: ids.idOf(element as UISchemaElement), x, y, w, ...extra });

const elementsIn = (ids: ElementIds, root: UISchemaElement, layout: object) =>
  findById(root as TreeElement, ids.idOf(layout as UISchemaElement), ids)?.elements ?? [];

const id = (ids: ElementIds, element: object) => ids.idOf(element as UISchemaElement);

describe('applyLayout in a VerticalLayout (doc 183 rule 12b)', () => {
  it('orders elements by node y and writes no gridItem', () => {
    const { root, vertical, tall, name } = fixture();
    const ids = createElementIds();

    const next = applyLayout(
      root,
      id(ids, vertical),
      [node(ids, tall, 0, 4, 1, { h: 3 }), node(ids, name, 0, 0, 1, { h: 4 })],
      ids,
    );

    const elements = elementsIn(ids, next, vertical);
    expect(elements).toHaveLength(2);
    expect(elements[0]).toBe(name);
    expect(elements[1]).toBe(tall);
  });

  it('returns the same uischema when the order did not change', () => {
    const { root, vertical, tall, name } = fixture();
    const ids = createElementIds();

    const next = applyLayout(
      root,
      id(ids, vertical),
      [node(ids, tall, 0, 0, 1, { h: 3 }), node(ids, name, 0, 3, 1)],
      ids,
    );
    expect(next).toBe(root);
  });
});

describe('applyLayout in a HorizontalLayout (doc 183 rule 12b)', () => {
  it('orders elements by node x and writes only w, keeping every other key and the element id', () => {
    const { root, horizontal, wide, label } = fixture();
    const ids = createElementIds();

    const next = applyLayout(
      root,
      id(ids, horizontal),
      [node(ids, wide, 3, 0, 1), node(ids, label, 0, 0, 3)],
      ids,
    );

    const [first, second] = elementsIn(ids, next, horizontal);
    expect(first).toEqual({ ...label, options: { gridItem: { w: 3 } } });
    expect(second).toEqual({
      ...wide,
      options: { gridItem: { x: 5, w: 1 } },
    });
    expect(second && ids.idOf(second)).toBe(id(ids, wide));
  });

  it('returns the same uischema when order and widths did not change', () => {
    const { root, horizontal, wide, label } = fixture();
    const ids = createElementIds();

    const next = applyLayout(
      root,
      id(ids, horizontal),
      [node(ids, wide, 0, 0, 2), node(ids, label, 2, 0, 1)],
      ids,
    );
    expect(next).toBe(root);
  });
});

describe('applyMove with layouts (doc 183 rule 12b)', () => {
  it('writes an element moved into a HorizontalLayout at width 1, keeping its other gridItem keys', () => {
    const { root, horizontal, wide, label, footer } = fixture();
    const ids = createElementIds();

    const next = applyMove(
      root,
      {
        elementId: id(ids, footer),
        fromGridId: id(ids, root),
        toGridId: id(ids, horizontal),
        fromNodes: [],
        toNodes: [node(ids, wide, 0, 0, 2), node(ids, label, 2, 0, 1), node(ids, footer, 3, 0, 6)],
      },
      ids,
    );

    const row = elementsIn(ids, next, horizontal);
    expect(row.slice(0, 2)).toEqual([wide, label]);
    expect(row[2]).toEqual({ ...footer, options: { gridItem: { x: 0, y: 20, w: 1, h: 8 } } });
    expect((next as TreeElement).elements).toHaveLength(2);
  });

  it('leaves the gridItem of an element moved into a VerticalLayout untouched', () => {
    const { root, vertical, tall, name, footer } = fixture();
    const ids = createElementIds();

    const next = applyMove(
      root,
      {
        elementId: id(ids, footer),
        fromGridId: id(ids, root),
        toGridId: id(ids, vertical),
        fromNodes: [],
        toNodes: [node(ids, tall, 0, 0, 1), node(ids, name, 0, 1, 1), node(ids, footer, 0, 2, 1)],
      },
      ids,
    );

    const stack = elementsIn(ids, next, vertical);
    expect(stack).toHaveLength(3);
    expect(stack[2]).toBe(footer);
  });

  it('writes x, y and w from the drop node when an element leaves a layout for a Grid', () => {
    const { root, vertical, horizontal, tall, name, footer } = fixture();
    const ids = createElementIds();

    const next = applyMove(
      root,
      {
        elementId: id(ids, tall),
        fromGridId: id(ids, vertical),
        toGridId: id(ids, root),
        fromNodes: [node(ids, name, 0, 0, 1)],
        toNodes: [
          node(ids, vertical, 0, 0, 12),
          node(ids, horizontal, 0, 10, 12),
          node(ids, footer, 0, 20, 12, { h: 8, minH: 8 }),
          node(ids, tall, 0, 30, 6, { h: 9, minH: 9 }),
        ],
      },
      ids,
    );

    expect(elementsIn(ids, next, vertical)).toEqual([name]);
    const moved = findById(next as TreeElement, id(ids, tall), ids);
    expect(moved?.options?.['gridItem']).toEqual({ x: 0, y: 30, w: 6 });
  });
});

describe('copyElement in layouts (doc 185 rule 15b)', () => {
  const PLACEMENT = { x: 0, y: 7, w: 1, h: 9 };

  it('inserts a copy after the original in a VerticalLayout with its gridItem unchanged', () => {
    const { root, schema, vertical, tall, name } = fixture();
    const ids = createElementIds();

    const result = copyElement({ schema, uischema: root }, id(ids, tall), PLACEMENT, ids, vi.fn());

    expect(result.copy).toEqual(tall);
    expect(result.copy).not.toBe(tall);
    const stack = elementsIn(ids, result.uischema, vertical);
    expect(stack).toEqual([tall, tall, name]);
    expect(stack[1]).toBe(result.copy);
  });

  it('inserts a width-1 copy after the original in a HorizontalLayout with a free column', () => {
    const { root, schema, horizontal, wide, label } = fixture();
    const ids = createElementIds();

    const result = copyElement({ schema, uischema: root }, id(ids, label), PLACEMENT, ids, vi.fn());

    expect(result.copy).toEqual({ ...label, options: { gridItem: { w: 1 } } });
    const row = elementsIn(ids, result.uischema, horizontal);
    expect(row).toHaveLength(3);
    expect(row.slice(0, 2)).toEqual([wide, label]);
    expect(row[2]).toBe(result.copy);
  });

  it('refuses a copy in a HorizontalLayout whose widths already fill its columns', () => {
    const { schema, wide, label } = fixture();
    const row = { type: 'HorizontalLayout', options: { columns: 3 }, elements: [wide, label] };
    const root = deepFreeze({ type: 'Grid', elements: [row] } as TreeElement);
    const ids = createElementIds();
    const newKey = vi.fn(() => 'cccccccc');

    const result = copyElement({ schema, uischema: root }, id(ids, wide), PLACEMENT, ids, newKey);

    expect(result.copy).toBeUndefined();
    expect(result.uischema).toBe(root);
    expect(result.schema).toBe(schema);
    expect(newKey).not.toHaveBeenCalled();
  });
});
