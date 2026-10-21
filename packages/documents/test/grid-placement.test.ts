import { describe, expect, it } from 'vitest';
import {
  compareCells,
  firstFreeCell,
  freeCells,
  gridItemOf,
  gridPlacement,
  readingIndex,
} from '../src/renderers/default/grid-placement';

const child = (id: string, gridItem?: unknown) => ({
  id,
  type: 'Heading',
  ...(gridItem !== undefined && { options: { gridItem } }),
});
const grid = (elements: unknown[], options?: Record<string, unknown>) => ({
  id: 'g',
  type: 'Grid',
  elements,
  ...(options !== undefined && { options }),
});
const rects = (g: unknown) =>
  gridPlacement(g).items.map(({ key, x, y, w, h }) => ({ key, x, y, w, h }));

describe('gridPlacement (doc 260 rules 1-4)', () => {
  describe('sanitising options (rule 1)', () => {
    it('defaults to 2 columns and 2 rows when options are absent', () => {
      const placement = gridPlacement(grid([]));
      expect(placement.columns).toBe(2);
      expect(placement.rows).toBe(2);
      expect(placement.effectiveRows).toBe(2);
    });

    it('clamps columns to 1-12 and rows to 1-24, falling back to the default for non-integers', () => {
      expect(gridPlacement(grid([], { columns: 12, rows: 24 }))).toMatchObject({
        columns: 12,
        rows: 24,
      });
      expect(gridPlacement(grid([], { columns: 13, rows: 25 }))).toMatchObject({
        columns: 2,
        rows: 2,
      });
      expect(gridPlacement(grid([], { columns: 2.5, rows: '3' }))).toMatchObject({
        columns: 2,
        rows: 2,
      });
      expect(gridPlacement(grid([], { columns: 0, rows: -1 }))).toMatchObject({
        columns: 2,
        rows: 2,
      });
    });

    it('treats a wrong-typed gridItem field as absent', () => {
      expect(gridItemOf(child('a', { x: '1', y: 0, w: 0, h: 2 }))).toEqual({ y: 0, h: 2 });
      expect(gridItemOf(child('a', 'nope'))).toEqual({});
      expect(Object.keys(gridItemOf(child('a', { x: 1.5 })))).toEqual([]);
    });
  });

  describe('placing children (rules 2-3)', () => {
    it('keeps a valid authored rectangle', () => {
      expect(
        rects(grid([child('a', { x: 1, y: 1 }), child('b', { x: 0, y: 0, w: 1, h: 2 })])),
      ).toEqual([
        { key: 'a', x: 1, y: 1, w: 1, h: 1 },
        { key: 'b', x: 0, y: 0, w: 1, h: 2 },
      ]);
    });

    it('clamps a span to the grid edge', () => {
      expect(rects(grid([child('a', { x: 1, y: 1, w: 5, h: 5 })]))).toEqual([
        { key: 'a', x: 1, y: 1, w: 1, h: 1 },
      ]);
    });

    it('moves an overlapping child to the first free cell in reading order', () => {
      const placed = rects(grid([child('a', { x: 0, y: 0, w: 2 }), child('b', { x: 1, y: 0 })]));
      expect(placed[0]).toEqual({ key: 'a', x: 0, y: 0, w: 2, h: 1 });
      expect(placed[1]).toEqual({ key: 'b', x: 0, y: 1, w: 1, h: 1 });
    });

    it('places a child with no gridItem in the first free cell', () => {
      const placed = rects(
        grid([child('a', { x: 0, y: 0 }), child('b'), child('c', { x: 5, y: 0 })]),
      );
      expect(placed.map(({ x, y }) => [x, y])).toEqual([
        [0, 0],
        [1, 0],
        [0, 1],
      ]);
    });

    it('grows the effective rows when no free cell remains, never dropping a child', () => {
      const placement = gridPlacement(
        grid([child('a'), child('b'), child('c')], { columns: 1, rows: 1 }),
      );
      expect(placement.rows).toBe(1);
      expect(placement.effectiveRows).toBe(3);
      expect(placement.items.map(({ y }) => y)).toEqual([0, 1, 2]);
    });
  });

  describe('reading order (rule 4)', () => {
    it('sortedByReadingOrder orders children by (y, x)', () => {
      expect(compareCells({ x: 1, y: 0 }, { x: 0, y: 1 })).toBeLessThan(0);
      expect(compareCells({ x: 1, y: 1 }, { x: 0, y: 1 })).toBeGreaterThan(0);
      const placement = gridPlacement(
        grid([child('a', { x: 1, y: 1 }), child('b', { x: 1, y: 0 })]),
      );
      expect(readingIndex(placement, { x: 0, y: 1 })).toBe(1);
      expect(readingIndex(placement, { x: 0, y: 0 })).toBe(0);
      expect(freeCells(placement)).toEqual([
        { x: 0, y: 0 },
        { x: 0, y: 1 },
      ]);
      expect(firstFreeCell(placement, { x: 1, y: 0 })).toEqual({ x: 0, y: 1 });
      expect(firstFreeCell(placement, { x: 1, y: 1 })).toEqual({ x: 0, y: 0 });
    });
  });

  describe('alignment (rule 29)', () => {
    it("resolves each child's alignment: its own override, else the Grid's default, else start / stretch", () => {
      const placement = gridPlacement(
        grid(
          [
            child('a', { x: 0, y: 0 }),
            child('b', { x: 1, y: 0, alignSelf: 'end', justifySelf: 'center' }),
            child('c', { x: 0, y: 1, alignSelf: 'middle' }),
          ],
          { alignItems: 'center' },
        ),
      );
      expect(placement).toMatchObject({ alignItems: 'center', justifyItems: 'stretch' });
      expect(placement.items.map(({ align, justify }) => [align, justify])).toEqual([
        ['center', 'stretch'],
        ['end', 'center'],
        // A wrong value is absent: the Grid's.
        ['center', 'stretch'],
      ]);
      expect(gridPlacement(grid([], { alignItems: 'top', justifyItems: 9 }))).toMatchObject({
        alignItems: 'start',
        justifyItems: 'stretch',
      });
    });
  });
});
