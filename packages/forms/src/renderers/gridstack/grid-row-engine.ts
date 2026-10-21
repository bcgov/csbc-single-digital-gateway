import { GridStackEngine, type GridStackMoveOpts, type GridStackNode } from 'gridstack';

type EngineOptions = NonNullable<ConstructorParameters<typeof GridStackEngine>[0]>;

/** A node with the gridstack drag flags the row engine reads and writes (not in gridstack's public types). */
type RowNode = GridStackNode & {
  _dirty?: boolean;
  _isExternal?: boolean;
  _temporaryRemoved?: boolean;
};

const xOf = (node: GridStackNode) => node.x ?? 0;
const widthOf = (node: GridStackNode) => node.w ?? 1;
const centreOf = (node: GridStackNode, x = xOf(node)) => x + widthOf(node) / 2;
const byX = (a: GridStackNode, b: GridStackNode) => xOf(a) - xOf(b);

/** An item dragged in from another grid that has not been placed in this one yet. */
function isEntering(node: GridStackNode): boolean {
  const { _isExternal: external, _temporaryRemoved: removed } = node as RowNode;
  return external === true && removed === true;
}

/** Marks `node` so gridstack repositions its DOM on the next change notification. */
function markDirty(node: GridStackNode): void {
  // eslint-disable-next-line no-underscore-dangle -- gridstack's own dirty flag; no public API
  (node as RowNode)._dirty = true;
}

/**
 * The engine of every HorizontalLayout grid (doc 180 rule 30b), passed as gridstack's per-grid
 * `engineClass`. After every change it restores one invariant: all items at `y: 0`, each `x` the sum of
 * the widths before it. gridstack's default engine resolves a collision by pushing an item onto a second
 * line; here items only ever shift sideways, and an item dragged in from another grid takes width 1 as it
 * enters, so the drag previews exactly the row the drop writes back (doc 183 rule 12b).
 */
export class GridRowEngine extends GridStackEngine {
  // gridstack's DOM callback; `_notify` is internal, so the row engine keeps its own reference.
  private readonly notifyChange: EngineOptions['onChange'];

  constructor(opts: EngineOptions = {}) {
    super(opts);
    this.notifyChange = opts.onChange;
  }

  /** An item entering from another grid is width 1 before gridstack places it; the row's own keep theirs. */
  override nodeBoundFix(node: GridStackNode, resizing?: boolean): GridStackEngine {
    if (isEntering(node)) node.w = 1;
    return super.nodeBoundFix(node, resizing);
  }

  /** The added node goes in at its `x` — before any item at the same `x` — and the rest shift right. */
  override addNode(
    node: GridStackNode,
    triggerAddEvent?: boolean,
    after?: GridStackNode,
  ): GridStackNode {
    const added = super.addNode(node, triggerAddEvent, after);
    const others = this.nodes.filter((n) => n !== added).toSorted(byX);
    const index = others.filter((n) => xOf(n) < xOf(added)).length;
    if (this.layRow(others.toSpliced(index, 0, added))) this.notify();
    return added;
  }

  /** Removing an item — or dragging it out — closes the gap it leaves. */
  override removeNode(
    node: GridStackNode,
    removeDOM?: boolean,
    triggerEvent?: boolean,
  ): GridStackEngine {
    super.removeNode(node, removeDOM, triggerEvent);
    if (this.layRow(this.nodes.toSorted(byX))) this.notify();
    return this;
  }

  /** Every drag and resize step: reorder or resize within the row, never through collision handling. */
  override moveNodeCheck(node: GridStackNode, o: GridStackMoveOpts): boolean {
    return o.resizing ? this.resizeInRow(node, o) : this.moveInRow(node, o);
  }

  /** Re-inserts `node` before the first other item whose centre lies right of its centre at the pointer. */
  private moveInRow(node: GridStackNode, o: GridStackMoveOpts): boolean {
    const centre = centreOf(node, o.x ?? xOf(node));
    const others = this.nodes.filter((n) => n !== node).toSorted(byX);
    const index = others.filter((n) => centreOf(n) < centre).length;
    const moved = this.layRow(others.toSpliced(index, 0, node));
    if (moved) this.notify();
    return moved;
  }

  /** Clamps the new width to the columns the other items leave free; neighbours shift sideways. */
  private resizeInRow(node: GridStackNode, o: GridStackMoveOpts): boolean {
    const othersWidth = this.nodes.reduce((sum, n) => (n === node ? sum : sum + widthOf(n)), 0);
    const w = Math.max(1, Math.min(o.w ?? widthOf(node), this.column - othersWidth));
    if (w === node.w) return false;
    node.w = w;
    markDirty(node);
    this.layRow(this.nodes.toSorted(byX));
    this.notify();
    return true;
  }

  /**
   * Places `order` side by side from column 0 on line 0, marking each moved item dirty. A row whose widths
   * overflow its columns is left to gridstack (doc 180 rule 28's wrap case). Returns whether anything moved.
   */
  private layRow(order: readonly GridStackNode[]): boolean {
    if (order.reduce((sum, n) => sum + widthOf(n), 0) > this.column) return false;
    let x = 0;
    let moved = false;
    for (const node of order) {
      if (node.x !== x || node.y !== 0) {
        node.x = x;
        node.y = 0;
        markDirty(node);
        moved = true;
      }
      x += widthOf(node);
    }
    return moved;
  }

  /** Hands the dirty items to gridstack so their DOM positions follow; deferred while batching (load). */
  private notify(): void {
    if (!this.batchMode) this.notifyChange?.(this.getDirtyNodes());
  }
}
