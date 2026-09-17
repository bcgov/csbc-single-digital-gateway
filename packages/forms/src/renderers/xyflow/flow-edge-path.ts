import type { RoutePoint } from './flow-elk';

// The square path an edge takes along the route ELK gave it (doc 198 rule 33). PURE — no React, no @xyflow/react.

/** An edge ELK drew straight has no bend points, and its two ends are all the component needs. */
export const isRouted = (points: readonly RoutePoint[]): boolean => points.length > 0;

/** The corners the drawn path actually turns, from the source through ELK's bends to the target. */
function corners(
  source: RoutePoint,
  target: RoutePoint,
  points: readonly RoutePoint[],
): RoutePoint[] {
  const path: RoutePoint[] = [source];
  let current = source;
  for (const point of [...points, target]) {
    // Down to the next row first, then across: a vertical run stays in the lane, and the turn happens between ranks.
    path.push({ x: current.x, y: point.y }, point);
    current = point;
  }
  return path;
}

/**
 * Doc 198 rule 33b: the point HALFWAY ALONG the drawn path, by length — what the edge's + hangs on.
 *
 * A bend point is not the middle of anything: on a route that leaves its column early, the middle bend sits near one
 * end, and the + drifted off centre with it (user report 2026-09-17). Walking the corners and stopping at half the
 * total length puts it where a reader expects, whatever shape the route takes.
 */
export function routeMidpoint(
  source: RoutePoint,
  target: RoutePoint,
  points: readonly RoutePoint[],
): RoutePoint {
  const path = corners(source, target, points);
  const lengths = path.slice(1).map((point, index) => {
    const previous = path[index] as RoutePoint;
    return Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y);
  });
  const half = lengths.reduce((total, length) => total + length, 0) / 2;

  let walked = 0;
  for (const [index, length] of lengths.entries()) {
    if (walked + length >= half && length > 0) {
      const from = path[index] as RoutePoint;
      const to = path[index + 1] as RoutePoint;
      const along = (half - walked) / length;
      return { x: from.x + (to.x - from.x) * along, y: from.y + (to.y - from.y) * along };
    }
    walked += length;
  }
  return source;
}

/**
 * Doc 198 rule 33: the edge's path through ELK's bend `points`, turning square corners — down to a point's row,
 * across to its lane, and on. Returned with the point to hang the edge's + on (rule 33b).
 */
export function routedPath(
  source: RoutePoint,
  target: RoutePoint,
  points: readonly RoutePoint[],
): [path: string, labelX: number, labelY: number] {
  const path = corners(source, target, points)
    .map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${x},${y}`)
    .join(' ');
  const middle = routeMidpoint(source, target, points);
  return [path, middle.x, middle.y];
}
