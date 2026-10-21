import { JsonForms } from '@jsonforms/react';
import { act, render } from '@testing-library/react';
import type { GridItemHTMLElement } from 'gridstack';
import { DDManager } from 'gridstack/dist/dd-manager';
import { useState } from 'react';
import { GridStack } from 'gridstack';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as studio from '../src/renderers/studio/index';
import { StudioEditorProvider } from '../src/renderers/studio/index';
import type { Uischema } from '../src/studio/document-types';
import { moveElement } from '../src/studio/element-move';
import { changeEvent, dropFrom, handlersOf, type Grid } from './grid-move';
import { renderStudioRenderers, studioHeading } from './render-studio-renderers';

type Accepts = (el: Element) => boolean;

const form = (elements: unknown[]) => ({ id: 'form', type: 'Form', label: 'Page', elements });
const layout = (id: string, elements: unknown[]) => ({ id, type: 'VerticalLayout', elements });
const rootGrid = (container: HTMLElement) =>
  container.querySelector('[data-slot="studio-vertical-layout"]') as Grid;
const gridIn = (container: HTMLElement, layoutId: string) =>
  container.querySelector(
    `[data-element-id="${layoutId}"] [data-slot="studio-vertical-layout"]`,
  ) as Grid;
const itemOf = (grid: Grid, key: string) =>
  grid.querySelector<GridItemHTMLElement>(`:scope > [gs-id="${key}"]`)!;
const acceptsOf = (grid: Grid) => grid.gridstack.opts.acceptWidgets as Accepts | false;

/** A host that APPLIES moves, so both grids remount on the new document as they do in the studio. */
function MoveHarness({ initial }: { initial: Uischema }) {
  const [doc, setDoc] = useState(initial);
  return (
    <StudioEditorProvider
      update={() => {}}
      insert={() => {}}
      move={(id, layoutId, index) => setDoc((d) => moveElement(d, id, layoutId, index))}
    >
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

describe('studio grid accepts items from other grids (doc 243 rules 5-6)', () => {
  it('accepts an item with an authored id from another grid, and palette items still', () => {
    const { container } = renderStudioRenderers(
      form([studioHeading('a', 'A'), layout('inner', [studioHeading('b', 'B')])]),
      { movable: true },
    );
    const accepts = acceptsOf(gridIn(container, 'inner'));
    expect(accepts).toBeTypeOf('function');
    expect((accepts as Accepts)(itemOf(rootGrid(container), 'a'))).toBe(true);
    const palette = document.createElement('div');
    palette.setAttribute('data-palette-item', 'heading');
    expect((accepts as Accepts)(palette)).toBe(true);
    expect((accepts as Accepts)(document.createElement('div'))).toBe(false);
  });

  it('refuses a layout dropped into itself or its own descendant', () => {
    const { container } = renderStudioRenderers(
      form([layout('outer', [layout('inner', [studioHeading('b', 'B')])])]),
      { movable: true },
    );
    const outerItem = itemOf(rootGrid(container), 'outer');
    const innerItem = itemOf(gridIn(container, 'outer'), 'inner');
    expect((acceptsOf(gridIn(container, 'inner')) as Accepts)(outerItem)).toBe(false);
    expect((acceptsOf(gridIn(container, 'inner')) as Accepts)(innerItem)).toBe(false);
    expect((acceptsOf(rootGrid(container)) as Accepts)(innerItem)).toBe(true);
  });

  it('refuses an item without an authored id (the #<index> fallback)', () => {
    const { container } = renderStudioRenderers(
      form([
        { type: 'Heading', options: { text: 'no id' } },
        studioHeading('a', 'A'),
        layout('inner', []),
      ]),
      { movable: true },
    );
    const accepts = acceptsOf(gridIn(container, 'inner')) as Accepts;
    expect(accepts(itemOf(rootGrid(container), '#0'))).toBe(false);
    expect(accepts(itemOf(rootGrid(container), 'a'))).toBe(true);
  });

  it('accepts only palette items without a move port, and nothing when view-only', () => {
    const doc = form([studioHeading('a', 'A'), layout('inner', [])]);
    const noMove = renderStudioRenderers(doc);
    const a = itemOf(rootGrid(noMove.container), 'a');
    expect((acceptsOf(gridIn(noMove.container, 'inner')) as Accepts)(a)).toBe(false);
    noMove.unmount();
    const viewOnly = renderStudioRenderers(doc, { editable: false, movable: true });
    expect(acceptsOf(gridIn(viewOnly.container, 'inner'))).toBe(false);
  });
});

describe('studio grid move drop (doc 243 rules 7-9)', () => {
  it('moves an element into a nested layout at the dropped row and selects it', () => {
    const { container, move, update, insert } = renderStudioRenderers(
      form([studioHeading('a', 'A'), layout('inner', [studioHeading('b', 'B')])]),
      { movable: true },
    );
    const inner = gridIn(container, 'inner');
    const moved = dropFrom(rootGrid(container), inner, itemOf(rootGrid(container), 'a'), 500);
    expect(move).toHaveBeenCalledExactlyOnceWith('a', 'inner', 1);
    expect(moved.isConnected).toBe(false);
    expect(insert).not.toHaveBeenCalled();
    // Neither the source's change (item left) nor the target's (item arrived) writes a reorder.
    expect(update).not.toHaveBeenCalled();
  });

  it('renders the moved element in its new layout, selected, once the host applies the move', () => {
    const { container } = render(
      <MoveHarness
        initial={form([studioHeading('a', 'A'), layout('inner', [studioHeading('b', 'B')])])}
      />,
    );
    dropFrom(
      rootGrid(container),
      gridIn(container, 'inner'),
      itemOf(rootGrid(container), 'a'),
      500,
    );
    const inner = gridIn(container, 'inner');
    expect(
      [...inner.querySelectorAll(':scope > [gs-id]')].map((i) => i.getAttribute('gs-id')),
    ).toEqual(['b', 'a']);
    expect(
      [...rootGrid(container).querySelectorAll(':scope > [gs-id]')].map((i) =>
        i.getAttribute('gs-id'),
      ),
    ).toEqual(['inner']);
    expect(inner.gridstack.engine.nodes.map((n) => n.id)).toEqual(['b', 'a']);
    expect(container.querySelector('[data-element-id="a"]')).toHaveAttribute('data-selected');
  });

  it('moves an element out of a nested layout to the top of the root', () => {
    const { container, move, update } = renderStudioRenderers(
      form([studioHeading('a', 'A'), layout('inner', [studioHeading('b', 'B')])]),
      { movable: true },
    );
    const inner = gridIn(container, 'inner');
    dropFrom(inner, rootGrid(container), itemOf(inner, 'b'), 0);
    expect(move).toHaveBeenCalledExactlyOnceWith('b', 'form', 0);
    expect(update).not.toHaveBeenCalled();
  });

  it('still inserts a palette drop, and still writes an in-grid reorder', () => {
    const { container, move, insert, update } = renderStudioRenderers(
      form([studioHeading('a', 'A'), studioHeading('b', 'B')]),
      { movable: true },
    );
    const grid = rootGrid(container);
    const clone = document.createElement('div');
    clone.className = 'grid-stack-item';
    clone.setAttribute('data-palette-item', 'heading');
    clone.innerHTML = '<div class="grid-stack-item-content"><div>clone</div></div>';
    grid.appendChild(clone);
    const node = grid.gridstack.makeWidget(clone, { x: 0, y: 0, w: 1, h: 1 }).gridstackNode;
    act(() => {
      handlersOf(grid)['dropped']!(new Event('dropped'), undefined, node);
    });
    expect(insert).toHaveBeenCalledWith('form', 0, 'heading');
    expect(move).not.toHaveBeenCalled();
    act(() => {
      grid.gridstack.update(itemOf(grid, 'b'), { y: 0 });
    });
    expect(update).toHaveBeenCalledWith('form', {
      elements: [studioHeading('b', 'B'), studioHeading('a', 'A')],
    });
  });

  // Found by hand: gridstack fires `change` MID-drag (e.g. `update()` as a layout grows under the item); a reorder
  // written then remounted the grid under the live drag, which threw on every move and stranded the drop.
  it('writes no reorder while a drag is still moving, and the final one once it stops (rule 9b)', () => {
    const { container, update } = renderStudioRenderers(
      form([studioHeading('a', 'A'), studioHeading('b', 'B')]),
      { movable: true },
    );
    const grid = rootGrid(container);
    const manager = DDManager as unknown as { dragElement?: { dragging?: boolean } };
    manager.dragElement = { dragging: true };
    try {
      act(() => {
        grid.gridstack.update(itemOf(grid, 'b'), { y: 0 });
      });
      expect(update).not.toHaveBeenCalled();
      // `_mouseUp` clears `dragging` before the source grid's stop handler fires its final change.
      delete manager.dragElement.dragging;
      act(() => {
        handlersOf(grid)['change']!(changeEvent(grid.gridstack.engine.nodes));
      });
      expect(update).toHaveBeenCalledWith('form', {
        elements: [studioHeading('b', 'B'), studioHeading('a', 'A')],
      });
    } finally {
      delete manager.dragElement;
    }
  });

  // Found by hand: a moved element arrived in a grid that had never measured it, so the new grid drew it one row tall —
  // and its layout too short in the PARENT grid — then grew both as gridstack animated: everything "relaid out".
  it('remounts both layouts after a move with every item already in place: nothing resized (doc 243 rule 14)', async () => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => 36,
    });
    const { container } = render(
      <MoveHarness
        initial={form([
          studioHeading('a', 'A'),
          layout('inner', [studioHeading('b', 'B')]),
          studioHeading('c', 'C'),
        ])}
      />,
    );
    await act(async () => {});
    const update = vi.spyOn(GridStack.prototype, 'update');
    dropFrom(
      rootGrid(container),
      gridIn(container, 'inner'),
      itemOf(rootGrid(container), 'a'),
      500,
    );
    await act(async () => {});

    const inner = gridIn(container, 'inner');
    const moved = itemOf(inner, 'a');
    // 36px content + 0 margin in jsdom = 9 rows: the moved Heading arrives at its measured height.
    expect(moved.gridstackNode?.h).toBe(9);
    expect(update).not.toHaveBeenCalled();
    update.mockRestore();
  });
});
