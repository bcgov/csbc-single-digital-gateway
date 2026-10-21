import type { AddEdge } from './canvas-graph';
import { rowIsSet } from './criteria';
import type { FunnelCondition, FunnelEdge } from './funnel-model';

/**
 * Marks every edge leaving a Condition branch that is not set, and everything downstream of it — nodes, their
 * persisted edges and their trailing edges — as `invalid`. Returns the invalid node ids.
 */
export function markUnsetBranches(conditions: FunnelCondition[], edges: AddEdge[]): Set<string> {
  const pending = edges.filter((e) =>
    conditions.some(
      (c) =>
        c.id === e.source &&
        c.options.rows.some((row) => row.id === e.sourceHandle && !rowIsSet(row)),
    ),
  );
  const nodes = new Set<string>();
  while (pending.length > 0) {
    const edge = pending.pop()!;
    if (edge.data === undefined || edge.data.invalid === true) continue;
    edge.data.invalid = true;
    if (nodes.has(edge.target)) continue;
    nodes.add(edge.target);
    pending.push(...edges.filter((e) => e.source === edge.target));
  }
  return nodes;
}

/** Every node reachable from `start` along persisted edges, `start` included; empty when there is no start. */
export function reachableFrom(start: string | undefined, edges: FunnelEdge[]): Set<string> {
  const reached = new Set<string>();
  const pending = start === undefined ? [] : [start];
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (reached.has(id)) continue;
    reached.add(id);
    for (const e of edges) if (e.source === id) pending.push(e.target);
  }
  return reached;
}
