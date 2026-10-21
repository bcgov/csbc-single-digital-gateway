import { JsonForms } from '@jsonforms/react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { horizontalLayoutEntry } from '../src/renderers/default/horizontal-layout';
import * as defaults from '../src/renderers/default/index';

const heading = (id: string, text: string, gridItem?: Record<string, unknown>) => ({
  id,
  type: 'Heading',
  options: { text, ...(gridItem !== undefined && { gridItem }) },
});
const row = (elements: unknown[], options: Record<string, unknown> = {}) => ({
  id: 'r',
  type: 'HorizontalLayout',
  options,
  elements,
});

function renderRow(uischema: Record<string, unknown>) {
  const { container } = render(
    <JsonForms
      schema={{ type: 'object' }}
      uischema={uischema as never}
      data={{}}
      renderers={defaults.renderers}
      cells={defaults.cells}
    />,
  );
  return container.querySelector<HTMLElement>('[data-slot="row-layout"]');
}
const itemsOf = (layout: HTMLElement | null) => [
  ...(layout?.querySelectorAll<HTMLElement>('[data-slot="row-layout-item"]') ?? []),
];

describe('default HorizontalLayout renderer (doc 261 rules 5-6)', () => {
  describe('rendering', () => {
    it('renders a row-layout slot with --row-columns', () => {
      const layout = renderRow(row([], { columns: 6 }));
      expect(layout).not.toBeNull();
      expect(layout!.style.getPropertyValue('--row-columns')).toBe('6');
    });

    it('places each child at its display column span', () => {
      const layout = renderRow(
        row([heading('a', 'A', { w: 2 }), heading('b', 'B', { w: 3 })], { justify: 'end' }),
      );
      expect(itemsOf(layout).map((i) => i.style.getPropertyValue('--row-column'))).toEqual([
        '8 / span 2',
        '10 / span 3',
      ]);
      expect(itemsOf(layout).map((i) => i.textContent)).toEqual(['A', 'B']);
    });

    it('aligns each child with self-* and justify-self-*', () => {
      const layout = renderRow(
        row([heading('a', 'A'), heading('b', 'B', { alignSelf: 'end', justifySelf: 'center' })], {
          alignItems: 'center',
        }),
      );
      const [a, b] = itemsOf(layout);
      expect(a).toHaveClass('self-center', 'justify-self-stretch');
      expect(b).toHaveClass('self-end', 'justify-self-center');
    });

    it('stacks to one column below the 40rem container', () => {
      const layout = renderRow(row([heading('a', 'A')]));
      expect(layout).toHaveClass('grid', 'grid-cols-1');
      expect(layout!.className).toContain(
        '@min-[40rem]/row-layout:grid-cols-[repeat(var(--row-columns),minmax(0,1fr))]',
      );
      expect(layout!.parentElement).toHaveClass('@container/row-layout');
      expect(itemsOf(layout)[0]!.className).toContain(
        '@min-[40rem]/row-layout:[grid-column:var(--row-column)]',
      );
    });

    it('is part of default.layoutRenderers at rank 1', () => {
      expect(defaults.layoutRenderers).toContain(horizontalLayoutEntry);
      expect(
        horizontalLayoutEntry.tester({ type: 'HorizontalLayout' } as never, {}, {} as never),
      ).toBe(1);
    });
  });
});
