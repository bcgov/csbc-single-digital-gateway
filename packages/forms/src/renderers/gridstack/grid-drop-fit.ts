// Fitting a palette item dropped into a Grid to the free space on its row (doc 189 rule 21d). Pure, so the grid's
// engine previews exactly what the studio writes to the document.

/** The widest a palette item lands in a Grid, in columns. */
export const DRAG_IN_MAX_COLUMNS = 6;

/** An item's placement on the grid; an absent `h` counts as one row. */
interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h?: number | undefined;
}

/**
 * Where a palette item dropped at `drop` lands, and how wide. The row is the `others` spanning the drop's top line; its
 * free run starts where the items starting left of the drop end (else 0) and ends at the first item at or after that
 * start (else the grid edge). The item takes up to 6 columns of the run, at the drop's `x` kept inside it. With no free
 * run it is 6 wide — every column of a narrower grid — at its `x` kept inside the grid, and gridstack makes room below.
 */
export function fitDropIn(
  drop: { readonly x: number; readonly y: number },
  others: readonly Box[],
  columns: number,
): { x: number; w: number } {
  const widest = Math.min(DRAG_IN_MAX_COLUMNS, columns);
  const onRow = others.filter((n) => n.y <= drop.y && drop.y < n.y + (n.h ?? 1));
  const start = onRow.filter((n) => n.x < drop.x).reduce((end, n) => Math.max(end, n.x + n.w), 0);
  const end = onRow.filter((n) => n.x >= start).reduce((edge, n) => Math.min(edge, n.x), columns);
  const room = Math.min(end, columns) - start;
  if (room < 1) return { x: Math.max(0, Math.min(drop.x, columns - widest)), w: widest };

  const w = Math.min(widest, room);
  return { x: Math.min(Math.max(drop.x, start), start + room - w), w };
}
