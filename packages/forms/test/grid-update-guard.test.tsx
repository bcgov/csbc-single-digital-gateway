import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import {
  GridStack,
  type GridHTMLElement,
  type GridItemHTMLElement,
  type GridStackNode,
  type GridStackWidget,
} from 'gridstack';
import { describe, expect, it } from 'vitest';
import { createGridRenderers } from '../src/renderers-gridstack';
import * as ui from '../src/renderers-ui';
import {
  GRID_UPDATE_GUARD,
  installGridUpdateGuard,
} from '../src/renderers/gridstack/grid-update-guard';

// Doc 183 rule 15b, bug B2 — dragging an item into a nested Grid and back out crashed the page with
// "Maximum call stack size exceeded" in Utils.cloneDeep, inside <GridStackItem>.

const schema: JsonSchema = { type: 'object', properties: {} };

const uischema = {
  type: 'Grid',
  elements: [{ type: 'Heading', text: 'Dragged', options: { gridItem: { w: 6 } } }],
} as UISchemaElement;

/** What gridstack/dist/react `GridStackItem` passes to `grid.update`: the live node plus its id. */
const liveOptions = (
  node: GridStackNode,
  extra: Partial<GridStackWidget> = {},
): GridStackWidget => ({
  ...node,
  id: String(node.id),
  ...extra,
});

/** A mounted grid item whose engine node carries what gridstack keeps on it mid-drag. */
async function renderDraggingItem() {
  const { container } = render(
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={{}}
      renderers={[...ui.displayRenderers, ...createGridRenderers().layoutRenderers]}
      cells={[]}
    />,
  );
  const heading = await screen.findByRole('heading', { name: 'Dragged' });
  const itemEl = heading.closest('.grid-stack-item') as GridItemHTMLElement;
  const node = itemEl.gridstackNode as GridStackNode;
  // gridstack.js _dragOrResize keeps the drag event on the node — a copy whose `target` is the item
  // element, and that element's `gridstackNode` is this node: a cycle Utils.cloneDeep follows.
  const event = { type: 'drag', target: itemEl };
  Object.assign(node, { _event: event, _lastTried: { x: 0, y: 0, w: 6 } });
  const grid = (container.querySelector('.grid-stack') as GridHTMLElement).gridstack as GridStack;
  return { itemEl, node, grid, event };
}

describe('grid.update guard (doc 183 rule 15b, bug B2)', () => {
  it('does not overflow the stack when an item is updated with its live, mid-drag node', async () => {
    const { itemEl, node, grid } = await renderDraggingItem();

    expect(() => grid.update(itemEl, liveOptions(node))).not.toThrow();
  });

  it('still applies the public fields and leaves the drag-time fields on the node', async () => {
    const { itemEl, node, grid, event } = await renderDraggingItem();

    grid.update(itemEl, liveOptions(node, { w: 4 }));

    expect(node.w).toBe(4);
    expect(Reflect.get(node, '_event')).toBe(event);
  });

  it('wraps GridStack.prototype.update once, however often it is installed', () => {
    installGridUpdateGuard();
    const guarded = GridStack.prototype.update as GridStack['update'] & {
      [GRID_UPDATE_GUARD]?: true;
    };

    installGridUpdateGuard();
    createGridRenderers();

    expect(guarded[GRID_UPDATE_GUARD]).toBe(true);
    expect(GridStack.prototype.update).toBe(guarded);
  });
});
