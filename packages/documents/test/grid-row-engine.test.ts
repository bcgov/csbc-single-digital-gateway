import type { GridStackNode } from 'gridstack';
import { describe, expect, it } from 'vitest';
import { GridRowEngine } from '../src/renderers/studio/grid-row-engine';

/** A row engine of `columns` with nodes added as a real grid adds them (constructor nodes get no `_id`). */
function rowOf(nodes: GridStackNode[], columns = 12, justify: GridRowEngine['justify'] = 'start') {
  const engine = new GridRowEngine({ column: columns, maxRow: 1, float: true });
  engine.justify = justify;
  for (const node of nodes) engine.addNode(node);
  return engine;
}
const node = (
  id: string,
  x: number,
  w: number,
  extra: Partial<GridStackNode> = {},
): GridStackNode => ({
  id,
  x,
  y: 0,
  w,
  h: 1,
  ...extra,
});
/** The row as [id, x, w], left to right. */
const layout = (engine: GridRowEngine) =>
  engine.nodes.toSorted((a, b) => (a.x ?? 0) - (b.x ?? 0)).map(({ id, x, w }) => [id, x, w]);
const byId = (engine: GridRowEngine, id: string) => engine.nodes.find((n) => n.id === id)!;
/** A drag step as `_dragOrResize` makes it: the cursor's column in the rect, 100px columns. */
const dragTo = (column: number) => ({
  x: column,
  y: 0,
  rect: { x: column * 100 + 10, y: 10, w: 90, h: 50 },
  cellWidth: 100,
  cellHeight: 60,
});

describe('GridRowEngine (doc 261 rule 9)', () => {
  describe('drag', () => {
    it("reorders by the cursor's column and repacks every node on line 0", () => {
      const engine = rowOf([node('a', 0, 2), node('b', 2, 3), node('c', 5, 1)]);
      // Drag a to column 5: past b's centre (3.5), before c's (5.5).
      expect(engine.moveNodeCheck(byId(engine, 'a'), dragTo(5))).toBe(true);
      expect(layout(engine)).toEqual([
        ['b', 0, 3],
        ['a', 3, 2],
        ['c', 5, 1],
      ]);
    });

    it('never leaves a hole or a second line', () => {
      const engine = rowOf([node('a', 0, 2), node('b', 2, 3)], 12, 'end');
      engine.moveNodeCheck(byId(engine, 'b'), dragTo(0));
      expect(layout(engine)).toEqual([
        ['b', 7, 3],
        ['a', 10, 2],
      ]);
      expect(engine.nodes.every((n) => n.y === 0)).toBe(true);
    });
  });

  describe('resize', () => {
    it('takes room from the widest neighbours', () => {
      const engine = rowOf([node('a', 0, 6), node('b', 6, 4), node('c', 10, 2)]);
      expect(engine.moveNodeCheck(byId(engine, 'c'), { w: 5, resizing: true })).toBe(true);
      expect(layout(engine)).toEqual([
        ['a', 0, 4],
        ['b', 4, 3],
        ['c', 7, 5],
      ]);
    });

    it('refuses a resize that would shrink a locked node', () => {
      const engine = rowOf([node('a', 0, 10, { locked: true }), node('b', 10, 2)]);
      expect(engine.moveNodeCheck(byId(engine, 'b'), { w: 3, resizing: true })).toBe(false);
      expect(layout(engine)).toEqual([
        ['a', 0, 10],
        ['b', 10, 2],
      ]);
    });
  });

  describe('arrival', () => {
    it('gives an arriving node the arrival width and one row', () => {
      const engine = rowOf([node('a', 0, 6), node('b', 6, 6)]);
      const entering = { x: 0, y: 0, w: 1, h: 40, _isExternal: true } as GridStackNode;
      engine.nodeBoundFix(entering);
      expect([entering.w, entering.h]).toEqual([4, 1]);
      engine.addNode({ ...entering, id: 'new', _temporaryRemoved: true } as GridStackNode);
      expect(layout(engine).map(([, , w]) => w)).toEqual([4, 4, 4]);
      expect(engine.nodes.every((n) => n.y === 0)).toBe(true);
    });

    it('fits while the row has fewer children than columns', () => {
      expect(rowOf([node('a', 0, 1)], 2).willItFit({ w: 1, h: 10 })).toBe(true);
      expect(rowOf([node('a', 0, 1), node('b', 1, 1)], 2).willItFit({ w: 1, h: 10 })).toBe(false);
    });
  });
});
