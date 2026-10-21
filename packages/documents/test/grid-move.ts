import { act } from '@testing-library/react';
import type { GridItemHTMLElement, GridStack, GridStackNode } from 'gridstack';

export type Grid = HTMLElement & { gridstack: GridStack };

/** gridstack's registered handlers: private, and the only way to reach them without a real drag (jsdom can't drag). */
export const handlersOf = (grid: Grid) =>
  // eslint-disable-next-line no-underscore-dangle -- gridstack's private handler map
  (grid.gridstack as unknown as { _gsEventHandler: Record<string, Function> })._gsEventHandler;

/** gridstack's `change` handler ignores an event without `detail` — the changed nodes — so a test must send them. */
export const changeEvent = (nodes: readonly GridStackNode[]) =>
  new CustomEvent('change', { detail: [...nodes] });

/**
 * What gridstack 13.2.0 does when `item` is dropped from `source` into `target` at row `y` (gridstack.js 2585-2657):
 * the source loses the node and fires `change`, the real item element moves into the target as a new node, the target
 * fires `change`, then `dropped(event, origNode, node)` with `origNode.grid` the source.
 */
export function dropFrom(source: Grid, target: Grid, item: GridItemHTMLElement, y: number) {
  const origNode = item.gridstackNode!;
  act(() => {
    source.gridstack.engine.removeNode(origNode, false, false);
    handlersOf(source)['change']?.(changeEvent(source.gridstack.engine.nodes));
  });
  item.remove();
  // By `dropped`, the item carries the TARGET's node (gridstack re-prepares it); the source's is `origNode`.
  delete item.gridstackNode;
  target.appendChild(item);
  const node = target.gridstack.makeWidget(item, {
    x: 0,
    y,
    w: 1,
    h: 1,
    ...(origNode.id !== undefined && { id: origNode.id }),
  }).gridstackNode as GridStackNode;
  act(() => {
    handlersOf(target)['change']?.(changeEvent(target.gridstack.engine.nodes));
    handlersOf(target)['dropped']!(
      new Event('dropped'),
      { ...origNode, grid: source.gridstack },
      node,
    );
  });
  return item;
}
