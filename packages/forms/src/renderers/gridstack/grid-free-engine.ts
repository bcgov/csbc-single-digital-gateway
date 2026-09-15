import { GridStackEngine, type GridStackMoveOpts, type GridStackNode } from 'gridstack';
import { dragInTemplateOf } from './grid-drag-in';
import { DRAG_IN_MAX_COLUMNS, fitDropIn } from './grid-drop-fit';

/** A node with the gridstack drag flags the engine reads (not in gridstack's public types). */
type EnteringNode = GridStackNode & { _isExternal?: boolean; _temporaryRemoved?: boolean };

/**
 * The engine of every free `Grid` (doc 189 rules 21c-21d), passed as gridstack's per-grid `engineClass`. A palette
 * item is 6 columns wide as it enters — every column of a narrower Grid — and on every drag step fits the free run on
 * its row, up to 6 columns (`fitDropIn`), so the grey placeholder previews exactly where and how wide the drop lands.
 * Its arriving width is an artefact: gridstack shares one drag node between grids, and a one-column VerticalLayout
 * clamps it to 1. Items dragged in from other grids, and the grid's own items, are untouched.
 */
export class GridFreeEngine extends GridStackEngine {
  override nodeBoundFix(node: GridStackNode, resizing?: boolean): GridStackEngine {
    const { _isExternal: external, _temporaryRemoved: entering } = node as EnteringNode;
    if (external === true && entering === true && dragInTemplateOf(node) !== undefined) {
      node.w = Math.min(this.column, DRAG_IN_MAX_COLUMNS);
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
