import type { UISchemaElement } from '@jsonforms/core';
import { describe, it, expect } from 'vitest';
import {
  FILL_GRID_COLUMNS,
  fillGridColumns,
  gridPlacement,
  rowPlacement,
} from '../src/renderers/default/fill-placement';

// Doc 193 rules 6-7 — pure placement for fillable HorizontalLayouts and Grids.

const heading = (text: string, gridItem?: object) =>
  ({ type: 'Heading', text, ...(gridItem ? { options: { gridItem } } : {}) }) as UISchemaElement;

const summary = (placement: ReturnType<typeof gridPlacement>) =>
  placement.children.map(({ element, column, minHeight }) => ({
    text: (element as { text?: string }).text,
    column,
    ...(minHeight === undefined ? {} : { minHeight }),
  }));

describe('fillable placement (doc 193)', () => {
  describe('HorizontalLayout (rule 6)', () => {
    it('uses horizontalColumns for the column count and horizontalWidth for each span', () => {
      const authored = rowPlacement({ columns: 4 }, [heading('A', { w: 3 }), heading('B')]);
      expect(authored.columns).toBe(4);
      expect(summary(authored)).toEqual([
        { text: 'A', column: 'span 3' },
        { text: 'B', column: 'span 1' },
      ]);

      // No authored columns: the child count clamped to 2-6; a width is clamped to the columns.
      const derived = rowPlacement(undefined, [heading('A', { w: 9 })]);
      expect(derived.columns).toBe(2);
      expect(summary(derived)).toEqual([{ text: 'A', column: 'span 2' }]);
    });

    it('ignores authored x, y and h', () => {
      const placement = rowPlacement({ columns: 3 }, [
        heading('B', { x: 2, y: 4, h: 6 }),
        heading('A', { x: 0, y: 0 }),
      ]);
      expect(summary(placement)).toEqual([
        { text: 'B', column: 'span 1' },
        { text: 'A', column: 'span 1' },
      ]);
      expect(placement.children.map(({ index }) => index)).toEqual([0, 1]);
    });
  });

  describe('Grid (rule 7)', () => {
    it('uses an authored integer column 1-12, else 12', () => {
      expect(FILL_GRID_COLUMNS).toBe(12);
      expect(fillGridColumns({ column: 6 })).toBe(6);
      expect(fillGridColumns({ column: 1 })).toBe(1);
      for (const options of [
        undefined,
        {},
        { column: 0 },
        { column: 13 },
        { column: 4.5 },
        { column: '6' },
      ]) {
        expect(fillGridColumns(options), JSON.stringify(options)).toBe(12);
      }
      expect(gridPlacement({ column: 6 }, []).columns).toBe(6);
    });

    it('orders children by (y, x), keeping elements order for children without y or x after the rest', () => {
      const placement = gridPlacement(undefined, [
        heading('Free 1'),
        heading('Row 1 right', { x: 6, y: 1, w: 6 }),
        heading('Row 0', { x: 0, y: 0, w: 12 }),
        heading('Row 1 left', { x: 0, y: 1, w: 6 }),
        heading('Free 2'),
        heading('Row 1 no x', { y: 1 }),
      ]);
      expect(placement.children.map(({ element }) => (element as { text?: string }).text)).toEqual([
        'Row 0',
        'Row 1 left',
        'Row 1 right',
        'Row 1 no x',
        'Free 1',
        'Free 2',
      ]);
    });

    it('starts a child at x + 1 and spans w, clamping both to the column count', () => {
      expect(
        summary(
          gridPlacement({ column: 6 }, [
            heading('Start', { x: 0, y: 0, w: 3 }),
            heading('Too wide', { x: 1, y: 1, w: 20 }),
            heading('Too far', { x: 5, y: 2, w: 3 }),
            heading('Negative', { x: -2, y: 3, w: 0 }),
          ]),
        ),
      ).toEqual([
        { text: 'Start', column: '1 / span 3' },
        { text: 'Too wide', column: '1 / span 6' },
        { text: 'Too far', column: '4 / span 3' },
        { text: 'Negative', column: '1 / span 1' },
      ]);
    });

    it('defaults the span to 1 and leaves the start automatic without an integer x', () => {
      expect(
        summary(
          gridPlacement(undefined, [heading('Bare'), heading('Fractional', { x: 1.5, w: 2.5 })]),
        ),
      ).toEqual([
        { text: 'Bare', column: 'span 1' },
        { text: 'Fractional', column: 'span 1' },
      ]);
    });

    it('turns a positive integer h into a rem min-height and ignores other h values', () => {
      expect(
        summary(
          gridPlacement(undefined, [
            heading('Tall', { y: 0, h: 5 }),
            heading('Zero', { y: 1, h: 0 }),
            heading('Fraction', { y: 2, h: 2.5 }),
            heading('Text', { y: 3, h: '4' }),
          ]),
        ),
      ).toEqual([
        { text: 'Tall', column: 'span 1', minHeight: '5rem' },
        { text: 'Zero', column: 'span 1' },
        { text: 'Fraction', column: 'span 1' },
        { text: 'Text', column: 'span 1' },
      ]);
    });
  });
});
