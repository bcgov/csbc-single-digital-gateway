import { GridStackEngine, type GridStackMoveOpts, type GridStackNode } from 'gridstack';

/** The drag rect gridstack hands its engine: the dragged item's box in grid pixels. */
type DragRect = NonNullable<GridStackMoveOpts['rect']>;

/**
 * The drag rect cut down to the CURSOR (doc 243 rule 12b): its top edge, one pixel tall. The grab offset clamp keeps the
 * helper's top on the cursor, so the rect's top IS the cursor in grid pixels.
 */
export function cursorRect(rect: DragRect): DragRect {
  return { ...rect, h: 1 };
}

/**
 * The engine of every studio grid (doc 243 rule 12b, bug B1), passed as gridstack's per-grid `engineClass`.
 *
 * gridstack 13.2.0 decides WHICH grid takes a drag by the cursor (a droppable's `mouseenter`), but whether the dragged
 * item displaces a neighbour by its EDGES: `directionCollideCoverage` moves a neighbour once the dragged item's bottom
 * (from above) or top (from below) covers half of it. A tall item's leading edge is far from the cursor, so a nested
 * layout was swapped out from under the cursor — or a field beyond it pulled it up past the cursor — before the cursor
 * ever reached its grid. Only a field grabbed at its leading edge, or a short one, worked.
 *
 * Here coverage is measured from the cursor alone: a neighbour moves once the CURSOR crosses its midpoint, so a nested
 * layout always reaches the cursor — and its grid takes the drag — before anything moves it. gridstack still widens the
 * rect back to where the drag started, so neighbours the item already covered at the start are never re-displaced.
 * Re-verify against gridstack's `moveNode` / `directionCollideCoverage` on upgrade.
 */
export class GridNestEngine extends GridStackEngine {
  protected override directionCollideCoverage(
    node: GridStackNode,
    o: GridStackMoveOpts,
    collides: GridStackNode[],
  ): GridStackNode | undefined {
    const atCursor = o.rect === undefined ? o : { ...o, rect: cursorRect(o.rect) };
    return super.directionCollideCoverage(node, atCursor, collides);
  }
}
