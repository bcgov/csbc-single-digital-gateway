/** Horizontal distance between neighbouring node centres in one rank. */
export const COLUMN_WIDTH = 280;
/** Vertical distance between the tops of two ranks. */
export const RANK_HEIGHT = 160;

export interface LayoutSlot {
  /** The node's CENTRE, in canvas pixels. */
  x: number;
  rank: number;
}

/**
 * A synchronous layered layout for a small DAG drawn top to bottom. A node's rank is its longest path from a root.
 * Rank 0 is spread in `order`; every later node aims for the slot its parent's outputs give it — a parent's children
 * fan out around its centre in OUTPUT order, a merge averages its parents — then each rank is swept left to right to
 * keep a column apart and re-centred on where its nodes wanted to be.
 *
 * `children` lists each node's children in output order; a cycle is broken rather than followed.
 */
export function layeredLayout(
  order: readonly string[],
  children: ReadonlyMap<string, readonly string[]>,
): Map<string, LayoutSlot> {
  const ranks = ranksOf(order, children);
  const byRank: string[][] = [];
  for (const id of order) (byRank[ranks.get(id)!] ??= []).push(id);

  const slots = new Map<string, LayoutSlot>();
  byRank.forEach((ids, rank) => {
    const wanted = ids.map((id, i) =>
      rank === 0 ? (i - (ids.length - 1) / 2) * COLUMN_WIDTH : wantedX(id, slots, children),
    );
    const sorted = ids
      .map((id, i) => ({ id, want: wanted[i]!, i }))
      .toSorted((a, b) => a.want - b.want || a.i - b.i);
    let previous = -Infinity;
    const placed = sorted.map(({ id, want }) => {
      previous = Math.max(want, previous + COLUMN_WIDTH);
      return { id, want, x: previous };
    });
    const shift = mean(placed.map((p) => p.want)) - mean(placed.map((p) => p.x));
    for (const { id, x } of placed) slots.set(id, { x: x + shift, rank });
  });
  return slots;
}

/** Where `id` wants to sit: averaged over the parents already placed, fanned out by its output position. */
function wantedX(
  id: string,
  slots: ReadonlyMap<string, LayoutSlot>,
  children: ReadonlyMap<string, readonly string[]>,
): number {
  const offers: number[] = [];
  for (const [parent, kids] of children) {
    const slot = slots.get(parent);
    const i = kids.indexOf(id);
    if (slot !== undefined && i !== -1)
      offers.push(slot.x + (i - (kids.length - 1) / 2) * COLUMN_WIDTH);
  }
  return offers.length === 0 ? 0 : mean(offers);
}

/** Longest path from a root, for every node in `order`. */
function ranksOf(
  order: readonly string[],
  children: ReadonlyMap<string, readonly string[]>,
): Map<string, number> {
  const parents = new Map<string, string[]>(order.map((id) => [id, []]));
  for (const [parent, kids] of children) for (const kid of kids) parents.get(kid)?.push(parent);
  const ranks = new Map<string, number>();
  const visiting = new Set<string>();
  const rankOf = (id: string): number => {
    const known = ranks.get(id);
    if (known !== undefined) return known;
    visiting.add(id);
    const above = (parents.get(id) ?? []).filter((p) => !visiting.has(p)).map((p) => rankOf(p) + 1);
    visiting.delete(id);
    const rank = Math.max(0, ...above);
    ranks.set(id, rank);
    return rank;
  };
  for (const id of order) rankOf(id);
  return ranks;
}

const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;
