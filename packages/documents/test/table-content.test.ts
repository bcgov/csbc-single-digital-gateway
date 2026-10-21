import { describe, expect, it } from 'vitest';
import {
  addColumn,
  alignOption,
  contentOptions,
  addRow,
  moveColumn,
  removeColumn,
  removeRow,
  setAlign,
  setCell,
  setHeader,
  tableContent,
  tableDisplay,
  type TableContent,
} from '../src/renderers/ui/table-content';

const base = (): TableContent => ({
  headers: ['A', 'B', 'C'],
  rows: [
    ['a1', 'b1', 'c1'],
    ['a2', 'b2', 'c2'],
  ],
  align: ['left', 'center', 'right'],
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
        align: ['left', 'left', 'left', 'left'],
      });
    });

    it('never throws on malformed options', () => {
      for (const options of [undefined, null, 'x', [], { headers: 'A' }])
        expect(tableContent(options)).toEqual({ headers: [], rows: [], align: [] });
      // With no headers a row has no cells.
      expect(tableContent({ rows: [['a']] })).toEqual({ headers: [], rows: [[]], align: [] });
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
      expect(next.align).toEqual(['left', 'center', 'right', 'left']);
      expect(
        addColumn({ headers: ['Column 2', 'Column 3'], rows: [], align: ['left', 'left'] }).headers,
      ).toEqual(['Column 2', 'Column 3', 'Column 4']);
    });

    it('removes a column, refusing the last', () => {
      const next = removeColumn(base(), 1);
      expect(next).toEqual({
        headers: ['A', 'C'],
        rows: [
          ['a1', 'c1'],
          ['a2', 'c2'],
        ],
        align: ['left', 'right'],
      });
      const one: TableContent = { headers: ['A'], rows: [['a']], align: ['left'] };
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
        align: ['center', 'right', 'left'],
      });
      expect(moveColumn(base(), 2, -5).headers).toEqual(['C', 'A', 'B']);
      expect(moveColumn(base(), 1, 99).headers).toEqual(['A', 'C', 'B']);
    });
  });
});

describe('table alignment and display (doc 267 rules 4-5)', () => {
  it('reads align per header, defaulting to left', () => {
    expect(
      tableContent({ headers: ['A', 'B', 'C'], rows: [], align: ['right', 'up'] }).align,
    ).toEqual(['right', 'left', 'left']);
  });

  it('sets one column alignment and stores align only when some column is not left', () => {
    const next = setAlign(base(), 0, 'center');
    expect(next.align).toEqual(['center', 'center', 'right']);
    expect(alignOption(['left', 'left'])).toBeUndefined();
    expect(alignOption(['left', 'right'])).toEqual(['left', 'right']);
    expect(contentOptions({ headers: ['A'], rows: [['a']], align: ['left'] })).toEqual({
      headers: ['A'],
      rows: [['a']],
      align: undefined,
    });
  });

  it('reads display options with safe defaults', () => {
    expect(tableDisplay(undefined)).toEqual({
      caption: undefined,
      showHeader: true,
      rowHeaders: false,
      striped: false,
      bordered: false,
      compact: false,
    });
    expect(
      tableDisplay({
        caption: '  Fees ',
        header: false,
        rowHeaders: true,
        striped: true,
        bordered: true,
        compact: true,
      }),
    ).toEqual({
      caption: 'Fees',
      showHeader: false,
      rowHeaders: true,
      striped: true,
      bordered: true,
      compact: true,
    });
    expect(tableDisplay({ caption: '  ', header: 'no', striped: 'yes' })).toMatchObject({
      caption: undefined,
      showHeader: true,
      striped: false,
    });
  });
});
