import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { GridStack, type GridHTMLElement } from 'gridstack';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RendererSet } from '../src/index';
import { createGridRenderers } from '../src/renderers-gridstack';
import * as ui from '../src/renderers-ui';

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

  it('leaves item height alone when sizeToContent is turned off', async () => {
    renderGrid(createGridRenderers({ gridOptions: { sizeToContent: false } }));
    const resizeToContent = vi.spyOn(GridStack.prototype, 'resizeToContent');
    const heading = await screen.findByRole('heading', { name: 'Sized' });
    expect(heading.closest('.grid-stack-item')).not.toBeNull();
    expect(resizeToContent).not.toHaveBeenCalled();
  });
});
