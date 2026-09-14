import type { UISchemaElement } from '@jsonforms/core';
import type { GridStackMoveOpts, GridStackNode } from 'gridstack';
import { describe, expect, it } from 'vitest';
import { buildGridStackOptions } from '../src/renderers/gridstack/grid-options';
import { GridRowEngine } from '../src/renderers/gridstack/grid-row-engine';

// Doc 180 rule 30b — the HorizontalLayout row engine: one line, items side by side, sized while dragging.

/** A node as gridstack hands it over mid-drag, with the internal flags the row engine reads. */
type DragNode = GridStackNode & { _isExternal?: boolean; _temporaryRemoved?: boolean };

/** A row engine of `column` columns holding one 7-row-tall item per width, laid left to right. */
function rowOf(column: number, ...widths: number[]) {
  const engine = new GridRowEngine({ column });
  let x = 0;
  const nodes = widths.map((w, index) => {
    const node = engine.addNode({ id: `n${index}`, x, y: 0, w, h: 7 });
    x += w;
    return node;
  });
  return { engine, nodes };
}

/** The row in reading order. */
const layoutOf = (engine: GridRowEngine) =>
  engine.nodes
    .toSorted((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0))
    .map(({ id, x, y, w }) => ({ id, x, y, w }));

const move = (o: Partial<GridStackMoveOpts>) => o as GridStackMoveOpts;

/** gridstack's internal dirty flag — what makes it reposition an item's DOM. */
function isDirty(node: GridStackNode | undefined): boolean | undefined {
  const { _dirty: dirty } = (node ?? {}) as { _dirty?: boolean };
  return dirty;
}

describe('GridRowEngine — entering from another grid (rule 30b)', () => {
  it('gives an item entering from another grid width 1 before it is placed', () => {
    const { engine } = rowOf(4, 2, 1);
    const entering: DragNode = { id: 'in', w: 6, h: 7, _isExternal: true, _temporaryRemoved: true };

    engine.nodeBoundFix(entering);

    expect(entering.w).toBe(1);
  });

  it("keeps the width of the row's own item dragged out and back in", () => {
    const { engine } = rowOf(4, 2, 1);
    const returning: DragNode = { id: 'n0', w: 2, h: 7, _temporaryRemoved: true };

    engine.nodeBoundFix(returning);

    expect(returning.w).toBe(2);
  });

  it('inserts an added item at the pointer and shifts the items from there sideways, never down', () => {
    const { engine } = rowOf(4, 2, 1);

    engine.addNode({ id: 'in', x: 2, y: 0, w: 1, h: 7, _isExternal: true } as DragNode);

    expect(layoutOf(engine)).toEqual([
      { id: 'n0', x: 0, y: 0, w: 2 },
      { id: 'in', x: 2, y: 0, w: 1 },
      { id: 'n1', x: 3, y: 0, w: 1 },
    ]);
  });
});

describe('GridRowEngine — dragging within the row (rule 30b)', () => {
  it('reorders by the pointer, shifting neighbours sideways and marking them dirty', () => {
    const { engine, nodes } = rowOf(4, 2, 1);
    const [first, second] = nodes;

    expect(engine.moveNodeCheck(second as GridStackNode, move({ x: 0, y: 4 }))).toBe(true);

    expect(layoutOf(engine)).toEqual([
      { id: 'n1', x: 0, y: 0, w: 1 },
      { id: 'n0', x: 1, y: 0, w: 2 },
    ]);
    expect(isDirty(first)).toBe(true);
  });

  it('reports no move while the pointer stays within the current slot', () => {
    const { engine, nodes } = rowOf(4, 2, 1);

    expect(engine.moveNodeCheck(nodes[0] as GridStackNode, move({ x: 0, y: 0 }))).toBe(false);
    expect(layoutOf(engine)).toEqual([
      { id: 'n0', x: 0, y: 0, w: 2 },
      { id: 'n1', x: 2, y: 0, w: 1 },
    ]);
  });
});

describe('GridRowEngine — resizing and removing (rule 30b)', () => {
  it('grows an item only into free columns, shifting its neighbours sideways', () => {
    const { engine, nodes } = rowOf(4, 2, 1);
    const first = nodes[0] as GridStackNode;

    expect(engine.moveNodeCheck(first, move({ x: 0, y: 0, w: 3, h: 7, resizing: true }))).toBe(
      true,
    );
    expect(layoutOf(engine)).toEqual([
      { id: 'n0', x: 0, y: 0, w: 3 },
      { id: 'n1', x: 3, y: 0, w: 1 },
    ]);

    // No free column left: the width stays and nothing wraps.
    expect(engine.moveNodeCheck(first, move({ x: 0, y: 0, w: 4, h: 7, resizing: true }))).toBe(
      false,
    );
    expect(layoutOf(engine)).toEqual([
      { id: 'n0', x: 0, y: 0, w: 3 },
      { id: 'n1', x: 3, y: 0, w: 1 },
    ]);
  });

  it('pulls neighbours left when an item shrinks', () => {
    const { engine, nodes } = rowOf(4, 2, 1);

    engine.moveNodeCheck(
      nodes[0] as GridStackNode,
      move({ x: 0, y: 0, w: 1, h: 7, resizing: true }),
    );

    expect(layoutOf(engine)).toEqual([
      { id: 'n0', x: 0, y: 0, w: 1 },
      { id: 'n1', x: 1, y: 0, w: 1 },
    ]);
  });

  it('closes the gap when an item leaves the row', () => {
    const { engine, nodes } = rowOf(4, 2, 1, 1);

    engine.removeNode(nodes[0] as GridStackNode);

    expect(layoutOf(engine)).toEqual([
      { id: 'n1', x: 0, y: 0, w: 1 },
      { id: 'n2', x: 1, y: 0, w: 1 },
    ]);
  });
});

describe('row engine wiring (rules 27, 30b)', () => {
  const heading = { type: 'Heading', text: 'A' } as UISchemaElement;
  const build = (layout: 'grid' | 'vertical' | 'horizontal') =>
    buildGridStackOptions({
      elements: [heading],
      elementOptions: undefined,
      gridOptions: undefined,
      idPrefix: 'g',
      layout,
    });

  it('gives only a HorizontalLayout grid the row engine', () => {
    expect(build('horizontal').engineClass).toBe(GridRowEngine);
    expect(build('grid')).not.toHaveProperty('engineClass');
    expect(build('vertical')).not.toHaveProperty('engineClass');
  });
});
