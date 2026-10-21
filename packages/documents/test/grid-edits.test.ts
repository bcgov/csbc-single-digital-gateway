import { describe, expect, it } from 'vitest';
import { placedElements } from '../src/renderers/studio/grid-order';
import type { DocumentContent, Uischema } from '../src/studio/document-types';
import { copyElement } from '../src/studio/element-copy';
import { findById } from '../src/studio/element-ids';
import { moveElement } from '../src/studio/element-move';
import { gridResizeLosses, resizeGrid, withoutDisplaced } from '../src/studio/grid-edits';
import { appendTarget, insertItem } from '../src/studio/palette-insert';
import { control, form } from './funnel-fixtures';

const at = (id: string, x: number, y: number, extra: Record<string, number> = {}): Uischema => ({
  id,
  type: 'Heading',
  options: { text: id, gridItem: { x, y, ...extra } },
});
const grid = (elements: unknown[], columns = 2, rows = 2): Uischema => ({
  id: 'g',
  type: 'Grid',
  options: { columns, rows },
  elements,
});
const content = (root: Uischema, properties: Record<string, unknown> = {}): DocumentContent => ({
  schema: { type: 'object', properties },
  variants: { default: root },
});
const childrenOf = (node: Uischema | undefined) =>
  (node?.['elements'] as Uischema[] | undefined) ?? [];
const cellOf = (element: Uischema | undefined) =>
  (element?.['options'] as { gridItem?: unknown } | undefined)?.gridItem;
const heading = (): Uischema => ({ id: 'new', type: 'Heading' });

describe('Grid edits (doc 260 rules 18-27)', () => {
  describe('placement write (rule 18)', () => {
    it("rewrites every child's gridItem and sorts elements in reading order", () => {
      const g = grid([at('a', 0, 0), at('b', 1, 0)]);
      const next = placedElements(g, new Map([['a', { x: 1, y: 1, w: 1, h: 1 }]])) as Uischema[];
      expect(next.map((e) => e['id'])).toEqual(['b', 'a']);
      expect(cellOf(next[1])).toEqual({ x: 1, y: 1 });
      expect(next[0]).toBe(childrenOf(g)[1]);
    });

    it('returns the same uischema when no placement changed', () => {
      const g = grid([at('a', 0, 0), at('b', 1, 0)]);
      const rects = new Map([
        ['a', { x: 0, y: 0, w: 1, h: 1 }],
        ['b', { x: 1, y: 0, w: 1, h: 1 }],
      ]);
      expect(placedElements(g, rects)).toBe(g['elements']);
    });

    it("keeps a child's alignment when it moves (rule 30)", () => {
      const g = grid([at('a', 0, 0, {}), at('b', 1, 0)]);
      const aligned = {
        ...childrenOf(g)[0]!,
        options: { text: 'a', gridItem: { x: 0, y: 0, alignSelf: 'center' } },
      };
      const next = placedElements(
        { ...g, elements: [aligned, childrenOf(g)[1]] },
        new Map([['a', { x: 0, y: 1, w: 1, h: 1 }]]),
      ) as Uischema[];
      expect(cellOf(next[1])).toEqual({ x: 0, y: 1, alignSelf: 'center' });
    });

    it('omits w and h when they are 1', () => {
      const g = grid([at('a', 0, 0)]);
      const wide = placedElements(g, new Map([['a', { x: 0, y: 0, w: 2, h: 1 }]])) as Uischema[];
      expect(cellOf(wide[0])).toEqual({ x: 0, y: 0, w: 2 });
    });
  });

  describe('insert into a Grid (rule 19)', () => {
    it('insertItem stamps options.gridItem = { x, y } from the target cell', () => {
      const doc = content(form('f', 'F', [grid([at('a', 0, 0), at('b', 1, 1)])]));
      const next = insertItem(doc, 'g', 0, { element: heading() }, { x: 1, y: 0 });
      const children = childrenOf(findById(next.variants.default, 'g'));
      expect(children.map((e) => e['id'])).toEqual(['a', 'new', 'b']);
      expect(cellOf(children[1])).toEqual({ x: 1, y: 0 });
      // A taken cell refuses.
      expect(insertItem(doc, 'g', 0, { element: heading() }, { x: 0, y: 0 })).toBe(doc);
    });

    it('writes the items moved out of the way WITH the arrival, in one edit (rule 19)', () => {
      const doc = content(form('f', 'F', [grid([at('a', 0, 0), at('b', 1, 1)])]));
      const drop = { x: 0, y: 0, displaced: new Map([['a', { x: 1, y: 0, w: 1, h: 1 }]]) };
      const next = insertItem(doc, 'g', 0, { element: heading() }, drop);
      const children = childrenOf(findById(next.variants.default, 'g'));
      expect(children.map((e) => [e['id'], cellOf(e)])).toEqual([
        ['new', { x: 0, y: 0 }],
        ['a', { x: 1, y: 0 }],
        ['b', { x: 1, y: 1 }],
      ]);
      // Without the displacement the cell is taken: refused, nothing written.
      expect(insertItem(doc, 'g', 0, { element: heading() }, withoutDisplaced(drop))).toBe(doc);
    });

    it('appendTarget into a selected Grid targets its first free cell', () => {
      const page = form('f', 'F', [grid([at('a', 0, 0)])]);
      const target = appendTarget(page, 'g');
      expect(target).toEqual({ layoutId: 'g', index: Infinity });
      const next = insertItem(content(page), target.layoutId, target.index, { element: heading() });
      expect(cellOf(findById(next.variants.default, 'new'))).toEqual({ x: 1, y: 0 });
    });

    it('appendTarget after a selected Grid child targets the next free cell after it', () => {
      const page = form('f', 'F', [grid([at('a', 0, 0), at('b', 0, 1)])]);
      expect(appendTarget(page, 'b')).toEqual({
        layoutId: 'g',
        index: Infinity,
        cell: { x: 1, y: 1 },
      });
      expect(appendTarget(page, 'a')).toEqual({
        layoutId: 'g',
        index: Infinity,
        cell: { x: 1, y: 0 },
      });
    });

    it('appendTarget into a full Grid is refused', () => {
      const page = form('f', 'F', [grid([at('a', 0, 0)], 1, 1)]);
      const doc = content(page);
      const target = appendTarget(page, 'a');
      expect(target.cell).toBeUndefined();
      expect(insertItem(doc, target.layoutId, target.index, { element: heading() })).toBe(doc);
    });
  });

  describe('move between layouts (rule 21)', () => {
    const page = () =>
      form('f', 'F', [
        { id: 'v', type: 'VerticalLayout', elements: [{ id: 'x', type: 'Heading' }] },
        grid([at('a', 0, 0)]),
      ]);

    it('sets gridItem to the given cell on an element entering a Grid', () => {
      const next = moveElement(page(), 'x', 'g', 0, { x: 1, y: 1 });
      expect(childrenOf(findById(next, 'g')).map((e) => e['id'])).toEqual(['a', 'x']);
      expect(cellOf(findById(next, 'x'))).toEqual({ x: 1, y: 1 });
    });

    it('uses the first free cell when no cell is given', () => {
      const next = moveElement(page(), 'x', 'g', 0);
      expect(cellOf(findById(next, 'x'))).toEqual({ x: 1, y: 0 });
    });

    it('removes gridItem from an element moved into a VerticalLayout', () => {
      const next = moveElement(page(), 'a', 'v', 1);
      const moved = findById(next, 'a');
      expect(childrenOf(findById(next, 'v')).map((e) => e['id'])).toEqual(['x', 'a']);
      expect(cellOf(moved)).toBeUndefined();
      expect(moved?.['options']).toEqual({ text: 'a' });
    });

    it('moves the occupant out of the way with the arrival (rule 21)', () => {
      const next = moveElement(page(), 'x', 'g', 0, {
        x: 0,
        y: 0,
        displaced: new Map([['a', { x: 0, y: 1, w: 1, h: 1 }]]),
      });
      expect(cellOf(findById(next, 'x'))).toEqual({ x: 0, y: 0 });
      expect(cellOf(findById(next, 'a'))).toEqual({ x: 0, y: 1 });
    });

    it('is a no-op into a full Grid', () => {
      const full = form('f', 'F', [
        { id: 'v', type: 'VerticalLayout', elements: [{ id: 'x', type: 'Heading' }] },
        grid([at('a', 0, 0)], 1, 1),
      ]);
      expect(moveElement(full, 'x', 'g', 0)).toBe(full);
    });
  });

  describe('copy (rule 22)', () => {
    it("places a Grid child's copy in the first free cell after the source", () => {
      const doc = content(form('f', 'F', [grid([at('a', 0, 0, { w: 2 }), at('b', 1, 1)])]));
      const result = copyElement(doc, 'a');
      expect(result).toBeDefined();
      const children = childrenOf(findById(result!.content.variants.default, 'g'));
      expect(children.map((e) => e['id'])).toEqual(['a', result!.copyId, 'b']);
      expect(cellOf(children[1])).toEqual({ x: 0, y: 1 });
    });

    it('is a no-op when the Grid has no free cell', () => {
      const doc = content(form('f', 'F', [grid([at('a', 0, 0)], 1, 1)]));
      expect(copyElement(doc, 'a')).toBeUndefined();
    });
  });

  describe('shrink (rules 25-27)', () => {
    const doc = () =>
      content(
        form('f', 'F', [
          grid([
            at('a', 0, 0, { w: 2 }),
            { ...control('k'), options: { gridItem: { x: 1, y: 1 } } },
          ]),
        ]),
        {
          k: { type: 'string' },
        },
      );

    it('removes children whose top-left falls outside the new bounds, with their orphaned properties', () => {
      const next = resizeGrid(doc(), 'g', { columns: 1 });
      const g = findById(next.variants.default, 'g');
      expect(childrenOf(g).map((e) => e['id'])).toEqual(['a']);
      expect(g?.['options']).toEqual({ columns: 1, rows: 2 });
      expect(next.schema['properties']).toEqual({});
    });

    it('trims spans crossing the new edge without removing the child', () => {
      const next = resizeGrid(doc(), 'g', { columns: 1 });
      expect(cellOf(findById(next.variants.default, 'a'))).toEqual({ x: 0, y: 0 });
    });

    it('reports the elements a shrink would remove', () => {
      expect(gridResizeLosses(doc(), 'g', { rows: 1 })).toEqual(['c-k']);
      expect(gridResizeLosses(doc(), 'g', { columns: 1, rows: 1 })).toEqual(['c-k']);
      expect(gridResizeLosses(doc(), 'g', { columns: 3 })).toEqual([]);
    });

    it('growing never moves anything', () => {
      const before = doc();
      const next = resizeGrid(before, 'g', { columns: 4, rows: 3 });
      const children = childrenOf(findById(next.variants.default, 'g'));
      expect(children).toEqual(childrenOf(findById(before.variants.default, 'g')));
      expect(findById(next.variants.default, 'g')?.['options']).toEqual({ columns: 4, rows: 3 });
    });
  });
});
