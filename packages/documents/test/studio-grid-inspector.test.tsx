import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { CapabilityMap } from '../src/studio/capabilities/capability-types';
import { governanceOf } from '../src/studio/capabilities/governance';
import type { DocumentContent, Uischema } from '../src/studio/document-types';
import { findById } from '../src/studio/element-ids';
import { applyInspector } from '../src/studio/inspector/apply-inspector';
import { fieldsFor, inspectorForm } from '../src/studio/inspector/inspector-form';
import { InspectorSettings } from '../src/studio/inspector/inspector-settings';
import { inspectorTarget } from '../src/studio/inspector/inspector-target';
import { DEFAULT_PALETTE_ITEMS } from '../src/studio/palette-items';
import { form } from './funnel-fixtures';

const at = (id: string, text: string, x: number, y: number): Uischema => ({
  id,
  type: 'Heading',
  options: { text, gridItem: { x, y } },
});
const CONTENT: DocumentContent = {
  schema: { type: 'object', properties: {} },
  variants: {
    default: form('F', 'Page', [
      {
        id: 'g',
        type: 'Grid',
        options: { columns: 2, rows: 2 },
        elements: [at('a', 'Left', 0, 0), at('b', 'Right', 1, 0)],
      },
    ]),
  },
};
/** The inspector's target when the page selection is `id`. */
const targetOf = (content: DocumentContent, id: string) =>
  inspectorTarget(content, { pageSelectedId: id, focusedId: 'F', formId: 'F' })!;
/** The element `id`'s `options.gridItem`, or `undefined`. */
const gridItemIn = (root: Uischema, id: string) =>
  (findById(root, id)?.['options'] as Record<string, unknown> | undefined)?.['gridItem'];
const gridIn = (content: DocumentContent) => findById(content.variants.default, 'g');
const idsIn = (content: DocumentContent) =>
  ((gridIn(content)?.['elements'] as Uischema[]) ?? []).map((e) => e['id']);

function Harness({
  onChange,
  governance,
}: {
  onChange: (content: DocumentContent) => void;
  governance?: ReturnType<typeof governanceOf>;
}) {
  const [content, setContent] = useState(CONTENT);
  return (
    <InspectorSettings
      content={content}
      pageSelectedId="g"
      focusedId="F"
      formId="F"
      governance={governance}
      onContentChange={(next) => {
        setContent(next);
        onChange(next);
      }}
    />
  );
}

/** Replaces a number field's value, as an author selecting it and typing. */
async function retype(name: string, value: string) {
  const user = userEvent.setup();
  const field = screen.getByRole('textbox', { name });
  await user.clear(field);
  await user.type(field, value);
  await user.tab();
  return user;
}

describe('Grid in the inspector and palette (doc 260 rules 24-28)', () => {
  describe('fields (rule 24)', () => {
    it("inspects a Grid as kind 'grid' named 'Grid'", () => {
      const target = inspectorTarget(CONTENT, { pageSelectedId: 'g', focusedId: 'F', formId: 'F' });
      expect(target?.kind).toBe('grid');
      render(<Harness onChange={vi.fn()} />);
      expect(document.querySelector('[data-slot="inspector-kind"]')).toHaveTextContent(/^Grid$/);
    });

    it('offers Columns, Rows and Spacing under Appearance', () => {
      render(<Harness onChange={vi.fn()} />);
      expect(screen.getByRole('textbox', { name: 'Columns' })).toHaveValue('2');
      expect(screen.getByRole('textbox', { name: 'Rows' })).toHaveValue('2');
      expect(screen.getByRole('combobox', { name: 'Spacing' })).toBeInTheDocument();
      const headings = [...document.querySelectorAll('[data-slot="foldable-section-heading"]')];
      expect(headings.map((h) => h.textContent)).toEqual(['Appearance']);
    });

    it('writes a larger column count without moving anything', async () => {
      const onChange = vi.fn();
      render(<Harness onChange={onChange} />);
      await retype('Columns', '3');
      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const next = onChange.mock.lastCall![0] as DocumentContent;
      expect(gridIn(next)?.['options']).toEqual({ columns: 3, rows: 2 });
      expect(gridIn(next)?.['elements']).toEqual(gridIn(CONTENT)?.['elements']);
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });
  });

  describe('alignment (rules 29, 33)', () => {
    it("offers a Grid its children's default Vertical and Horizontal alignment", () => {
      render(<Harness onChange={vi.fn()} />);
      expect(screen.getByRole('combobox', { name: 'Vertical alignment' })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'Horizontal alignment' })).toBeInTheDocument();
      const target = targetOf(CONTENT, 'g');
      expect(target.inGrid).toBe(false);
      const next = applyInspector(CONTENT, target, {
        ...inspectorForm(target).data,
        alignItems: 'center',
      });
      expect(gridIn(next)?.['options']).toEqual({ columns: 2, rows: 2, alignItems: 'center' });
      // The default is an absent key.
      const back = applyInspector(next, targetOf(next, 'g'), {
        ...inspectorForm(targetOf(next, 'g')).data,
        alignItems: 'start',
      });
      expect(gridIn(back)?.['options']).toEqual({ columns: 2, rows: 2 });
    });

    it("offers a Grid's direct child its own alignment, written into its gridItem and cleared back to the Grid's", () => {
      const target = targetOf(CONTENT, 'b');
      expect(target.inGrid).toBe(true);
      expect(fieldsFor(target).map((f) => f.key)).toEqual(
        expect.arrayContaining(['alignSelf', 'justifySelf']),
      );
      const next = applyInspector(CONTENT, target, {
        ...inspectorForm(target).data,
        alignSelf: 'end',
      });
      expect(gridItemIn(next.variants.default, 'b')).toEqual({
        x: 1,
        y: 0,
        alignSelf: 'end',
      });
      const cleared = applyInspector(next, targetOf(next, 'b'), {
        ...inspectorForm(targetOf(next, 'b')).data,
        alignSelf: undefined,
      });
      const gridItem = gridItemIn(cleared.variants.default, 'b');
      expect(gridItem).toEqual({ x: 1, y: 0 });
    });

    it('keeps a child authored without a placement where it is drawn', () => {
      const bare: DocumentContent = {
        ...CONTENT,
        variants: {
          default: form('F', 'Page', [
            {
              id: 'g',
              type: 'Grid',
              options: { columns: 2, rows: 2 },
              elements: [at('a', 'Left', 0, 0), { id: 'c', type: 'Heading' }],
            },
          ]),
        },
      };
      const target = targetOf(bare, 'c');
      const next = applyInspector(bare, target, {
        ...inspectorForm(target).data,
        justifySelf: 'center',
      });
      const gridItem = gridItemIn(next.variants.default, 'c');
      expect(gridItem).toEqual({ x: 1, y: 0, justifySelf: 'center' });
    });

    it('never offers the alignment to an element outside a Grid', () => {
      expect(targetOf(CONTENT, 'F').inGrid).toBe(false);
      expect(fieldsFor(targetOf(CONTENT, 'g')).map((f) => f.key)).not.toContain('alignSelf');
    });
  });

  describe('shrink (rules 25-26)', () => {
    it('asks before a shrink that removes elements and removes them on confirm', async () => {
      const onChange = vi.fn();
      render(<Harness onChange={onChange} />);
      const user = await retype('Columns', '1');
      const dialog = await screen.findByRole('alertdialog');
      expect(dialog).toHaveTextContent('Remove 1 element?');
      expect(dialog).toHaveTextContent('"Right" is outside the new grid and will be deleted.');
      expect(onChange).not.toHaveBeenCalled();
      await user.click(screen.getByRole('button', { name: 'Remove' }));
      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const next = onChange.mock.lastCall![0] as DocumentContent;
      expect(idsIn(next)).toEqual(['a']);
      expect(gridIn(next)?.['options']).toEqual({ columns: 1, rows: 2 });
    });

    it('restores the field on cancel', async () => {
      const onChange = vi.fn();
      render(<Harness onChange={onChange} />);
      const user = await retype('Columns', '1');
      await screen.findByRole('alertdialog');
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      await waitFor(() =>
        expect(screen.getByRole('textbox', { name: 'Columns' })).toHaveValue('2'),
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(onChange).not.toHaveBeenCalled();
    });

    it('refuses a shrink that would remove an element the template forbids removing', async () => {
      const onChange = vi.fn();
      const governance = governanceOf(CONTENT, {
        elements: { b: { remove: false } },
      } satisfies CapabilityMap);
      render(<Harness onChange={onChange} governance={governance} />);
      await retype('Columns', '1');
      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent(
          `Locked by the template: "Right" can't be deleted.`,
        ),
      );
      expect(screen.queryByRole('alertdialog')).toBeNull();
      await waitFor(() =>
        expect(screen.getByRole('textbox', { name: 'Columns' })).toHaveValue('2'),
      );
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('palette (rule 28)', () => {
    it('lists Grid in the Layout group after Horizontal layout (doc 261 rule 21)', () => {
      const ids = DEFAULT_PALETTE_ITEMS.map((item) => item.id);
      expect(ids.indexOf('grid')).toBe(ids.indexOf('horizontal-layout') + 1);
      const grid = DEFAULT_PALETTE_ITEMS.find((item) => item.id === 'grid')!;
      expect(grid.group).toBe('Layout');
      expect(grid.label).toBe('Grid');
    });

    it('creates a fresh 2x2 Grid on every call', () => {
      const grid = DEFAULT_PALETTE_ITEMS.find((item) => item.id === 'grid')!;
      const [first, second] = [grid.create().element, grid.create().element];
      expect(first).toMatchObject({ type: 'Grid', elements: [], options: { columns: 2, rows: 2 } });
      expect(first['id']).not.toBe(second['id']);
      expect(first['elements']).not.toBe(second['elements']);
    });
  });
});
