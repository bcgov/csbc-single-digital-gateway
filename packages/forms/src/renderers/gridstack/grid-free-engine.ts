import { GridStackEngine, type GridStackMoveOpts, type GridStackNode } from 'gridstack';
import { dragInTemplateOf } from './grid-drag-in';
import { DRAG_IN_MAX_COLUMNS, fitDropIn } from './grid-drop-fit';
import { movedWidth } from './grid-move-width';

/** A node with the gridstack drag flags the engine reads (not in gridstack's public types). */
type EnteringNode = GridStackNode & { _isExternal?: boolean; _temporaryRemoved?: boolean };

/** While an item is over another grid, gridstack keeps the node it had in its source grid on the item. */
type DraggedItem = { _gridstackNodeOrig?: GridStackNode };

/** Doc 183 rule 12c: the entering node's width converted from its source grid's columns, else `undefined`. */
function arrivingWidth(node: GridStackNode, columns: number): number | undefined {
  const { _gridstackNodeOrig: source } = (node.el ?? {}) as DraggedItem;
  const fromColumns = source?.grid?.getColumn();
  if (source?.w === undefined || fromColumns === undefined) return undefined;
  return movedWidth(source.w, fromColumns, columns);
}

/**
 * The engine of every free `Grid` (doc 189 rules 21c-21d, doc 183 rule 12c), passed as gridstack's per-grid
 * `engineClass`. Both rules resize a node as it enters — gridstack's first drag step in this grid — so the grey
 * placeholder previews exactly the width the drop writes back:
 * - a palette item is 6 columns wide (every column of a narrower Grid), and on every drag step fits the free run on its
 *   row, up to 6 columns (`fitDropIn`). Its arriving width is an artefact: gridstack shares one drag node between grids,
 *   and a one-column VerticalLayout clamps it to 1;
 * - an item moved in from another layout keeps the share of its row it filled (`movedWidth`), converted from the node
 *   it had in its source grid — which gridstack keeps unchanged for the whole drag, so repeated calls never compound.
 *   A converted width that does not fit is kept; gridstack pushes the items in its way down.
 * The grid's own items are untouched.
 */
export class GridFreeEngine extends GridStackEngine {
  override nodeBoundFix(node: GridStackNode, resizing?: boolean): GridStackEngine {
    const { _isExternal: external, _temporaryRemoved: entering } = node as EnteringNode;
    if (external === true && entering === true) {
      const width =
        dragInTemplateOf(node) === undefined
          ? arrivingWidth(node, this.column)
          : Math.min(this.column, DRAG_IN_MAX_COLUMNS);
      if (width !== undefined) node.w = width;
    }
    return super.nodeBoundFix(node, resizing);
  }

  override moveNodeCheck(node: GridStackNode, o: GridStackMoveOpts): boolean {
    if (!o.resizing && dragInTemplateOf(node) !== undefined) {
      const others = this.nodes
        .filter((other) => other !== node)
        .map(({ x = 0, y = 0, w = 1, h = 1 }) => ({ x, y, w, h }));
      const fit = fitDropIn({ x: o.x ?? node.x ?? 0, y: o.y ?? node.y ?? 0 }, others, this.column);
      o.x = fit.x;
      o.w = fit.w;
    }
    return super.moveNodeCheck(node, o);
  }
}
