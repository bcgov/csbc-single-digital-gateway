import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { act, render, screen } from '@testing-library/react';
import {
  GridStack,
  type GridHTMLElement,
  type GridItemHTMLElement,
  type GridStackNode,
} from 'gridstack';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererSet } from '../src/index';
import {
  createGridRenderers,
  GRID_ELEMENT_COMPONENT,
  GridElementDispatch,
} from '../src/renderers-gridstack';
import * as ui from '../src/renderers-ui';
import { contentRows, minHeightUpdate } from '../src/renderers/gridstack/grid-size-to-content';

/** A consumer item that keeps its content as a minimum height (doc 180 rule 10d). */
function MinSizedItem(props: Record<string, unknown>) {
  return <GridElementDispatch {...props} sizing="min" />;
}

// Doc 180 rule 10c — grid items are re-sized to their React-rendered content.
// jsdom does no layout, so these assert that gridstack is ASKED to size the right item; the real
// measurement is verified in the browser (Phase 7b).

const schema: JsonSchema = { type: 'object', properties: {} };

const uischema = {
  type: 'Grid',
  elements: [{ type: 'Heading', text: 'Sized' }],
} as UISchemaElement;

function renderGrid(set: RendererSet, layout: UISchemaElement = uischema) {
  return render(
    <JsonForms
      schema={schema}
      uischema={layout}
      data={{}}
      renderers={[...ui.displayRenderers, ...set.layoutRenderers]}
      cells={[]}
    />,
  );
}

/** jsdom does no layout: a 70px child in 16px rows, with no margin/border chrome → 5 content rows. */
function mockFiveRowContent() {
  vi.spyOn(GridStack.prototype, 'getCellHeight').mockReturnValue(16);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(16);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    height: 70,
  } as DOMRect);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Grid item sizing', () => {
  it('wraps each dispatched element in a block-level container for gridstack to measure', async () => {
    renderGrid(createGridRenderers());
    const heading = await screen.findByRole('heading', { name: 'Sized' });
    const wrapper = heading.closest('[data-slot="grid-element"]');
    expect(wrapper?.tagName).toBe('DIV');
    // It must be the item content's FIRST element child — that is the node gridstack measures.
    expect(wrapper?.parentElement).toHaveClass('grid-stack-item-content');
    expect(wrapper?.parentElement?.firstElementChild).toBe(wrapper);
  });

  it('asks gridstack to resize the item to its content once the content has rendered', async () => {
    const resizeToContent = vi.spyOn(GridStack.prototype, 'resizeToContent');
    renderGrid(createGridRenderers());
    const heading = await screen.findByRole('heading', { name: 'Sized' });
    const itemEl = heading.closest('.grid-stack-item');
    expect(itemEl).not.toBeNull();
    expect(resizeToContent).toHaveBeenCalledWith(itemEl);
  });

  it('never lets GridStack size items itself, so it cannot measure an empty item', async () => {
    const { container } = renderGrid(createGridRenderers());
    await screen.findByRole('heading', { name: 'Sized' });
    const root = container.querySelector<GridHTMLElement>('.grid-stack');
    expect(root?.gridstack?.opts.sizeToContent).toBe(false);
    // gridstack tags items it sizes itself with this class.
    expect(root?.querySelector('.grid-stack-item')).not.toHaveClass('size-to-content');
  });

  // Doc 180 rule 10d — 'min' sizing keeps the content as a floor instead of fitting exactly.
  it("keeps the content as a minimum height, not an exact fit, when sizing is 'min'", async () => {
    const resizeToContent = vi.spyOn(GridStack.prototype, 'resizeToContent');
    const update = vi.spyOn(GridStack.prototype, 'update');
    mockFiveRowContent();

    renderGrid(createGridRenderers({ components: { [GRID_ELEMENT_COMPONENT]: MinSizedItem } }));
    const heading = await screen.findByRole('heading', { name: 'Sized' });
    const itemEl = heading.closest('.grid-stack-item');

    expect(update).toHaveBeenCalledWith(itemEl, { minH: 5, h: 5 });
    expect(resizeToContent).not.toHaveBeenCalledWith(itemEl);
  });

  it('leaves item height alone when sizeToContent is turned off', async () => {
    renderGrid(createGridRenderers({ gridOptions: { sizeToContent: false } }));
    const resizeToContent = vi.spyOn(GridStack.prototype, 'resizeToContent');
    const heading = await screen.findByRole('heading', { name: 'Sized' });
    expect(heading.closest('.grid-stack-item')).not.toBeNull();
    expect(resizeToContent).not.toHaveBeenCalled();
  });
});

// Doc 180 rule 10d as amended by bug B1 — a min-sized item follows its content unless sized by hand.
describe('min-sized items after their content changes (doc 180 rule 10d, bug B1)', () => {
  let contentObservers: ResizeObserverCallback[] = [];

  beforeEach(() => {
    contentObservers = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          contentObservers.push(callback);
        }
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
    mockFiveRowContent();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Mounts one min-sized Heading item; `contentChanged` fires the item's content ResizeObserver. */
  async function mountMinItem(gridItem?: Record<string, number>) {
    const heading = {
      type: 'Heading',
      text: 'Sized',
      ...(gridItem ? { options: { gridItem } } : {}),
    };
    renderGrid(createGridRenderers({ components: { [GRID_ELEMENT_COMPONENT]: MinSizedItem } }), {
      type: 'Grid',
      elements: [heading],
    } as UISchemaElement);
    const rendered = await screen.findByRole('heading', { name: 'Sized' });
    const itemEl = rendered.closest('.grid-stack-item') as GridItemHTMLElement;
    const node = itemEl.gridstackNode as GridStackNode & { _resizing?: boolean };
    const contentChanged = () =>
      act(() => {
        for (const callback of contentObservers) callback([], {} as ResizeObserver);
      });
    return { itemEl, node, grid: node.grid as GridStack, contentChanged };
  }

  it('shrinks an item without a hand-set height when its content gets shorter', async () => {
    const { itemEl, node, grid, contentChanged } = await mountMinItem();
    // Taller than its 5-row content — e.g. a child element just moved out of this Grid.
    grid.update(itemEl, { h: 10, minH: 5 });
    const update = vi.spyOn(GridStack.prototype, 'update');

    contentChanged();

    expect(update).toHaveBeenCalledWith(itemEl, { minH: 5, h: 5 });
    expect(node.h).toBe(5);
  });

  it('shrinks back to a hand-set height, never below it', async () => {
    const { itemEl, node, grid, contentChanged } = await mountMinItem({ h: 10 });
    grid.update(itemEl, { h: 12, minH: 5 });
    const update = vi.spyOn(GridStack.prototype, 'update');

    contentChanged();

    expect(update).toHaveBeenCalledWith(itemEl, { minH: 5, h: 10 });
    expect(node.h).toBe(10);
  });

  it('makes no update while a resize gesture is in progress', async () => {
    const { itemEl, node, grid, contentChanged } = await mountMinItem();
    grid.update(itemEl, { h: 10, minH: 5 });
    const update = vi.spyOn(GridStack.prototype, 'update');

    // eslint-disable-next-line no-underscore-dangle -- gridstack's own in-progress resize flag
    node._resizing = true;
    contentChanged();
    expect(update).not.toHaveBeenCalled();

    // eslint-disable-next-line no-underscore-dangle -- gridstack's own in-progress resize flag
    node._resizing = false;
    contentChanged();
    expect(update).toHaveBeenCalledWith(itemEl, { minH: 5, h: 5 });
  });
});

describe('contentRows (doc 180 rule 10d)', () => {
  it('rounds the content plus the item chrome up to whole rows', () => {
    // 96px item, 80px content area → 16px of margin; (16 + 70) / 16 = 5.375 → 6 rows.
    expect(
      contentRows({ itemHeight: 96, contentAreaHeight: 80, childHeight: 70, cellHeight: 16 }),
    ).toBe(6);
    expect(
      contentRows({ itemHeight: 80, contentAreaHeight: 80, childHeight: 80, cellHeight: 16 }),
    ).toBe(5);
  });

  it('returns 0 when nothing is measurable (hidden item, jsdom, no cell height)', () => {
    expect(
      contentRows({ itemHeight: 0, contentAreaHeight: 0, childHeight: 0, cellHeight: 16 }),
    ).toBe(0);
    expect(
      contentRows({ itemHeight: 96, contentAreaHeight: 80, childHeight: 70, cellHeight: 0 }),
    ).toBe(0);
  });
});

describe('minHeightUpdate (doc 180 rule 10d, bug B1)', () => {
  it('raises the floor and grows an item shorter than its content, even past a hand-set height', () => {
    expect(minHeightUpdate({ h: 1 }, 6)).toStrictEqual({ minH: 6, h: 6 });
    expect(minHeightUpdate({ h: 10, minH: 6 }, 12)).toStrictEqual({ minH: 12, h: 12 });
    expect(minHeightUpdate({ h: 10, minH: 6 }, 12, 10)).toStrictEqual({ minH: 12, h: 12 });
  });

  it('shrinks an item without a hand-set height to its content', () => {
    expect(minHeightUpdate({ h: 10, minH: 8 }, 6)).toStrictEqual({ minH: 6, h: 6 });
    expect(minHeightUpdate({ h: 10, minH: 6 }, 6)).toStrictEqual({ minH: 6, h: 6 });
  });

  it('keeps a hand-set height the content fits in and shrinks back to it, never below', () => {
    expect(minHeightUpdate({ h: 10, minH: 6 }, 6, 10)).toBeNull();
    expect(minHeightUpdate({ h: 10, minH: 8 }, 6, 10)).toStrictEqual({ minH: 6 });
    expect(minHeightUpdate({ h: 12, minH: 12 }, 6, 10)).toStrictEqual({ minH: 6, h: 10 });
  });

  it('does nothing when nothing was measured', () => {
    expect(minHeightUpdate({ h: 4, minH: 4 }, 0)).toBeNull();
    expect(minHeightUpdate({ h: 4, minH: 4 }, 0, 10)).toBeNull();
  });
});
