import type { GridStackNode } from 'gridstack';
import { describe, expect, it } from 'vitest';
import { clampGrabOffset } from '../src/renderers/studio/grid-grab-offset';
import { cursorCell, GridCellEngine } from '../src/renderers/studio/grid-cell-engine';

// Nodes passed to the constructor get no `_id`, so nothing collides — add them with addNode (CLAUDE.md, doc 243).
function engineWith(nodes: GridStackNode[], column = 2, maxRow = 2) {
  const engine = new GridCellEngine({ column, maxRow, float: true });
  for (const node of nodes) engine.addNode(node);
  return engine;
}

/** Whether two nodes cover a cell in common. */
const overlapping = (a: GridStackNode, b: GridStackNode) =>
  (a.x ?? 0) < (b.x ?? 0) + (b.w ?? 1) &&
  (b.x ?? 0) < (a.x ?? 0) + (a.w ?? 1) &&
  (a.y ?? 0) < (b.y ?? 0) + (b.h ?? 1) &&
  (b.y ?? 0) < (a.y ?? 0) + (a.h ?? 1);

const node = (id: string, x: number, y: number, w = 1, h = 1): GridStackNode => ({
  id,
  x,
  y,
  w,
  h,
});

describe('GridCellEngine (doc 260 rules 10-12)', () => {
  describe('collisions (rule 10)', () => {
    it('moves the occupant out of the way, inside the grid (rule 10, revised)', () => {
      const engine = engineWith([node('a', 0, 0), node('b', 1, 0)]);
      const a = engine.nodes.find((n) => n.id === 'a')!;
      const b = engine.nodes.find((n) => n.id === 'b')!;
      expect(engine.moveNodeCheck(a, { x: 1, y: 0 })).toBe(true);
      expect([a.x, a.y]).toEqual([1, 0]);
      // Same size: b takes the cell a left — a swap.
      expect([b.x, b.y]).toEqual([0, 0]);
      expect(overlapping(a, b)).toBe(false);
    });

    it('refuses a move when the grid has no room to move the occupant', () => {
      const engine = engineWith([node('a', 0, 0), node('b', 1, 0, 1, 2), node('c', 0, 1)]);
      const a = engine.nodes.find((n) => n.id === 'a')!;
      // b fills column 1 top to bottom: column 0 has no 1×2 space left once a lands at (1,0)… and c holds (0,1).
      expect(engine.moveNodeCheck(a, { x: 1, y: 0 })).toBe(false);
      expect([a.x, a.y]).toEqual([0, 0]);
    });

    it('refuses a move or resize past the grid edge', () => {
      const engine = engineWith([node('a', 0, 0)]);
      const a = engine.nodes[0]!;
      expect(engine.moveNodeCheck(a, { x: 0, y: 2 })).toBe(false);
      expect(engine.moveNodeCheck(a, { w: 3, h: 1, resizing: true })).toBe(false);
      expect(engine.moveNodeCheck(a, { x: 1, y: 1, w: 2 })).toBe(false);
    });

    it('accepts a move into a free cell', () => {
      const engine = engineWith([node('a', 0, 0), node('b', 1, 0)]);
      const a = engine.nodes.find((n) => n.id === 'a')!;
      expect(engine.moveNodeCheck(a, { x: 1, y: 1 })).toBe(true);
      expect([a.x, a.y]).toEqual([1, 1]);
      expect(engine.moveNodeCheck(a, { x: 0, y: 1, w: 2, resizing: true })).toBe(true);
      expect(a.w).toBe(2);
    });

    it('lands an arrival dragged onto a taken cell and moves the occupant out of the way', () => {
      // gridstack adds an arrival where it fits, then the drag moves it to the cell under the cursor.
      const engine = engineWith([node('a', 0, 0)]);
      const b = engine.addNode(node('b', 1, 1));
      const a = engine.nodes.find((n) => n.id === 'a')!;
      // As `_dragOrResize` calls it: the node marked moving, the drag rect, the cell size.
      Reflect.set(b, '_moving', true);
      const step = {
        x: 0,
        y: 0,
        rect: { x: 10, y: 10, w: 90, h: 70 },
        cellWidth: 100,
        cellHeight: 80,
      };
      expect(engine.moveNodeCheck(b, step)).toBe(true);
      expect([b.x, b.y]).toEqual([0, 0]);
      expect(overlapping(a, b)).toBe(false);
    });
  });

  describe('entering nodes (rule 11)', () => {
    it('lets an arrival of any source size in while a cell is free', () => {
      // A palette drag-in is 10 rows tall; gridstack's droppable asks willItFit before acceptWidgets.
      expect(engineWith([node('a', 0, 0)]).willItFit({ w: 1, h: 10 })).toBe(true);
      const full = engineWith([node('a', 0, 0), node('b', 1, 0), node('c', 0, 1), node('d', 1, 1)]);
      expect(full.willItFit({ w: 1, h: 10 })).toBe(false);
    });

    it('makes an external node 1x1', () => {
      const engine = engineWith([]);
      const entering = { ...node('x', 0, 0, 1, 40), _isExternal: true } as GridStackNode;
      engine.nodeBoundFix(entering);
      expect([entering.w, entering.h]).toEqual([1, 1]);
      const own = node('y', 0, 0, 2, 2);
      engine.nodeBoundFix(own);
      expect([own.w, own.h]).toEqual([2, 2]);
    });
  });

  describe('cursor cell (rule 12)', () => {
    it('targets the cell under the cursor (floor), not the rounded edge', () => {
      expect(cursorCell({ x: 190, y: 70, w: 1, h: 1 }, 100, 80)).toEqual({ x: 1, y: 0 });
      const engine = engineWith([node('a', 0, 0)]);
      const a = engine.nodes[0]!;
      // gridstack rounds 0.9 cells to column 1; the cursor is still in column 0, row 1.
      expect(
        engine.moveNodeCheck(a, {
          x: 1,
          y: 1,
          rect: { x: 90, y: 90, w: 1, h: 1 },
          cellWidth: 100,
          cellHeight: 80,
        }),
      ).toBe(true);
      expect([a.x, a.y]).toEqual([0, 1]);
    });

    it('clampGrabOffset also removes the horizontal grab distance', () => {
      const offset = { x: 0, top: 0, offsetX: -30, offsetTop: -45, width: 100, height: 40 };
      expect(clampGrabOffset(offset, 0, 0)).toMatchObject({ offsetX: 0, offsetTop: 0 });
    });
  });
});
