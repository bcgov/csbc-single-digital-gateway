import { JsonForms } from '@jsonforms/react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { gridLayoutEntry } from '../src/renderers/default/grid-layout';
import * as defaults from '../src/renderers/default/index';

const heading = (id: string, text: string, gridItem?: Record<string, number>) => ({
  id,
  type: 'Heading',
  options: { text, ...(gridItem !== undefined && { gridItem }) },
});

function renderGrid(uischema: Record<string, unknown>) {
  const { container } = render(
    <JsonForms
      schema={{ type: 'object' }}
      uischema={uischema as never}
      data={{}}
      renderers={defaults.renderers}
      cells={defaults.cells}
    />,
  );
  return container.querySelector<HTMLElement>('[data-slot="grid-layout"]');
}

const grid = (elements: unknown[], options: Record<string, unknown> = {}) => ({
  id: 'g',
  type: 'Grid',
  options,
  elements,
});

describe('default Grid renderer (doc 260 rules 5-7)', () => {
  describe('rendering', () => {
    it('renders a grid-layout slot with --grid-columns and --grid-rows', () => {
      const layout = renderGrid(grid([], { columns: 3, rows: 4 }));
      expect(layout).not.toBeNull();
      expect(layout!.style.getPropertyValue('--grid-columns')).toBe('3');
      expect(layout!.style.getPropertyValue('--grid-rows')).toBe('4');
      expect(layout).toHaveAttribute('data-columns', '3');
    });

    it('places each child with grid-column x+1 / span w and grid-row y+1 / span h', () => {
      const layout = renderGrid(
        grid(
          [
            heading('b', 'Second', { x: 0, y: 1, w: 2 }),
            heading('a', 'First', { x: 1, y: 0, h: 1 }),
          ],
          { columns: 2, rows: 2 },
        ),
      );
      const items = [...layout!.querySelectorAll<HTMLElement>('[data-slot="grid-layout-item"]')];
      // Reading order (rule 4): First (row 0) before Second (row 1), whatever the elements order.
      expect(items.map((item) => item.textContent)).toEqual(['First', 'Second']);
      expect(items[0]!.style.getPropertyValue('--grid-column')).toBe('2 / span 1');
      expect(items[0]!.style.getPropertyValue('--grid-row')).toBe('1 / span 1');
      expect(items[1]!.style.getPropertyValue('--grid-column')).toBe('1 / span 2');
      expect(items[1]!.style.getPropertyValue('--grid-row')).toBe('2 / span 1');
    });

    it("aligns each child by its own alignment, else the Grid's (rules 29, 31)", () => {
      const layout = renderGrid(
        grid(
          [
            heading('a', 'A', { x: 0, y: 0 }),
            {
              ...heading('b', 'B'),
              options: {
                text: 'B',
                gridItem: { x: 1, y: 0, alignSelf: 'end', justifySelf: 'start' },
              },
            },
          ],
          { alignItems: 'center' },
        ),
      );
      const [a, b] = [...layout!.querySelectorAll('[data-slot="grid-layout-item"]')];
      expect(a).toHaveClass('self-center', 'justify-self-stretch');
      expect(b).toHaveClass('self-end', 'justify-self-start');
    });

    it('uses the authored gap class', () => {
      expect(renderGrid(grid([], { gap: 'lg' }))).toHaveClass('gap-6');
      expect(renderGrid(grid([]))).toHaveClass('gap-4');
    });

    it('stacks to one column below the 40rem container (container-query classes)', () => {
      const layout = renderGrid(grid([heading('a', 'A')]));
      expect(layout).toHaveClass('grid', 'grid-cols-1');
      expect(layout!.className).toContain(
        '@min-[40rem]/grid-layout:grid-cols-[repeat(var(--grid-columns),minmax(0,1fr))]',
      );
      expect(layout!.parentElement).toHaveClass('@container/grid-layout');
      const item = layout!.querySelector('[data-slot="grid-layout-item"]');
      expect(item!.className).toContain(
        '@min-[40rem]/grid-layout:[grid-column:var(--grid-column)]',
      );
    });

    it('is part of default.layoutRenderers at rank 1', () => {
      expect(defaults.layoutRenderers).toContain(gridLayoutEntry);
      expect(gridLayoutEntry.tester({ type: 'Grid' } as never, {}, {} as never)).toBe(1);
      expect(gridLayoutEntry.tester({ type: 'VerticalLayout' } as never, {}, {} as never)).toBe(-1);
    });
  });
});
