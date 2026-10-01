import { JsonForms } from '@jsonforms/react';
import { act, render } from '@testing-library/react';
import { GridStack, type GridItemHTMLElement } from 'gridstack';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as studio from '../src/renderers/studio/index';
import { StudioEditorProvider } from '../src/renderers/studio/index';
import { updateElement } from '../src/studio/element-edits';

const h = (id: string) => ({ id, type: 'Heading', options: { text: id.toUpperCase() } });

function Harness() {
  const [doc, setDoc] = useState<Record<string, unknown>>({
    id: 'root',
    type: 'VerticalLayout',
    elements: ['a', 'b', 'c', 'd', 'e'].map(h),
  });
  return (
    <StudioEditorProvider update={(id, patch) => setDoc((d) => updateElement(d, id, patch))}>
      <output data-testid="order">
        {(doc['elements'] as { id: string }[]).map((e) => e.id).join('')}
      </output>
      <JsonForms
        schema={{ type: 'object' }}
        uischema={doc as never}
        data={{}}
        renderers={studio.renderers}
        cells={studio.cells}
      />
    </StudioEditorProvider>
  );
}

const offsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')!;
afterEach(() => Object.defineProperty(HTMLElement.prototype, 'offsetHeight', offsetHeight));

// Bug (doc 236, found by hand): after a few drags the page order looked random. jsdom lays nothing out, so every item
// was 1 row and its row index equalled its position — the bug only shows once items are taller than a row.
describe('studio VerticalLayout reorder write-back', () => {
  it('keeps the document, the grid and the DOM in one order across repeated reorders', async () => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => 36,
    });
    const { container, getByTestId } = render(<Harness />);
    const grid = () =>
      container.querySelector('[data-slot="studio-vertical-layout"]') as HTMLElement & {
        gridstack: GridStack;
      };
    const state = () => {
      const g = grid();
      const byY = g.gridstack.engine.nodes
        .toSorted((x, y) => (x.y ?? 0) - (y.y ?? 0))
        .map((n) => n.id)
        .join('');
      const dom = [...g.querySelectorAll(':scope > .grid-stack-item')]
        .map((i) => i.getAttribute('gs-id'))
        .join('');
      const attrs = [...g.querySelectorAll(':scope > .grid-stack-item')]
        .map((i) => i.getAttribute('gs-y'))
        .join(',');
      return { order: getByTestId('order').textContent, byY, dom, attrs };
    };
    const log: string[] = [];
    const moves: [string, number][] = [
      ['e', 9],
      ['a', 30],
      ['c', 0],
      ['b', 20],
      ['d', 9],
      ['e', 0],
      ['a', 9],
    ];
    await act(async () => {});
    expect(state()).toMatchObject({ order: 'abcde', byY: 'abcde', dom: 'abcde' });
    for (const [id, y] of moves) {
      // eslint-disable-next-line no-await-in-loop -- each move starts from the grid the last one left
      await act(async () => {
        grid().gridstack.update(grid().querySelector<GridItemHTMLElement>(`[gs-id="${id}"]`)!, {
          y,
        });
      });
      const { order, byY, dom } = state();
      log.push(`${id}->${y} ${order}`);
      expect(byY, `${id}->${y}`).toBe(order);
      expect(dom, `${id}->${y}`).toBe(order);
    }
    // Moving e into b's row places it straight after a; every later step only has to stay in one order.
    expect(log[0]).toBe('e->9 aebcd');
    expect(new Set(log.map((l) => l.split(' ')[1])).size).toBeGreaterThan(3);
  });

  // Bug (doc 236, found by hand): a drop remounts the grid (rule 30), and the new grid started every item one row tall,
  // then grew each to its measured height while gridstack animated — every item below the drop "accordioned" back in.
  it('remounts after a drop with every item already in place: nothing resized, nothing animated', async () => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => 36,
    });
    const { container } = render(<Harness />);
    const grid = () =>
      container.querySelector('[data-slot="studio-vertical-layout"]') as HTMLElement & {
        gridstack: GridStack;
      };
    await act(async () => {});
    const before = grid();
    const update = vi.spyOn(GridStack.prototype, 'update');
    await act(async () => {
      before.gridstack.update(before.querySelector<GridItemHTMLElement>('[gs-id="e"]')!, { y: 9 });
    });
    update.mockClear();
    await act(async () => {});

    const after = grid();
    expect(after).not.toBe(before);
    const items = [...after.querySelectorAll<GridItemHTMLElement>(':scope > .grid-stack-item')];
    expect(items.map((i) => i.getAttribute('gs-id')).join('')).toBe('aebcd');
    // Rendered at the measured heights (36px content + 0 margin in jsdom = 9 rows), stacked: fitting changes nothing.
    expect(items.map((i) => i.gridstackNode?.h)).toEqual([9, 9, 9, 9, 9]);
    expect(items.map((i) => i.gridstackNode?.y)).toEqual([0, 9, 18, 27, 36]);
    expect(update).not.toHaveBeenCalled();
    expect(after).not.toHaveClass('grid-stack-animate');
    update.mockRestore();
  });
});
