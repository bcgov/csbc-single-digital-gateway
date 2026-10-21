import type { UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import type { LayoutNode } from '../src/renderers/gridstack/grid-editor';
import { applyLayout, applyMove } from '../src/studio/layout/apply-layout';
import { createElementIds, type ElementIds } from '../src/studio/layout/element-ids';

// Doc 183 rules 6, 11-14 — pure uischema updates from finished gestures.

type Element = UISchemaElement & { elements?: Element[] };

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/** A fresh, frozen fixture: root Grid [heading, name, inner Grid [city]], all placed. */
function fixture() {
  const heading = {
    type: 'Heading',
    text: 'H',
    options: { level: 1, gridItem: { x: 0, y: 0, w: 12 } },
  };
  const name = {
    type: 'Control',
    scope: '#/properties/name',
    options: { gridItem: { x: 0, y: 5, w: 12, minW: 2 } },
  };
  const city = {
    type: 'Control',
    scope: '#/properties/city',
    options: { gridItem: { x: 0, y: 0, w: 8 } },
  };
  const inner = { type: 'Grid', options: { gridItem: { x: 0, y: 13, w: 12 } }, elements: [city] };
  const root = { type: 'Grid', elements: [heading, name, inner] } as Element;
  deepFreeze(root);
  return { root, heading, name, city, inner };
}

const node = (
  ids: ElementIds,
  element: object,
  x: number,
  y: number,
  w: number,
  extra: Partial<LayoutNode> = {},
) => ({
  id: ids.idOf(element),
  x,
  y,
  w,
  ...extra,
});

const byId = (ids: ElementIds, elements: readonly Element[] | undefined, element: object) =>
  elements?.find((candidate) => ids.idOf(candidate) === ids.idOf(element));

describe('applyLayout', () => {
  it('writes x, y and w into options.gridItem, keeping other gridItem and option keys', () => {
    const { root, heading, name, inner } = fixture();
    const ids = createElementIds();

    const next = applyLayout(
      root,
      ids.idOf(root),
      [node(ids, heading, 0, 0, 12), node(ids, name, 6, 0, 6), node(ids, inner, 0, 13, 12)],
      ids,
    ) as Element;

    expect(byId(ids, next.elements, name)?.options).toStrictEqual({
      gridItem: { x: 6, y: 0, w: 6, minW: 2 },
    });
    expect(byId(ids, next.elements, heading)?.options?.['level']).toBe(1);
  });

  it('writes h only for an element sized by hand, never for a Control', () => {
    const { root, heading, name, inner } = fixture();
    const ids = createElementIds();

    const next = applyLayout(
      root,
      ids.idOf(root),
      [
        node(ids, heading, 0, 0, 12, { h: 9, minH: 5 }),
        node(ids, name, 0, 9, 12, { h: 8 }),
        node(ids, inner, 0, 17, 12, { h: 10, minH: 10 }),
      ],
      ids,
    ) as Element;

    expect(byId(ids, next.elements, heading)?.options?.['gridItem']).toStrictEqual({
      x: 0,
      y: 0,
      w: 12,
      h: 9,
    });
    expect(byId(ids, next.elements, name)?.options?.['gridItem']).not.toHaveProperty('h');
    expect(byId(ids, next.elements, inner)?.options?.['gridItem']).not.toHaveProperty('h');
  });

  it('removes h when a hand-sized element is back at its content floor', () => {
    const { heading, name, inner } = fixture();
    const tall = {
      ...heading,
      options: { ...heading.options, gridItem: { x: 0, y: 0, w: 12, h: 9 } },
    };
    const root = deepFreeze({ type: 'Grid', elements: [tall, name, inner] }) as Element;
    const ids = createElementIds();

    const next = applyLayout(
      root,
      ids.idOf(root),
      [
        node(ids, tall, 0, 0, 12, { h: 5, minH: 5 }),
        node(ids, name, 0, 5, 12),
        node(ids, inner, 0, 13, 12),
      ],
      ids,
    ) as Element;

    expect(byId(ids, next.elements, tall)?.options?.['gridItem']).toStrictEqual({
      x: 0,
      y: 0,
      w: 12,
    });
  });

  it('keeps unchanged elements, and the whole uischema, by identity', () => {
    const { root, heading, name, inner } = fixture();
    const ids = createElementIds();

    const same = applyLayout(
      root,
      ids.idOf(root),
      [node(ids, heading, 0, 0, 12), node(ids, name, 0, 5, 12), node(ids, inner, 0, 13, 12)],
      ids,
    );
    expect(same).toBe(root);

    const next = applyLayout(
      root,
      ids.idOf(root),
      [node(ids, heading, 0, 0, 12), node(ids, name, 0, 5, 6), node(ids, inner, 0, 13, 12)],
      ids,
    ) as Element;
    expect(next).not.toBe(root);
    expect(byId(ids, next.elements, heading)).toBe(heading);
    expect(byId(ids, next.elements, inner)).toBe(inner);
  });

  it('sorts the grid elements by y, then x', () => {
    const { root, heading, name, inner } = fixture();
    const ids = createElementIds();

    const next = applyLayout(
      root,
      ids.idOf(root),
      [node(ids, heading, 0, 5, 12), node(ids, name, 6, 0, 6), node(ids, inner, 0, 0, 6)],
      ids,
    ) as Element;

    expect(next.elements?.map((element) => ids.idOf(element))).toEqual([
      ids.idOf(inner),
      ids.idOf(name),
      ids.idOf(heading),
    ]);
  });

  it('carries ids to every replaced element, the root included', () => {
    const { root, heading, name, inner } = fixture();
    const ids = createElementIds();
    const rootId = ids.idOf(root);
    const nameId = ids.idOf(name);

    const next = applyLayout(
      root,
      rootId,
      [node(ids, heading, 0, 0, 12), node(ids, name, 0, 5, 6), node(ids, inner, 0, 13, 12)],
      ids,
    ) as Element;
    const nextName = next.elements?.[1];

    expect(nextName).not.toBe(name);
    expect(ids.idOf(nextName as object)).toBe(nameId);
    expect(ids.idOf(next)).toBe(rootId);
  });

  it('updates a nested grid found by id, rebuilding only its ancestors', () => {
    const { root, heading, name, city, inner } = fixture();
    const ids = createElementIds();

    const next = applyLayout(root, ids.idOf(inner), [node(ids, city, 4, 0, 8)], ids) as Element;
    const nextInner = byId(ids, next.elements, inner);

    expect(nextInner).not.toBe(inner);
    expect(nextInner?.elements?.[0]?.options?.['gridItem']).toStrictEqual({ x: 4, y: 0, w: 8 });
    expect(byId(ids, next.elements, heading)).toBe(heading);
    expect(byId(ids, next.elements, name)).toBe(name);
  });

  it('returns the uischema unchanged for an unknown grid id', () => {
    const { root, heading } = fixture();
    const ids = createElementIds();
    expect(applyLayout(root, 'el-999', [node(ids, heading, 3, 3, 3)], ids)).toBe(root);
  });
});

describe('applyMove', () => {
  it('moves an element into another grid and applies both grids’ nodes', () => {
    const { root, heading, name, city, inner } = fixture();
    const ids = createElementIds();

    const next = applyMove(
      root,
      {
        elementId: ids.idOf(name),
        fromGridId: ids.idOf(root),
        toGridId: ids.idOf(inner),
        fromNodes: [node(ids, heading, 0, 0, 12), node(ids, inner, 0, 5, 12, { h: 14, minH: 14 })],
        toNodes: [node(ids, city, 0, 0, 8), node(ids, name, 8, 0, 4, { h: 8 })],
      },
      ids,
    ) as Element;

    expect(next.elements?.map((element) => ids.idOf(element))).toEqual([
      ids.idOf(heading),
      ids.idOf(inner),
    ]);
    const nextInner = byId(ids, next.elements, inner);
    expect(nextInner?.elements?.map((element) => ids.idOf(element))).toEqual([
      ids.idOf(city),
      ids.idOf(name),
    ]);
    expect(byId(ids, nextInner?.elements, name)?.options).toStrictEqual({
      gridItem: { x: 8, y: 0, w: 4, minW: 2 },
    });
    expect(byId(ids, next.elements, inner)?.options?.['gridItem']).toStrictEqual({
      x: 0,
      y: 5,
      w: 12,
    });
  });

  it('refuses to move a Grid into itself or into one of its descendants', () => {
    const { root, heading, city, inner } = fixture();
    const deeper = { type: 'Grid', elements: [] };
    const withDeeper = deepFreeze({
      type: 'Grid',
      elements: [heading, { ...inner, elements: [city, deeper] }],
    }) as Element;
    const ids = createElementIds();
    const nestedInner = withDeeper.elements?.[1] as Element;

    expect(
      applyMove(
        root,
        {
          elementId: ids.idOf(inner),
          fromGridId: ids.idOf(root),
          toGridId: ids.idOf(inner),
          fromNodes: [],
          toNodes: [],
        },
        ids,
      ),
    ).toBe(root);

    expect(
      applyMove(
        withDeeper,
        {
          elementId: ids.idOf(nestedInner),
          fromGridId: ids.idOf(withDeeper),
          toGridId: ids.idOf(deeper),
          fromNodes: [],
          toNodes: [],
        },
        ids,
      ),
    ).toBe(withDeeper);
  });

  it('returns the uischema unchanged when the element is not in the source grid', () => {
    const { root, city, inner } = fixture();
    const ids = createElementIds();

    expect(
      applyMove(
        root,
        {
          elementId: ids.idOf(city),
          fromGridId: ids.idOf(root),
          toGridId: ids.idOf(inner),
          fromNodes: [],
          toNodes: [],
        },
        ids,
      ),
    ).toBe(root);
  });
});
