import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { GridStack, type GridHTMLElement } from 'gridstack';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

function renderGrid(set: RendererSet) {
  return render(
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={{}}
      renderers={[...ui.displayRenderers, ...set.layoutRenderers]}
      cells={[]}
    />,
  );
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
    // jsdom does no layout: a 70px child in 16px rows, with no margin/border chrome.
    vi.spyOn(GridStack.prototype, 'getCellHeight').mockReturnValue(16);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(16);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      height: 70,
    } as DOMRect);

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

describe('minHeightUpdate (doc 180 rule 10d)', () => {
  it('raises the floor and grows an item shorter than its content', () => {
    expect(minHeightUpdate({ h: 1 }, 6)).toStrictEqual({ minH: 6, h: 6 });
    expect(minHeightUpdate({ h: 10, minH: 6 }, 12)).toStrictEqual({ minH: 12, h: 12 });
  });

  it('keeps an item that was made taller by hand', () => {
    expect(minHeightUpdate({ h: 10, minH: 6 }, 6)).toBeNull();
  });

  it('lowers the floor without shrinking when the content gets shorter', () => {
    expect(minHeightUpdate({ h: 10, minH: 8 }, 6)).toStrictEqual({ minH: 6 });
  });

  it('does nothing when nothing was measured', () => {
    expect(minHeightUpdate({ h: 4, minH: 4 }, 0)).toBeNull();
  });
});
