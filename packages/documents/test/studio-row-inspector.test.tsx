import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DocumentContent, Uischema } from '../src/studio/document-types';
import { findById } from '../src/studio/element-ids';
import { applyInspector } from '../src/studio/inspector/apply-inspector';
import { fieldsFor, inspectorForm } from '../src/studio/inspector/inspector-form';
import { InspectorSettings } from '../src/studio/inspector/inspector-settings';
import { inspectorTarget } from '../src/studio/inspector/inspector-target';
import { DEFAULT_PALETTE_ITEMS } from '../src/studio/palette-items';
import { form } from './funnel-fixtures';

const sized = (id: string, w?: number): Uischema => ({
  id,
  type: 'Heading',
  options: { text: id, ...(w !== undefined && { gridItem: { w } }) },
});
const page = (layout: Uischema): DocumentContent => ({
  schema: { type: 'object', properties: {} },
  variants: { default: form('F', 'Page', [layout]) },
});
const ROW = page({
  id: 'r',
  type: 'HorizontalLayout',
  options: { columns: 6 },
  elements: [sized('a', 4), sized('b', 2)],
});
const targetOf = (content: DocumentContent, id: string) =>
  inspectorTarget(content, { pageSelectedId: id, focusedId: 'F', formId: 'F' })!;
/** The inspector form's values for `id` with `changes` — every field, as the inspector emits them. */
const valuesFor = (content: DocumentContent, id: string, changes: Record<string, unknown>) => ({
  ...inspectorForm(targetOf(content, id)).data,
  ...changes,
});
const widthsIn = (content: DocumentContent) =>
  ((findById(content.variants.default, 'r')?.['elements'] as Uischema[]) ?? []).map(
    (e) =>
      ((e['options'] as Record<string, unknown>)['gridItem'] as { w?: number } | undefined)?.w ?? 1,
  );

function show(content: DocumentContent, selected: string) {
  render(
    <InspectorSettings
      content={content}
      pageSelectedId={selected}
      focusedId="F"
      formId="F"
      onContentChange={vi.fn()}
    />,
  );
}

describe('HorizontalLayout in the inspector and palette (doc 261 rules 19-21)', () => {
  describe('layout fields (rule 19)', () => {
    it("inspects a row as kind 'horizontal-layout'", () => {
      expect(targetOf(ROW, 'r').kind).toBe('horizontal-layout');
      show(ROW, 'r');
      expect(document.querySelector('[data-slot="inspector-kind"]')).toHaveTextContent(
        /^Horizontal layout$/,
      );
    });

    it('offers Columns, Distribution, Vertical alignment and Spacing', () => {
      show(ROW, 'r');
      expect(screen.getByRole('textbox', { name: 'Columns' })).toHaveValue('6');
      for (const name of ['Distribution', 'Vertical alignment', 'Spacing'])
        expect(screen.getByRole('combobox', { name })).toBeInTheDocument();
      const next = applyInspector(
        ROW,
        targetOf(ROW, 'r'),
        valuesFor(ROW, 'r', { justify: 'center' }),
      );
      expect(findById(next.variants.default, 'r')?.['options']).toEqual({
        columns: 6,
        justify: 'center',
      });
    });

    it('never lets Columns go below the child count', () => {
      const field = fieldsFor(targetOf(ROW, 'r')).find((f) => f.key === 'rowColumns')!;
      expect(field.schema(targetOf(ROW, 'r'))).toMatchObject({ minimum: 2, maximum: 12 });
      // Shrinking re-fits the widths in the same edit; below the child count is refused.
      const narrower = applyInspector(
        ROW,
        targetOf(ROW, 'r'),
        valuesFor(ROW, 'r', { rowColumns: 4 }),
      );
      expect(widthsIn(narrower)).toEqual([2, 2]);
      expect(applyInspector(ROW, targetOf(ROW, 'r'), valuesFor(ROW, 'r', { rowColumns: 1 }))).toBe(
        ROW,
      );
    });
  });

  describe('child fields (rules 20, 20b)', () => {
    it('offers a row child Width, Vertical and Horizontal alignment', () => {
      const target = targetOf(ROW, 'b');
      expect(target.inRow).toBe(true);
      expect(fieldsFor(target).map((f) => f.key)).toEqual(
        expect.arrayContaining(['width', 'alignSelf', 'justifySelf']),
      );
      const wider = applyInspector(ROW, target, valuesFor(ROW, 'b', { width: 3 }));
      expect(widthsIn(wider)).toEqual([3, 3]);
      const aligned = applyInspector(ROW, target, valuesFor(ROW, 'b', { alignSelf: 'end' }));
      const b = findById(aligned.variants.default, 'b');
      // A row child's gridItem never gains a cell.
      expect((b?.['options'] as Record<string, unknown> | undefined)?.['gridItem']).toEqual({
        w: 2,
        alignSelf: 'end',
      });
    });

    it('refuses a Width the row cannot make room for', () => {
      const target = targetOf(ROW, 'b');
      const field = fieldsFor(target).find((f) => f.key === 'width')!;
      expect(field.schema(target)).toMatchObject({ minimum: 1, maximum: 5 });
      expect(applyInspector(ROW, target, valuesFor(ROW, 'b', { width: 6 }))).toBe(ROW);
    });

    it('offers a Grid child Width too', () => {
      const grid = page({
        id: 'g',
        type: 'Grid',
        options: { columns: 2, rows: 2 },
        elements: [
          { ...sized('a'), options: { text: 'a', gridItem: { x: 0, y: 0 } } },
          { ...sized('b'), options: { text: 'b', gridItem: { x: 1, y: 0 } } },
        ],
      });
      const target = targetOf(grid, 'a');
      expect(target.inGrid).toBe(true);
      const field = fieldsFor(target).find((f) => f.key === 'width')!;
      expect(field.read(target)).toBe(1);
      expect(field.schema(target)).toMatchObject({ maximum: 2 });
      const next = applyInspector(grid, target, valuesFor(grid, 'a', { width: 2 }));
      const items = ((findById(next.variants.default, 'g')?.['elements'] as Uischema[]) ?? []).map(
        (e) => [e['id'], (e['options'] as Record<string, unknown>)['gridItem']],
      );
      expect(items).toEqual([
        ['a', { x: 0, y: 0, w: 2 }],
        ['b', { x: 1, y: 1 }],
      ]);
    });
  });

  describe('palette (rule 21)', () => {
    it('lists Horizontal layout between Vertical layout and Grid', () => {
      const ids = DEFAULT_PALETTE_ITEMS.map((item) => item.id);
      expect(ids.indexOf('horizontal-layout')).toBe(ids.indexOf('vertical-layout') + 1);
      expect(ids.indexOf('grid')).toBe(ids.indexOf('horizontal-layout') + 1);
      expect(DEFAULT_PALETTE_ITEMS.find((i) => i.id === 'horizontal-layout')!.group).toBe('Layout');
    });

    it('creates a fresh empty HorizontalLayout on every call', () => {
      const item = DEFAULT_PALETTE_ITEMS.find((i) => i.id === 'horizontal-layout')!;
      const [first, second] = [item.create().element, item.create().element];
      expect(first).toMatchObject({ type: 'HorizontalLayout', elements: [] });
      expect(first['id']).not.toBe(second['id']);
    });
  });
});
