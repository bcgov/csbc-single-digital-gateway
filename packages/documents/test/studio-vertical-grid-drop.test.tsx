import { act } from '@testing-library/react';
import type { GridItemHTMLElement, GridStack, GridStackNode } from 'gridstack';
import { describe, expect, it } from 'vitest';
import { renderStudioRenderers, studioHeading } from './render-studio-renderers';

type Grid = HTMLElement & { gridstack: GridStack };
const form = (elements: unknown[]) => ({ id: 'form', type: 'Form', label: 'Page', elements });
const gridOf = (container: HTMLElement) =>
  container.querySelector('[data-slot="studio-vertical-layout"]') as Grid;

/** The element a grid's droppable listens on. */
const eventElOf = (grid: Grid) =>
  (grid as unknown as { ddElement: { ddDroppable: { eventEl: HTMLElement } } }).ddElement
    .ddDroppable.eventEl;

/** A palette drag landing at row `y`: the clone gridstack adds, then its `dropped` handler (jsdom can't drag). */
function drop(grid: Grid, itemId: string, y: number) {
  const el = document.createElement('div');
  el.className = 'grid-stack-item';
  el.setAttribute('data-palette-item', itemId);
  el.innerHTML = '<div class="grid-stack-item-content"><div>clone</div></div>';
  grid.appendChild(el);
  const node = grid.gridstack.makeWidget(el, { x: 0, y, w: 1, h: 10 })
    .gridstackNode as GridStackNode;
  // gridstack's registered `dropped` handler: private, and the only way to reach it without a real drag.
  // eslint-disable-next-line no-underscore-dangle -- gridstack's private handler map
  const handlers =
    // eslint-disable-next-line no-underscore-dangle -- as above
    (grid.gridstack as unknown as { _gsEventHandler: Record<string, Function> })._gsEventHandler;
  act(() => {
    handlers['dropped']!(new Event('dropped'), undefined, node);
  });
  return el;
}

describe('studio grid drag-in (doc 238 rules 11-13, 17)', () => {
  it('accepts only palette items, and only when editable', () => {
    const palette = document.createElement('div');
    palette.setAttribute('data-palette-item', 'heading');
    const other = document.createElement('div');
    const editable = renderStudioRenderers(form([studioHeading('a', 'A')]));
    const accepts = gridOf(editable.container).gridstack.opts.acceptWidgets as (
      el: Element,
    ) => boolean;
    expect(accepts(palette)).toBe(true);
    expect(accepts(other)).toBe(false);
    editable.unmount();
    const viewOnly = renderStudioRenderers(form([studioHeading('a', 'A')]), { editable: false });
    expect(gridOf(viewOnly.container).gridstack.opts.acceptWidgets).toBe(false);
  });

  it('inserts at the dropped row, removing the clone gridstack added', () => {
    const { container, insert } = renderStudioRenderers(
      form([studioHeading('a', 'A'), studioHeading('b', 'B')]),
    );
    const grid = gridOf(container);
    const [first, second] = [...grid.querySelectorAll<GridItemHTMLElement>('[gs-id]')];
    const between = (first!.gridstackNode!.y ?? 0) + 1;
    expect(between).toBeLessThanOrEqual(second!.gridstackNode!.y ?? 0);
    const clone = drop(grid, 'checkbox', between);
    expect(insert).toHaveBeenCalledWith('form', 1, 'checkbox');
    expect(clone.isConnected).toBe(false);
    expect(grid.gridstack.engine.nodes.map((n) => n.id)).toEqual(['a', 'b']);
  });

  it('inserts at the top and at the end', () => {
    const top = renderStudioRenderers(form([studioHeading('a', 'A')]));
    drop(gridOf(top.container), 'heading', 0);
    expect(top.insert).toHaveBeenCalledWith('form', 0, 'heading');
    top.unmount();
    const end = renderStudioRenderers(form([studioHeading('a', 'A')]));
    drop(gridOf(end.container), 'switch', 500);
    expect(end.insert).toHaveBeenCalledWith('form', 1, 'switch');
  });

  it('inserts into a nested VerticalLayout by its own id', () => {
    const { container, insert } = renderStudioRenderers(
      form([{ id: 'inner', type: 'VerticalLayout', elements: [studioHeading('a', 'A')] }]),
    );
    const inner = container.querySelector(
      '[data-element-id="inner"] [data-slot="studio-vertical-layout"]',
    ) as Grid;
    drop(inner, 'heading', 0);
    expect(insert).toHaveBeenCalledWith('inner', 0, 'heading');
  });

  it('keeps an empty grid as a dashed drop zone, worded by editability', () => {
    const editable = renderStudioRenderers(form([]));
    const grid = gridOf(editable.container);
    expect(grid).toHaveAttribute('data-empty');
    expect(grid.gridstack.opts.minRow).toBe(12);
    expect(editable.container).toHaveTextContent('Drag items here');
    expect(editable.container).not.toHaveTextContent('No fields yet');
    editable.unmount();
    const viewOnly = renderStudioRenderers(form([]), { editable: false });
    expect(viewOnly.container).toHaveTextContent('No fields yet');
    expect(gridOf(viewOnly.container)).toHaveAttribute('data-empty');
  });

  // Ported from @repo/forms (its doc 190): gridstack listens on the ENCLOSING ITEM, so a nested grid claimed its parent
  // item's whole box and could not be dropped into.
  it("listens for drops on each nested grid itself, and on a root Form's section (rule 13)", () => {
    const { container } = renderStudioRenderers(
      form([{ id: 'inner', type: 'VerticalLayout', elements: [studioHeading('a', 'A')] }]),
    );
    const inner = container.querySelector(
      '[data-element-id="inner"] [data-slot="studio-vertical-layout"]',
    ) as Grid;
    expect(eventElOf(inner)).toBe(inner);
    const section = container.querySelector('section[data-slot="form"]')!;
    expect(eventElOf(gridOf(container))).toBe(section);
  });

  it("makes the Form's section a page-filling, pointer-taking drop zone when editable (rule 13b)", () => {
    const editable = renderStudioRenderers(form([]));
    expect(editable.container.querySelector('section[data-slot="form"]')).toHaveClass(
      'flex-1',
      'pointer-events-auto',
      'nodrag',
    );
    editable.unmount();
    const viewOnly = renderStudioRenderers(form([]), { editable: false });
    expect(viewOnly.container.querySelector('section[data-slot="form"]')).not.toHaveClass(
      'pointer-events-auto',
    );
  });

  it("frames an empty ROOT drop zone, but not a nested layout's — its wrapper frames that", () => {
    const { container } = renderStudioRenderers(
      form([{ id: 'inner', type: 'VerticalLayout', elements: [] }]),
    );
    const inner = container.querySelector(
      '[data-element-id="inner"] [data-slot="studio-vertical-layout"]',
    )!;
    expect(inner).toHaveAttribute('data-empty');
    expect(inner).not.toHaveClass('border-dashed');
    expect(inner).toHaveTextContent('Drag items here');
    const empty = renderStudioRenderers(form([]));
    expect(gridOf(empty.container)).toHaveClass('border-dashed');
  });
});
