import { GridStackEngine, type GridStackMoveOpts, type GridStackNode } from 'gridstack';
import { arrivalWidth, fitWidths, type RowJustify } from '../default/row-placement';
import { cursorCell } from './grid-cell-engine';

/** A node with the gridstack drag flags the engine reads (not in gridstack's public types). */
type EnteringNode = GridStackNode & { _isExternal?: boolean; _temporaryRemoved?: boolean };

/**
 * The engine of every studio HorizontalLayout (doc 261 rule 9), passed as gridstack's per-grid `engineClass`. A row has
 * no free placement: whatever gridstack asks, every node is REPACKED on line 0 in order, with no holes — a drag only
 * reorders (by the cursor's column), a resize only changes a width (room made from the widest others, `fitWidths`), and
 * an arrival takes `arrivalWidth`. gridstack's own collision handling (push down, swap) never runs. Re-verify against
 * `addNode`, `willItFit`, `nodeBoundFix` and `moveNodeCheck` on upgrade.
 */
export class GridRowEngine extends GridStackEngine {
  /** How the packed group sits in the row (rule 3) — set by the hook after init; gridstack builds the engine. */
  justify: RowJustify = 'stretch';

  /** Rule 9: an arrival is `arrivalWidth` wide and one row tall, for the whole drag. */
  override nodeBoundFix(node: GridStackNode, resizing?: boolean): GridStackEngine {
    const { _isExternal: external, _temporaryRemoved: entering } = node as EnteringNode;
    if (external === true || entering === true) {
      node.w = arrivalWidth(this.others(node).length, this.column);
      node.h = 1;
    }
    return super.nodeBoundFix(node, resizing);
  }

  /** Rule 12: a row takes an arrival while it has fewer children than columns — whatever size the arrival came at. */
  override willItFit(node: GridStackNode): boolean {
    return this.others(node).length < this.column;
  }

  /**
   * An ARRIVAL (a drag entering the row) joins at the end, the others made room for — never pushed to a second line. The
   * row's own items, loaded at their rendered positions, are added as they are: gridstack loads them before the hook
   * can tell the engine the Distribution, so repacking them here would ignore it.
   */
  override addNode(
    node: GridStackNode,
    triggerAddEvent?: boolean,
    after?: GridStackNode,
  ): GridStackNode {
    const { _isExternal: external, _temporaryRemoved: entering } = node as EnteringNode;
    if (external === true || entering === true)
      this.repack([...this.ordered(), node], node, node.w ?? 1);
    return super.addNode(node, triggerAddEvent, after);
  }

  override moveNodeCheck(node: GridStackNode, o: GridStackMoveOpts): boolean {
    const order = this.ordered();
    let width = node.w ?? 1;
    if (o.resizing === true) width = o.w ?? width;
    // A drag reorders: the node goes before the first other item whose centre is right of the cursor's column.
    let index = order.indexOf(node);
    if (o.resizing !== true) {
      const others = order.filter((other) => other !== node);
      const column =
        o.rect !== undefined && o.cellWidth ? cursorCell(o.rect, o.cellWidth, 1).x : (o.x ?? 0);
      index = others.filter((other) => (other.x ?? 0) + (other.w ?? 1) / 2 <= column).length;
      order.splice(order.indexOf(node), 1);
      order.splice(index, 0, node);
    }
    const before = this.nodes.map(({ x, w }) => `${x}:${w}`).join();
    if (!this.repack(order, node, width)) return false;
    if (this.nodes.map(({ x, w }) => `${x}:${w}`).join() === before) return false;
    // gridstack writes the DOM for the nodes marked dirty when its engine notifies (both internal, so by name).
    for (const other of this.nodes) Reflect.set(other, '_dirty', true);
    (Reflect.get(this, '_notify') as () => void).call(this);
    return true;
  }

  /** The nodes other than `node`. */
  private others(node: GridStackNode): GridStackNode[] {
    return this.nodes.filter((other) => other !== node);
  }

  /** Every node in its current order, left to right (an arrival not yet added is not among them). */
  private ordered(): GridStackNode[] {
    return this.nodes.toSorted((a, b) => (a.x ?? 0) - (b.x ?? 0));
  }

  /**
   * Lays `order` out on line 0 (rule 3), `node` at `width` and the others made room for (`fitWidths`, locked nodes never
   * shrunk). `false`, changing nothing, when there is no room.
   */
  private repack(order: GridStackNode[], node: GridStackNode, width: number): boolean {
    const widths = order.map((other) => (other === node ? width : (other.w ?? 1)));
    const fixed = new Set(
      order.flatMap((other, i) => (other === node || other.locked === true ? [i] : [])),
    );
    const fitted = fitWidths(widths, this.column, fixed);
    if (fitted === undefined) return false;
    const free = this.column - fitted.reduce((sum, w) => sum + w, 0);
    let x = this.justify === 'end' ? free : this.justify === 'center' ? Math.floor(free / 2) : 0;
    order.forEach((other, i) => {
      const w = fitted[i] ?? 1;
      Object.assign(other, { x, y: 0, w, h: 1 });
      x += w;
    });
    return true;
  }
}
