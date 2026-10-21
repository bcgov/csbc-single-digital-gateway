import { EDGE_APPROACH, type RoutePoint } from './flow-elk';

// The square path an edge takes along the route ELK gave it (doc 198 rule 33). PURE — no React, no @xyflow/react.

/** An edge ELK drew straight has no bend points, and its two ends are all the component needs. */
export const isRouted = (points: readonly RoutePoint[]): boolean => points.length > 0;

/**
 * Doc 198 rule 33c: the bends the path turns through — ELK's, or ONE synthesised at the approach gutter for an
 * edge ELK drew with none.
 *
 * ELK only returns bend points where its route actually turns, so an edge whose ends line up comes back with
 * none at all. Those were drawn with xyflow's `getSmoothStepPath`, which turns HALFWAY between the two nodes —
 * while a routed edge turns `EDGE_APPROACH` before its target. At a merge the two arrive by visibly different
 * shapes, which is what reads as the elbows being at different distances (user 2026-09-17).
 *
 * Synthesising the corner instead makes every edge approach the same way. It degenerates correctly: when the
 * two ends share a row the turn is zero-length and the line is straight, exactly as before. The corner also
 * sits in the strip ELK reserved as clear of nodes, so nothing can be drawn through a card.
 *
 * The corner is CLAMPED never to fall behind the source. ELK keeps a whole layer between the two nodes, but the
 * coordinates here are xyflow HANDLE positions rather than ELK's node boxes — a Condition's outputs are inset
 * into its rows — so a pair closer together than the gutter would otherwise hook the edge backwards. Clamped,
 * such an edge turns immediately and draws a plain L.
 */
const bendsOf = (
  source: RoutePoint,
  target: RoutePoint,
  points: readonly RoutePoint[],
): readonly RoutePoint[] =>
  isRouted(points) ? points : [{ x: Math.max(source.x, target.x - EDGE_APPROACH), y: source.y }];

/** The corners the drawn path actually turns, from the source through ELK's bends to the target. */
function corners(
  source: RoutePoint,
  target: RoutePoint,
  points: readonly RoutePoint[],
): RoutePoint[] {
  const path: RoutePoint[] = [source];
  let current = source;
  for (const point of [...bendsOf(source, target, points), target]) {
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
 *
 * TRAP: the corner walk assumes the canvas runs LEFT TO RIGHT — it moves vertically to each point's row and then
 * horizontally, so the path always ARRIVES horizontally. That is right for the horizontal canvas, which is the
 * only one shipped (doc 198 rule 31, superseded); a vertical one would need the two moves the other way round or
 * every edge would enter its target's top handle from the side.
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
