import { GridStackEngine, type GridStackMoveOpts, type GridStackNode } from 'gridstack';
import { DDManager } from 'gridstack/dist/dd-manager';

/** The row unit a vertical layout counts item heights in, in px (doc 236 rule 28). */
export const VERTICAL_CELL_HEIGHT = 4;

/** A node with the gridstack drag flags the engine reads (not in gridstack's public types). */
type EnteringNode = GridStackNode & { _isExternal?: boolean; _temporaryRemoved?: boolean };

/**
 * How many rows an item dragged in from ANOTHER grid takes here (doc 260 bug B2): its laid-out height in this grid's
 * rows. gridstack keeps the source's `h`, in the source's units — a Grid item is 1-2 rows of its own, so it arrived 4-8px
 * tall, and gridstack's placeholder (inset by the margin on every side) drew nothing: no drop indicator. `offsetHeight`,
 * not the bounding rect, so xyflow's zoom does not scale it. `undefined` for a palette item, which carries its own size.
 */
export function arrivingRows(dragged: HTMLElement | undefined): number | undefined {
  if (dragged === undefined || dragged.hasAttribute('data-palette-item')) return undefined;
  if (!dragged.classList.contains('grid-stack-item')) return undefined;
  return Math.max(1, Math.ceil(dragged.offsetHeight / VERTICAL_CELL_HEIGHT));
}

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
/**
 * The row an ARRIVAL takes (doc 260 bug B3): gridstack inserts an item entering a grid at the cursor's row and pushes
 * whatever it collides with DOWN. When that row falls in a neighbour's lower half — the cursor just leaving a nested
 * layout below or beside its bottom — the neighbour was pushed under the cursor, the cursor entered it, the arrival
 * left this grid, the neighbour sprang back, the cursor left it… every mouse move: the layouts vibrated. In a
 * neighbour's lower half the arrival goes AFTER it; in its upper half before it (the neighbour moves away from the
 * cursor) — the same midpoint rule `directionCollideCoverage` applies to a drag already in this grid.
 */
export function arrivalRow(nodes: readonly GridStackNode[], node: GridStackNode): number {
  const y = node.y ?? 0;
  const hit = nodes.find(
    (other) => other !== node && y >= (other.y ?? 0) && y < (other.y ?? 0) + (other.h ?? 1),
  );
  if (hit === undefined) return y;
  const [top, h] = [hit.y ?? 0, hit.h ?? 1];
  return y >= top + h / 2 ? top + h : top;
}

export class GridNestEngine extends GridStackEngine {
  /** An arrival never pushes a neighbour under the cursor (bug B3). */
  override addNode(
    node: GridStackNode,
    triggerAddEvent?: boolean,
    after?: GridStackNode,
  ): GridStackNode {
    const { _isExternal: external, _temporaryRemoved: entering } = node as EnteringNode;
    if (external === true || entering === true) node.y = arrivalRow(this.nodes, node);
    return super.addNode(node, triggerAddEvent, after);
  }

  /** An item entering from another grid is as tall here as it is on screen (bug B2). */
  override nodeBoundFix(node: GridStackNode, resizing?: boolean): GridStackEngine {
    const { _isExternal: external, _temporaryRemoved: entering } = node as EnteringNode;
    if (external === true && entering === true) {
      const drag = DDManager.dragElement as { el?: HTMLElement } | undefined;
      const rows = arrivingRows(drag?.el);
      if (rows !== undefined) node.h = rows;
    }
    return super.nodeBoundFix(node, resizing);
  }

  protected override directionCollideCoverage(
    node: GridStackNode,
    o: GridStackMoveOpts,
    collides: GridStackNode[],
  ): GridStackNode | undefined {
    const atCursor = o.rect === undefined ? o : { ...o, rect: cursorRect(o.rect) };
    return super.directionCollideCoverage(node, atCursor, collides);
  }
}
