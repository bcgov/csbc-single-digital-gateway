import { GridStackEngine, type GridStackMoveOpts, type GridStackNode } from 'gridstack';

/** A node with the gridstack drag flags the engine reads (not in gridstack's public types). */
type EnteringNode = GridStackNode & { _isExternal?: boolean; _temporaryRemoved?: boolean };

/** Where gridstack's `willItFit` records the slot it found on a node (not in its public types). */
const WILL_FIT_POS = '_willFitPos';

/** The cell under the cursor (doc 260 rule 12): the grab offset clamp keeps the drag rect's top-left on it. */
export function cursorCell(
  rect: NonNullable<GridStackMoveOpts['rect']>,
  cellWidth: number,
  cellHeight: number,
): { x: number; y: number } {
  return { x: Math.floor((rect.x ?? 0) / cellWidth), y: Math.floor((rect.y ?? 0) / cellHeight) };
}

/**
 * The engine of every studio Grid (doc 260 rules 10-12), passed as gridstack's per-grid `engineClass`. A move or resize
 * that overlaps another item moves it out of the way (`makeRoom`) inside the Grid's fixed rows; one that would leave the
 * Grid, or that leaves an overlapped item nowhere to go, is refused. The target cell is the one under the CURSOR, and an
 * arrival is one cell. Re-verify against `moveNodeCheck`, `willItFit` and `_dragOrResize` on upgrade.
 */
export class GridCellEngine extends GridStackEngine {
  /** Rule 11: an item arriving from another grid or the palette is one cell, for the whole drag. */
  override nodeBoundFix(node: GridStackNode, resizing?: boolean): GridStackEngine {
    const { _isExternal: external, _temporaryRemoved: entering } = node as EnteringNode;
    if (external === true || entering === true) {
      node.w = 1;
      node.h = 1;
    }
    return super.nodeBoundFix(node, resizing);
  }

  /**
   * Whether an arrival fits (rule 11b): gridstack's droppable asks this BEFORE `acceptWidgets`, with the node at its
   * SOURCE size — a palette item is 10 rows, a vertical layout's item its height in 4px rows — so every drop into a
   * small Grid was refused. An arrival is always one cell.
   */
  override willItFit(node: GridStackNode): boolean {
    const arrival = { ...node, w: 1, h: 1 };
    const fits = super.willItFit(arrival);
    // gridstack records the slot it found on the node it was given, and `onDrag` reads it from ITS node.
    const found: unknown = Reflect.get(arrival, WILL_FIT_POS);
    if (found === undefined) Reflect.deleteProperty(node, WILL_FIT_POS);
    else Reflect.set(node, WILL_FIT_POS, found);
    return fits;
  }

  override moveNodeCheck(node: GridStackNode, o: GridStackMoveOpts): boolean {
    if (o.resizing !== true && o.rect !== undefined && o.cellWidth && o.cellHeight) {
      const cell = cursorCell(o.rect, o.cellWidth, o.cellHeight);
      o.x = cell.x;
      o.y = cell.y;
    }
    const [x, y] = [o.x ?? node.x ?? 0, o.y ?? node.y ?? 0];
    const [w, h] = [o.w ?? node.w ?? 1, o.h ?? node.h ?? 1];
    // Never out of the Grid (rule 10).
    if (x < 0 || y < 0 || x + w > this.column || y + h > (this.maxRow ?? Infinity)) return false;
    const target = { x, y, w, h };
    const collided = this.nodes.filter(
      (other) => other !== node && overlaps(target, areaOf(other)),
    );
    if (collided.length > 0) {
      const room = makeRoom(this.nodes, node, target, collided, this.column, this.maxRow ?? y + h);
      if (room === undefined || collided.some((other) => other.locked === true)) return false;
      for (const [other, cell] of room) Object.assign(other, cell, { _dirty: true });
    }
    return super.moveNodeCheck(node, o);
  }
}

type Area = { x: number; y: number; w: number; h: number };

function areaOf(node: GridStackNode): Area {
  return { x: node.x ?? 0, y: node.y ?? 0, w: node.w ?? 1, h: node.h ?? 1 };
}

function overlaps(a: Area, b: Area): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * Where each item `node` would overlap at `target` goes instead (rule 10): the free spot of its size nearest where it is
 * now, the cells `node` leaves counting as free and winning a tie — so two same-sized items swap. `undefined` when one
 * of them fits nowhere: the move is refused. gridstack's own displacement only pushes down when `float` is on (no swap)
 * and a Grid's rows are fixed, so it refused most overlaps.
 */
export function makeRoom(
  nodes: readonly GridStackNode[],
  node: GridStackNode,
  target: Area,
  collided: readonly GridStackNode[],
  columns: number,
  rows: number,
): Map<GridStackNode, { x: number; y: number }> | undefined {
  const placed: Area[] = [
    target,
    ...nodes.filter((n) => n !== node && !collided.includes(n)).map(areaOf),
  ];
  const origin = areaOf(node);
  const room = new Map<GridStackNode, { x: number; y: number }>();
  for (const other of collided) {
    const { w, h, x: fromX, y: fromY } = areaOf(other);
    let best: { x: number; y: number; cost: number } | undefined;
    for (let y = 0; y + h <= rows; y++)
      for (let x = 0; x + w <= columns; x++) {
        const spot = { x, y, w, h };
        if (placed.some((area) => overlaps(spot, area))) continue;
        // Distance from where it is, minus a half step for landing in the cells `node` leaves.
        const cost = Math.abs(x - fromX) + Math.abs(y - fromY) - (overlaps(spot, origin) ? 0.5 : 0);
        if (best === undefined || cost < best.cost) best = { x, y, cost };
      }
    if (best === undefined) return undefined;
    room.set(other, { x: best.x, y: best.y });
    placed.push({ x: best.x, y: best.y, w, h });
  }
  return room;
}
