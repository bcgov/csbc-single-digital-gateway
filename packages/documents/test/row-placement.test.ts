import { describe, expect, it } from 'vitest';
import {
  arrivalWidth,
  fitWidths,
  packRow,
  rowPlacement,
} from '../src/renderers/default/row-placement';

const child = (id: string, gridItem?: Record<string, unknown>) => ({
  id,
  type: 'Heading',
  ...(gridItem !== undefined && { options: { gridItem } }),
});
const row = (elements: unknown[], options?: Record<string, unknown>) => ({
  id: 'r',
  type: 'HorizontalLayout',
  elements,
  ...(options !== undefined && { options }),
});
const cells = (layout: unknown) => rowPlacement(layout).items.map(({ x, w }) => [x, w]);

describe('rowPlacement (doc 261 rules 1-4)', () => {
  describe('sanitising (rule 1)', () => {
    it('defaults to 12 columns, Flex and Top', () => {
      expect(rowPlacement(row([]))).toMatchObject({
        columns: 12,
        justify: 'stretch',
        alignItems: 'start',
      });
    });

    it('clamps columns to 1-12 and drops wrong justify / alignItems values', () => {
      expect(
        rowPlacement(row([], { columns: 6, justify: 'end', alignItems: 'center' })),
      ).toMatchObject({ columns: 6, justify: 'end', alignItems: 'center' });
      expect(
        rowPlacement(row([], { columns: 13, justify: 'left', alignItems: 'top' })),
      ).toMatchObject({ columns: 12, justify: 'stretch', alignItems: 'start' });
      expect(rowPlacement(row([], { columns: 2.5 })).columns).toBe(12);
    });
  });

  describe('widths (rule 2)', () => {
    it("reads each child's gridItem.w, default 1, clamped to the columns", () => {
      const placed = rowPlacement(
        row([child('a', { w: 3 }), child('b'), child('c', { w: 'x' })], { justify: 'start' }),
      );
      expect(placed.items.map((i) => i.stored)).toEqual([3, 1, 1]);
      expect(rowPlacement(row([child('a', { w: 40 })], { columns: 4 })).items[0]!.stored).toBe(4);
    });

    it('reduces the widest children until the widths fit', () => {
      expect(fitWidths([6, 6, 4], 12)).toEqual([4, 4, 4]);
      // A tie loses the LATER child's column first.
      expect(fitWidths([3, 3, 1], 6)).toEqual([3, 2, 1]);
      expect(fitWidths([3, 3], 4)).toEqual([2, 2]);
    });

    it('lays out more children than columns as if columns were the child count', () => {
      const placed = rowPlacement(row([child('a'), child('b'), child('c')], { columns: 2 }));
      expect(placed.columns).toBe(3);
      expect(placed.items.map(({ x, w }) => [x, w])).toEqual([
        [0, 1],
        [1, 1],
        [2, 1],
      ]);
    });
  });

  describe('positions (rule 3)', () => {
    const three = (justify: string) =>
      row([child('a', { w: 2 }), child('b', { w: 3 })], { columns: 12, justify });

    it('packs Left from column 0', () => {
      expect(cells(three('start'))).toEqual([
        [0, 2],
        [2, 3],
      ]);
    });

    it('packs Right against the end', () => {
      expect(cells(three('end'))).toEqual([
        [7, 2],
        [9, 3],
      ]);
    });

    it('centres the group, rounding down', () => {
      expect(cells(three('center'))).toEqual([
        [3, 2],
        [5, 3],
      ]);
    });

    it('shares the free columns under Flex by largest remainder, keeping stored widths', () => {
      // 7 spare columns over widths 2 and 3: exact shares 2.8 and 4.2 → 2 + 4, the extra 1 to the larger remainder (a).
      const placed = rowPlacement(three('stretch'));
      expect(placed.items.map(({ x, w }) => [x, w])).toEqual([
        [0, 5],
        [5, 7],
      ]);
      expect(placed.items.map((i) => i.stored)).toEqual([2, 3]);
      expect(packRow([1, 1, 1], 4, 'stretch')).toEqual([
        { x: 0, w: 2 },
        { x: 2, w: 1 },
        { x: 3, w: 1 },
      ]);
    });
  });

  describe('alignment (rule 4)', () => {
    it("resolves alignSelf over the layout's alignItems and justifySelf over stretch", () => {
      const placed = rowPlacement(
        row([child('a'), child('b', { alignSelf: 'end', justifySelf: 'center' })], {
          alignItems: 'center',
        }),
      );
      expect(placed.items.map(({ align, justify }) => [align, justify])).toEqual([
        ['center', 'stretch'],
        ['end', 'center'],
      ]);
      expect(arrivalWidth(2, 12)).toBe(4);
    });
  });
});
