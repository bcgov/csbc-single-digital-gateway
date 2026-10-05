import { describe, expect, it } from 'vitest';
import { arrivalWidth, fitWidths } from '../src/renderers/default/row-placement';
import type { DocumentContent, Uischema } from '../src/studio/document-types';
import { copyElement } from '../src/studio/element-copy';
import { findById } from '../src/studio/element-ids';
import { moveElement } from '../src/studio/element-move';
import { maxGridWidth, resizeGridChild } from '../src/studio/grid-edits';
import { insertItem } from '../src/studio/palette-insert';
import { maxRowWidth, resizeRowChild, rowElements, storedWidths } from '../src/studio/row-edits';
import { form } from './funnel-fixtures';

const child = (id: string, gridItem?: Record<string, unknown>): Uischema => ({
  id,
  type: 'Heading',
  options: { text: id, ...(gridItem !== undefined && { gridItem }) },
});
const row = (elements: unknown[], options: Record<string, unknown> = {}): Uischema => ({
  id: 'r',
  type: 'HorizontalLayout',
  options,
  elements,
});
const content = (root: Uischema): DocumentContent => ({
  schema: { type: 'object', properties: {} },
  variants: { default: root },
});
const childrenOf = (node: Uischema | undefined) =>
  (node?.['elements'] as Uischema[] | undefined) ?? [];
const itemOf = (element: Uischema | undefined) =>
  (element?.['options'] as Record<string, unknown> | undefined)?.['gridItem'];
/** Each child as [id, gridItem]. */
const shape = (node: Uischema | undefined) => childrenOf(node).map((e) => [e['id'], itemOf(e)]);

describe('row edits (doc 261 rules 10-18, 20b)', () => {
  describe('arrivalWidth (rule 10)', () => {
    it('gives a new child columns / (n + 1), at least 1', () => {
      expect(arrivalWidth(0, 12)).toBe(12);
      expect(arrivalWidth(3, 12)).toBe(3);
      expect(arrivalWidth(12, 12)).toBe(1);
    });
  });

  describe('fitWidths (rule 11)', () => {
    it('uses free columns first', () => {
      expect(fitWidths([2, 3], 12)).toEqual([2, 3]);
    });

    it('shrinks the widest other children, later first on a tie', () => {
      expect(fitWidths([4, 4, 6], 12, new Set([2]))).toEqual([3, 3, 6]);
      expect(fitWidths([4, 4, 5], 12, new Set([2]))).toEqual([4, 3, 5]);
    });

    it('never shrinks a fixed child or below 1', () => {
      expect(fitWidths([1, 11, 4], 12, new Set([1]))).toBeUndefined();
      expect(fitWidths([1, 9, 4], 12, new Set([1]))).toEqual([1, 9, 2]);
    });

    it('refuses when nothing more can shrink', () => {
      expect(fitWidths([1, 1, 1], 2)).toBeUndefined();
    });
  });

  describe('landing in a row (rule 16)', () => {
    it('inserts with the arrival width and re-fits the others in one edit', () => {
      const doc = content(form('f', 'F', [row([child('a', { w: 6 }), child('b', { w: 6 })])]));
      const next = insertItem(doc, 'r', 1, { element: { id: 'new', type: 'Heading' } });
      // Arrival 12 / 3 = 4; the two 6s lose 4 columns between them, the later first on a tie.
      expect(shape(findById(next.variants.default, 'r'))).toEqual([
        ['a', { w: 4 }],
        ['new', { w: 4 }],
        ['b', { w: 4 }],
      ]);
    });

    it('drops x, y and h from a gridItem that came from a Grid, keeping alignment', () => {
      const page = form('f', 'F', [
        { id: 'g', type: 'Grid', elements: [child('x', { x: 1, y: 0, h: 2, alignSelf: 'end' })] },
        row([]),
      ]);
      const next = moveElement(page, 'x', 'r', 0);
      // An empty row's first child takes every column (rule 10).
      expect(itemOf(findById(next, 'x'))).toEqual({ w: 12, alignSelf: 'end' });
    });

    it('refuses an arrival into a row with as many children as columns', () => {
      const doc = content(form('f', 'F', [row([child('a'), child('b')], { columns: 2 })]));
      expect(insertItem(doc, 'r', 0, { element: { id: 'new', type: 'Heading' } })).toBe(doc);
    });
  });

  describe('moves and copies (rules 17-18)', () => {
    const page = () =>
      form('f', 'F', [
        row([child('a', { w: 4, justifySelf: 'center' })]),
        { id: 'v', type: 'VerticalLayout', elements: [] },
        { id: 'g', type: 'Grid', elements: [] },
      ]);

    it('removes gridItem from a child moved out to a VerticalLayout', () => {
      expect(itemOf(findById(moveElement(page(), 'a', 'v', 0), 'a'))).toBeUndefined();
    });

    it('places a child moved into a Grid in a cell, keeping its alignment', () => {
      expect(itemOf(findById(moveElement(page(), 'a', 'g', 0), 'a'))).toEqual({
        x: 0,
        y: 0,
        justifySelf: 'center',
      });
    });

    it('copies a row child right after it with its width, re-fitting the others', () => {
      const doc = content(form('f', 'F', [row([child('a', { w: 8 }), child('b', { w: 4 })])]));
      const result = copyElement(doc, 'a')!;
      const r = findById(result.content.variants.default, 'r');
      expect(childrenOf(r).map((e) => e['id'])).toEqual(['a', result.copyId, 'b']);
      // The copy keeps a's 8; a (8 → 5) and b (4 → … ) give way, never below 1.
      const widths = childrenOf(r).map((e) => (itemOf(e) as { w?: number } | undefined)?.w ?? 1);
      expect(widths[1]).toBe(8);
      expect(widths.reduce((s, w) => s + w, 0)).toBeLessThanOrEqual(12);
      const full = content(form('f', 'F', [row([child('a'), child('b')], { columns: 2 })]));
      expect(copyElement(full, 'a')).toBeUndefined();
    });
  });

  describe('reorder / resize write (rules 14-15)', () => {
    it('writes elements in the new order with stored widths', () => {
      const r = row([child('a', { w: 2 }), child('b', { w: 3 })], { justify: 'start' });
      const next = rowElements(r, ['b', 'a'], new Map()) as Uischema[];
      expect(next.map((e) => [e['id'], itemOf(e)])).toEqual([
        ['b', { w: 3 }],
        ['a', { w: 2 }],
      ]);
    });

    it("stores the resized child's width minus its Flex share", () => {
      // Flex shows widths 2, 3 as 5, 7; dragging b from 7 to 9 stores 3 + 2 = 5.
      const r = row([child('a', { w: 2 }), child('b', { w: 3 })]);
      const stored = storedWidths(
        r,
        new Map([
          ['a', 5],
          ['b', 9],
        ]),
      );
      expect([...stored]).toEqual([
        ['a', 2],
        ['b', 5],
      ]);
    });

    it('returns the same elements when nothing changed', () => {
      const r = row([child('a', { w: 2 }), child('b', { w: 3 })]);
      expect(
        rowElements(
          r,
          ['a', 'b'],
          new Map([
            ['a', 2],
            ['b', 3],
          ]),
        ),
      ).toBe(r['elements']);
    });
  });

  describe('width field (rule 20b)', () => {
    it("sets a row child's width and re-fits the others", () => {
      const r = row([child('a', { w: 6 }), child('b', { w: 6 })]);
      expect(shape(resizeRowChild(r, 'a', 9))).toEqual([
        ['a', { w: 9 }],
        ['b', { w: 3 }],
      ]);
      expect(resizeRowChild(r, 'a', 12)).toBe(r);
    });

    it('widens a Grid child, moving the neighbours it covers out of the way', () => {
      const grid: Uischema = {
        id: 'g',
        type: 'Grid',
        options: { columns: 2, rows: 2 },
        elements: [child('a', { x: 0, y: 0 }), child('b', { x: 1, y: 0 })],
      };
      const next = resizeGridChild(grid, 'a', 2);
      expect(shape(next)).toEqual([
        ['a', { x: 0, y: 0, w: 2 }],
        ['b', { x: 1, y: 1 }],
      ]);
    });

    it('reports the widest width a row or Grid child can take', () => {
      expect(maxRowWidth(row([child('a'), child('b'), child('c')], { columns: 6 }))).toBe(4);
      const full: Uischema = {
        id: 'g',
        type: 'Grid',
        options: { columns: 2, rows: 1 },
        elements: [child('a', { x: 0, y: 0 }), child('b', { x: 1, y: 0 })],
      };
      // One row, both cells taken: a can't widen over b — there is nowhere to move it.
      expect(maxGridWidth(full, 'a')).toBe(1);
      const roomy = { ...full, options: { columns: 2, rows: 2 } };
      expect(maxGridWidth(roomy, 'a')).toBe(2);
    });
  });
});
