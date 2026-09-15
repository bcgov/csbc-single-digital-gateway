import type { GridStackMoveOpts, GridStackNode } from 'gridstack';
import { describe, expect, it } from 'vitest';
import { GridFreeEngine } from '../src/renderers/gridstack/grid-free-engine';

// Doc 189 rules 21c-21d — the free Grid engine sizes a palette item as it enters, and fits it to its row on every
// drag step, so the placeholder previews the drop.

/** A node as gridstack hands it over mid-drag, with the internal flags and the drag-in template. */
type DragNode = GridStackNode & {
  _isExternal?: boolean;
  _temporaryRemoved?: boolean;
  dragInTemplate?: string;
};

const entering = (w: number): DragNode => ({
  w,
  h: 4,
  _isExternal: true,
  _temporaryRemoved: true,
  dragInTemplate: 'text',
});

const move = (o: Partial<GridStackMoveOpts>) => o as GridStackMoveOpts;

describe('GridFreeEngine — entering (rule 21c)', () => {
  it.each([1, 12])(
    'makes an entering palette item 6 columns wide, whatever width (%i) it arrives at',
    (w) => {
      const node = entering(w);
      new GridFreeEngine({ column: 12 }).nodeBoundFix(node);
      expect(node.w).toBe(6);
    },
  );

  it('never makes one wider than a narrow grid', () => {
    const node = entering(1);
    new GridFreeEngine({ column: 4 }).nodeBoundFix(node);
    expect(node.w).toBe(4);
  });

  it('leaves an item from another grid and a placed node alone', () => {
    const engine = new GridFreeEngine({ column: 12 });
    const fromAnotherGrid: DragNode = { w: 1, h: 4, _isExternal: true, _temporaryRemoved: true };
    const placed: DragNode = { w: 1, h: 4, dragInTemplate: 'text' };

    engine.nodeBoundFix(fromAnotherGrid);
    engine.nodeBoundFix(placed);

    expect(fromAnotherGrid.w).toBe(1);
    expect(placed.w).toBe(1);
  });
});

describe('GridFreeEngine — dragging (rule 21d)', () => {
  it('fits a palette item beside a 7-column item at 5 columns, leaving that item in place', () => {
    const engine = new GridFreeEngine({ column: 12 });
    engine.addNode({ id: 'wide', x: 0, y: 0, w: 7, h: 5 });
    const dragged = engine.addNode({
      id: 'drag',
      x: 0,
      y: 5,
      w: 6,
      h: 4,
      dragInTemplate: 'text',
    } as DragNode);

    engine.moveNodeCheck(dragged, move({ x: 9, y: 0 }));

    expect({ x: dragged.x, y: dragged.y, w: dragged.w }).toEqual({ x: 7, y: 0, w: 5 });
    expect(engine.nodes.find((node) => node.id === 'wide')).toMatchObject({ x: 0, y: 0, w: 7 });
  });

  it('does not fit the grid’s own items', () => {
    const engine = new GridFreeEngine({ column: 12 });
    engine.addNode({ id: 'wide', x: 0, y: 0, w: 7, h: 5 });
    const own = engine.addNode({ id: 'own', x: 0, y: 5, w: 6, h: 4 });

    engine.moveNodeCheck(own, move({ x: 2, y: 5 }));

    expect(own.w).toBe(6);
  });
});
