import type { UISchemaElement } from '@jsonforms/core';
import type { FlowEdge } from '../../types/elements';
import { authoredStageId, drawnStages, elementsOf, isStage } from './flow-elements';

// A Flow's edges (doc 195 rules 10, 18). Pure — no React, no @xyflow/react.

/** A problem found in a Flow, shaped like the code editor's document problems. */
export interface FlowProblem {
  readonly path: string;
  readonly message: string;
}

export const SELF_LOOP_MESSAGE = 'An edge cannot connect a Stage to itself.';
export const DUPLICATE_EDGE_MESSAGE = 'This edge is already defined.';
export const CYCLE_MESSAGE = 'This edge would create a cycle.';
export const duplicateStageIdMessage = (id: string) => `Stage id "${id}" is already used.`;
export const unknownStageMessage = (id: string) => `No Stage has id "${id}".`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `options.edges` as authored: the array, or `[]` when absent or not an array. */
const authoredEdges = (flow: UISchemaElement): readonly unknown[] => {
  const edges = flow.options?.['edges'];
  return Array.isArray(edges) ? edges : [];
};

/** An entry as an edge when its `id`, `source` and `target` are all strings. */
function asEdge(entry: unknown): FlowEdge | undefined {
  if (!isRecord(entry)) return undefined;
  const { id, source, target } = entry;
  if (typeof id !== 'string' || typeof source !== 'string' || typeof target !== 'string')
    return undefined;
  return { id, source, target };
}

const pairKey = ({ source, target }: FlowEdge) => JSON.stringify([source, target]);

/** Whether `from` reaches `to` along `edges` (a Stage reaches itself). */
function reaches(edges: readonly FlowEdge[], from: string, to: string): boolean {
  const seen = new Set<string>();
  const pending = [from];
  while (pending.length > 0) {
    const current = pending.pop() as string;
    if (current === to) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const edge of edges) if (edge.source === current) pending.push(edge.target);
  }
  return false;
}

/** Whether adding `source → target` to `edges` would close a cycle, a self-loop included. */
export const createsCycle = (edges: readonly FlowEdge[], source: string, target: string): boolean =>
  reaches(edges, target, source);

/**
 * Rule 10: the edges a Flow draws, in order — dropping entries that are not `{ id, source, target }` strings, edges
 * with an end that is not a drawn Stage's own id, self-loops, a repeated id and a repeated `(source, target)` pair (the
 * first wins). Cycles are kept.
 */
export function flowEdges(flow: UISchemaElement): FlowEdge[] {
  const stageIds = new Set(drawnStages(flow).flatMap(({ id, authored }) => (authored ? [id] : [])));
  const ids = new Set<string>();
  const pairs = new Set<string>();
  const edges: FlowEdge[] = [];
  for (const entry of authoredEdges(flow)) {
    const edge = asEdge(entry);
    if (!edge || !stageIds.has(edge.source) || !stageIds.has(edge.target)) continue;
    if (edge.source === edge.target || ids.has(edge.id) || pairs.has(pairKey(edge))) continue;
    ids.add(edge.id);
    pairs.add(pairKey(edge));
    edges.push(edge);
  }
  return edges;
}

/**
 * Doc 198 rule 6: the Stages with no outgoing sanitised edge, in `elements` order — the end of every chain, which is
 * what the dangling + affordance hangs off (rule 7). Read from `flowEdges`, so an edge that is dropped as invalid (a
 * self-loop, an unknown end) leaves its source a leaf. A Stage with no authored id is never a leaf: no edge can leave
 * it, so the + would have nothing to connect from.
 */
export function leafStageIds(flow: UISchemaElement): string[] {
  const sources = new Set(flowEdges(flow).map(({ source }) => source));
  return drawnStages(flow).flatMap(({ id, authored }) =>
    authored && !sources.has(id) ? [id] : [],
  );
}

/** Rule 18: duplicate Stage ids, by instance path. */
function stageIdProblems(flow: UISchemaElement): { ids: Set<string>; problems: FlowProblem[] } {
  const ids = new Set<string>();
  const problems: FlowProblem[] = [];
  elementsOf(flow).forEach((element, index) => {
    const id = isStage(element) ? authoredStageId(element) : undefined;
    if (id === undefined) return;
    if (ids.has(id))
      problems.push({
        path: `/elements/${index}/options/id`,
        message: duplicateStageIdMessage(id),
      });
    ids.add(id);
  });
  return { ids, problems };
}

/**
 * Rule 18: every problem that should stop a Flow uischema being applied — duplicate Stage ids, edge ends naming no
 * Stage, self-loops, repeated edges, and each edge that closes a cycle with the edges accepted before it.
 */
export function flowProblems(flow: UISchemaElement): FlowProblem[] {
  const { ids: stageIds, problems } = stageIdProblems(flow);
  const accepted: FlowEdge[] = [];
  const edgeIds = new Set<string>();
  const pairs = new Set<string>();
  authoredEdges(flow).forEach((entry, index) => {
    const edge = asEdge(entry);
    if (!edge) return;
    const path = `/options/edges/${index}`;
    const unknown = (['source', 'target'] as const).filter((end) => !stageIds.has(edge[end]));
    for (const end of unknown)
      problems.push({ path: `${path}/${end}`, message: unknownStageMessage(edge[end]) });
    if (unknown.length > 0) return;
    if (edge.source === edge.target) {
      problems.push({ path, message: SELF_LOOP_MESSAGE });
    } else if (edgeIds.has(edge.id) || pairs.has(pairKey(edge))) {
      problems.push({ path, message: DUPLICATE_EDGE_MESSAGE });
    } else if (createsCycle(accepted, edge.source, edge.target)) {
      problems.push({ path, message: CYCLE_MESSAGE });
    } else {
      accepted.push(edge);
      edgeIds.add(edge.id);
      pairs.add(pairKey(edge));
    }
  });
  return problems;
}
