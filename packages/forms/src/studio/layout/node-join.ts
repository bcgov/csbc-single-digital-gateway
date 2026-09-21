import { connectionProblem } from '../../renderers/xyflow/flow-gestures';
import { flowEdges } from '../../renderers/xyflow/flow-graph';
import { edgeIdOf, isRecord, rawEdges, withOptions } from './element-parts';
import type { ElementIds } from './element-ids';
import type { TreeElement } from './element-tree';
import { removeStageEdges } from './flow-edits';

// Doc 210 rules 1-8: what a deleted Flow node does to the edges around it.
//
// Doc 196 rule 9 dropped every edge that touched the node, which breaks a chain in the middle and leaves the
// author to redraw it. A node with exactly ONE edge in and ONE out now JOINS its neighbours instead; every other
// shape still falls back to rule 9, because there is no single obvious join and inventing a cross-join would
// author edges nobody drew.

/** The two edges a join would replace with one, or `null` when the node does not join (rules 4-5). */
function plannedJoin(flow: TreeElement, nodeId: string) {
  const entries = rawEdges(flow);
  const touches = (entry: unknown) =>
    isRecord(entry) && (entry['source'] === nodeId || entry['target'] === nodeId);
  if (!entries.some(touches)) return null;

  const drawn = flowEdges(flow);
  const incoming = drawn.filter((edge) => edge.target === nodeId);
  const outgoing = drawn.filter((edge) => edge.source === nodeId);
  const into = incoming[0];
  const out = outgoing[0];
  // Rule 4: no join for a leaf, a root, or a node that branches or that paths converge on.
  if (incoming.length !== 1 || outgoing.length !== 1 || !into || !out) return null;

  /**
   * Rule 5: the join is judged by the rule every other edge is judged by (doc 209 rule 14), against the graph
   * the join would actually join — the Flow with BOTH of the node's edges already gone. A plain object, not a
   * `withOptions` result: it is never returned, and carrying the Flow's studio id onto a throwaway would give
   * two objects one id.
   */
  const pruned = {
    ...flow,
    options: { ...flow.options, edges: entries.filter((entry) => !touches(entry)) },
  } as TreeElement;
  if (connectionProblem(pruned, into.source, out.target, into.sourceHandle) !== undefined)
    return null;
  return { entries, touches, into, out };
}

/**
 * Rule 8b: whether deleting `nodeId` would JOIN its neighbours rather than leave them dangling — which is what
 * the delete confirmation has to say, since "its connections will be removed" stops being true.
 */
export const joinsNeighbours = (flow: TreeElement, nodeId: string): boolean =>
  plannedJoin(flow, nodeId) !== null;

/**
 * Rules 1-7: `flow` with the edges around `nodeId` healed, or — when the shape does not join, or the join is
 * refused — without them at all. The SAME object when no edge touches `nodeId` (doc 187 rule 15).
 *
 * The 1-in/1-out test counts SANITISED edges (`flowEdges`), not the authored entries: an edge the canvas drops
 * is not on screen, so it must not decide whether the author sees a join.
 */
export function joinAroundNode(flow: TreeElement, nodeId: string, ids: ElementIds): TreeElement {
  const planned = plannedJoin(flow, nodeId);
  if (!planned) {
    // Nothing touches it at all, or the shape does not join: doc 196 rule 9, unchanged.
    return rawEdges(flow).some(
      (entry) => isRecord(entry) && (entry['source'] === nodeId || entry['target'] === nodeId),
    )
      ? removeStageEdges(flow, nodeId, ids)
      : flow;
  }
  const { entries, touches, into, out } = planned;

  /**
   * Rules 2-3: the incoming edge is RETARGETED in place — keeping its id, its position in the list and its
   * `sourceHandle` — and the outgoing one is dropped. One edge moves; two do not disappear and a third appear.
   */
  const healed = entries.flatMap((entry) =>
    edgeIdOf(entry) === into.id
      ? [{ ...(entry as Record<string, unknown>), target: out.target }]
      : touches(entry)
        ? []
        : [entry],
  );
  return withOptions(flow, { edges: healed }, ids);
}
