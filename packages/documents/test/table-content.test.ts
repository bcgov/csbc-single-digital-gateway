import { describe, expect, it } from 'vitest';
import {
  addColumn,
  addRow,
  moveColumn,
  removeColumn,
  removeRow,
  setCell,
  setHeader,
  tableContent,
  type TableContent,
} from '../src/renderers/ui/table-content';

const base = (): TableContent => ({
  headers: ['A', 'B', 'C'],
  rows: [
    ['a1', 'b1', 'c1'],
    ['a2', 'b2', 'c2'],
  ],
});

describe('table content (doc 265 rules 1-2)', () => {
  describe('tableContent', () => {
    it('sanitises headers and pads or cuts rows to the header count', () => {
      expect(
        tableContent({
          headers: ['A', 2, null, 'D'],
          rows: [['x'], ['1', '2', '3', '4', '5'], 'nope', [1, true, 'ok']],
        }),
      ).toEqual({
        headers: ['A', '', '', 'D'],
        rows: [
          ['x', '', '', ''],
          ['1', '2', '3', '4'],
          ['', '', 'ok', ''],
        ],
      });
    });

    it('never throws on malformed options', () => {
      for (const options of [undefined, null, 'x', [], { headers: 'A' }])
        expect(tableContent(options)).toEqual({ headers: [], rows: [] });
      // With no headers a row has no cells.
      expect(tableContent({ rows: [['a']] })).toEqual({ headers: [], rows: [[]] });
    });
  });

  describe('edits', () => {
    it('sets a header and a cell without mutating', () => {
      const before = base();
      expect(setHeader(before, 1, 'Bee').headers).toEqual(['A', 'Bee', 'C']);
      const cell = setCell(before, 1, 2, 'X');
      expect(cell.rows).toEqual([
        ['a1', 'b1', 'c1'],
        ['a2', 'b2', 'X'],
      ]);
      expect(cell.rows[0]).toBe(before.rows[0]);
      expect(before).toEqual(base());
    });

    it('adds a column with a free Column n title and an empty cell per row', () => {
      const next = addColumn(base());
      expect(next.headers).toEqual(['A', 'B', 'C', 'Column 4']);
      expect(next.rows.map((r) => r.at(-1))).toEqual(['', '']);
      expect(addColumn({ headers: ['Column 2', 'Column 3'], rows: [] }).headers).toEqual([
        'Column 2',
        'Column 3',
        'Column 4',
      ]);
    });

    it('removes a column, refusing the last', () => {
      const next = removeColumn(base(), 1);
      expect(next).toEqual({
        headers: ['A', 'C'],
        rows: [
          ['a1', 'c1'],
          ['a2', 'c2'],
        ],
      });
      const one = { headers: ['A'], rows: [['a']] };
      expect(removeColumn(one, 0)).toBe(one);
    });

    it('adds and removes rows', () => {
      const added = addRow(base());
      expect(added.rows.at(-1)).toEqual(['', '', '']);
      expect(removeRow(base(), 0).rows).toEqual([['a2', 'b2', 'c2']]);
      expect(removeRow(removeRow(base(), 0), 0).rows).toEqual([]);
    });

    it('moves a column with a clamped index', () => {
      expect(moveColumn(base(), 0, 2)).toEqual({
        headers: ['B', 'C', 'A'],
        rows: [
          ['b1', 'c1', 'a1'],
          ['b2', 'c2', 'a2'],
        ],
      });
      expect(moveColumn(base(), 2, -5).headers).toEqual(['C', 'A', 'B']);
      expect(moveColumn(base(), 1, 99).headers).toEqual(['A', 'C', 'B']);
    });
  });
});
