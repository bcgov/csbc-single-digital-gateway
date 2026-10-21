import type { CSSProperties } from 'react';
import { cellsOf, type GridPlacement, type GridRect } from '../default/grid-placement';

/** 4px outside the content box on every side — where an element's `outline-offset-4` frame is (rule 17d). */
const FRAME_SIZED = '-m-1 size-[calc(100%+0.5rem)]';

/** A cell's box, from the CSS variables gridstack positions its own items by — so the two always line up. */
const cellStyle = (x: number, y: number): CSSProperties => ({
  top: `calc(${y} * var(--gs-cell-height))`,
  left: `calc(${x} * var(--gs-column-width))`,
  width: 'var(--gs-column-width)',
  height: 'var(--gs-cell-height)',
  padding:
    'var(--gs-item-margin-top) var(--gs-item-margin-right) var(--gs-item-margin-bottom) var(--gs-item-margin-left)',
});

/**
 * A Grid's drop targets (doc 260 rules 15-17): one box under every cell, BEHIND the items — not `.grid-stack-item`s, so
 * gridstack never manages them. While `showing`, every cell no other item covers draws a dashed target (the dragged
 * item's own cells included); `outlined` draws every free cell's outline at rest, so an editable Grid's empty cells read as
 * cells, not as padding below its children (rule 17b).
 */
export function GridCells({
  placement,
  showing,
  outlined,
  dragged,
  live,
}: {
  placement: GridPlacement;
  showing: boolean;
  outlined: boolean;
  /** The key of an item of this Grid being dragged: its cells are free. */
  dragged: string | null;
  /** Every item's live rectangle while one of them moves (rule 17c) — what is taken, instead of the placement. */
  live: ReadonlyMap<string, GridRect> | null;
}) {
  // The DRAGGED item's cells — where it came from, and (live) where gridstack's placeholder now is — keep their target,
  // so the landing cell darkens under the placeholder as a palette drop's does. A RESIZING item (never `dragged`) covers
  // its live cells (rule 17c).
  const occupied =
    live === null
      ? placement.items.filter((item) => item.key !== dragged)
      : [...live].filter(([key]) => key !== dragged).map(([, rect]) => rect);
  const taken = new Set(occupied.flatMap((rect) => cellsOf(rect).map(({ x, y }) => `${x},${y}`)));
  const cells = cellsOf({ x: 0, y: 0, w: placement.columns, h: placement.effectiveRows });
  return (
    <div
      aria-hidden
      data-slot="studio-grid-cells"
      data-showing={showing ? '' : undefined}
      className="pointer-events-none absolute inset-0"
    >
      {cells.map(({ x, y }) => {
        const free = !taken.has(`${x},${y}`);
        const target = showing && free;
        return (
          <div
            key={`${x},${y}`}
            data-slot="studio-grid-cell"
            data-x={x}
            data-y={y}
            data-target={target ? '' : undefined}
            className="absolute"
            style={cellStyle(x, y)}
          >
            <div
              // A target is the vertical layout's drop colour — gridstack's placeholder, rgba(0, 0, 0, 0.1). Both
              // targets and outlines sit where an element's frame does: 4px outside the content box
              // (`outline-offset-4`), square like it (rule 17d).
              className={`${
                target
                  ? FRAME_SIZED + ' bg-black/10'
                  : outlined && free
                    ? FRAME_SIZED + ' border border-dashed border-border'
                    : ''
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}
