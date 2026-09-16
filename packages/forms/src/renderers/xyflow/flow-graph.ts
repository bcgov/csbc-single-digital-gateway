import type { UISchemaElement } from '@jsonforms/core';
import type { FlowEdge } from '../../types/elements';
import {
  authoredStageId,
  criteriaOf,
  DEFAULT_HANDLE,
  drawnNodes,
  elementsOf,
  flowNodeKind,
  startStageId,
} from './flow-elements';

// A Flow's edges (doc 195 rules 10, 18; doc 199 rules 10-15). Pure — no React, no @xyflow/react.

/** A problem found in a Flow, shaped like the code editor's document problems. */
export interface FlowProblem {
  readonly path: string;
  readonly message: string;
}

export const SELF_LOOP_MESSAGE = 'An edge cannot connect a Stage to itself.';
export const DUPLICATE_EDGE_MESSAGE = 'This edge is already defined.';
export const CYCLE_MESSAGE = 'This edge would create a cycle.';
export const MISSING_DEFAULT_MESSAGE =
  'This condition has no default path, so an answer matching no criterion would have nowhere to go.';
export const duplicateStageIdMessage = (id: string) => `Stage id "${id}" is already used.`;
export const unknownStageMessage = (id: string) => `No Stage has id "${id}".`;
export const unknownHandleMessage = (handle: string) =>
  `No criterion with id "${handle}" leaves this condition.`;
/** Doc 203 rules 12-13: the message names the fallback, so the author knows the flow still runs. */
export const unknownStartMessage = (id: string) =>
  `No Stage has id "${id}", so this flow starts at its first stage instead.`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `options.edges` as authored: the array, or `[]` when absent or not an array. */
const authoredEdges = (flow: UISchemaElement): readonly unknown[] => {
  const edges = flow.options?.['edges'];
  return Array.isArray(edges) ? edges : [];
};

/**
 * An entry as an edge when its `id`, `source` and `target` are all strings.
 *
 * Doc 199 rule 10: `sourceHandle` is CARRIED. This function rebuilds every edge, so a key it does not copy is
 * silently dropped before any renderer, node builder or problem reporter sees it — which is how a branch would
 * quietly behave as the default path. An absent handle stays an ABSENT KEY (`exactOptionalPropertyTypes`),
 * because absent is precisely what marks the default path.
 *
 * `DEFAULT_HANDLE` normalises to ABSENT. The canvas needs a handle id to address the default output, so xyflow
 * reports `sourceHandle: '__default'` when the author drags from it — but the stored form of a default edge is
 * no handle at all (rule 10), which is what keeps every pre-199 document valid. Normalising here means the two
 * forms can never disagree: without it such an edge names no criterion and would be dropped outright.
 */
function asEdge(entry: unknown): FlowEdge | undefined {
  if (!isRecord(entry)) return undefined;
  const { id, source, target, sourceHandle } = entry;
  if (typeof id !== 'string' || typeof source !== 'string' || typeof target !== 'string')
    return undefined;
  return typeof sourceHandle === 'string' && sourceHandle !== '' && sourceHandle !== DEFAULT_HANDLE
    ? { id, source, target, sourceHandle }
    : { id, source, target };
}

/**
 * Doc 199 rule 11: an edge's identity includes the handle it leaves by. Two criteria of one Condition may
 * legitimately lead to the SAME target — without the handle they would read as a duplicate and the second
 * would be dropped. A Stage edge has no handle, so its behaviour is unchanged.
 */
const pairKey = ({ source, target, sourceHandle }: FlowEdge) =>
  JSON.stringify([source, sourceHandle ?? null, target]);

/** Doc 199 rule 7: whether `from` reaches `to` along `edges` (a node reaches itself). */
export function reachesNode(edges: readonly FlowEdge[], from: string, to: string): boolean {
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
  reachesNode(edges, target, source);

/** The criterion ids of every Condition, by node id (doc 199 rule 12). */
function handlesByNode(flow: UISchemaElement): Map<string, Set<string>> {
  const handles = new Map<string, Set<string>>();
  for (const { element, id, authored, kind } of drawnNodes(flow)) {
    if (!authored || kind !== 'condition') continue;
    handles.set(id, new Set(criteriaOf(element).map((criterion) => criterion.id)));
  }
  return handles;
}

/**
 * Rule 10: the edges a Flow draws, in order — dropping entries that are not `{ id, source, target }` strings,
 * edges with an end that is not a drawn node's own id, self-loops, a repeated id and a repeated
 * `(source, sourceHandle, target)` (the first wins). Cycles are kept.
 *
 * Doc 199 rule 12: an edge whose `sourceHandle` names no criterion of its source Condition is dropped too — a
 * branch that leaves by nothing is not a connection.
 */
export function flowEdges(flow: UISchemaElement): FlowEdge[] {
  const nodeIds = new Set(drawnNodes(flow).flatMap(({ id, authored }) => (authored ? [id] : [])));
  const handles = handlesByNode(flow);
  const ids = new Set<string>();
  const pairs = new Set<string>();
  const edges: FlowEdge[] = [];
  for (const entry of authoredEdges(flow)) {
    const edge = asEdge(entry);
    if (!edge || !nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    if (edge.source === edge.target || ids.has(edge.id) || pairs.has(pairKey(edge))) continue;
    if (edge.sourceHandle !== undefined && !handles.get(edge.source)?.has(edge.sourceHandle))
      continue;
    ids.add(edge.id);
    pairs.add(pairKey(edge));
    edges.push(edge);
  }
  return edges;
}

/**
 * Doc 198 rule 6: the STAGES with no outgoing sanitised edge, in `elements` order — the end of every chain,
 * which is what the dangling + affordance hangs off (rule 7).
 *
 * Doc 199 rule 14: a Condition is never a leaf. It owns its outputs, and each unconnected one carries its own
 * affordance on the card instead.
 */
export function leafStageIds(flow: UISchemaElement): string[] {
  const sources = new Set(flowEdges(flow).map(({ source }) => source));
  return drawnNodes(flow).flatMap(({ id, authored, kind }) =>
    authored && kind === 'stage' && !sources.has(id) ? [id] : [],
  );
}

/**
 * Doc 203 rules 4-6: every drawn Stage with no path from the Flow's start along the SANITISED edges (doc 199
 * rule 7 — never raw `options.edges`), in `elements` order.
 *
 * `reachesNode` includes the node itself, so the start is never listed (rule 5); with no start at all, nothing is
 * reachable and every Stage is. A Stage whose id is a placeholder IS listed: no edge can address it, so it is
 * unreachable in the most literal sense, and that is worth showing the author.
 *
 * Conditions are never listed (rule 6) — they are traversed, never visited, and an unreachable Condition is only
 * ever a symptom of the unreachable Stage behind it.
 */
export function unreachableStageIds(flow: UISchemaElement): string[] {
  const start = startStageId(flow);
  const edges = flowEdges(flow);
  return drawnNodes(flow).flatMap(({ id, kind }) =>
    kind === 'stage' && (start === undefined || !reachesNode(edges, start, id)) ? [id] : [],
  );
}

/**
 * Doc 203 rules 12-13: an authored `startId` naming no drawn Stage — one deleted, a Condition, or a placeholder id.
 * Reported, never repaired; `startStageId` falls back so the canvas and the runner keep working.
 */
function startProblems(flow: UISchemaElement): FlowProblem[] {
  const authored = flow.options?.['startId'];
  if (typeof authored !== 'string' || authored === '') return [];
  const named = drawnNodes(flow).some(
    ({ id, authored: own, kind }) => own && kind === 'stage' && id === authored,
  );
  return named ? [] : [{ path: '/options/startId', message: unknownStartMessage(authored) }];
}

/** Rule 18, widened by doc 199 rule 15: ids duplicated across Stages AND Conditions, by instance path. */
function nodeIdProblems(flow: UISchemaElement): { ids: Set<string>; problems: FlowProblem[] } {
  const ids = new Set<string>();
  const problems: FlowProblem[] = [];
  elementsOf(flow).forEach((element, index) => {
    const id = flowNodeKind(element) === undefined ? undefined : authoredStageId(element);
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
 * Doc 199 rule 13 (graph half): every Condition needs a default path — an outgoing edge with no `sourceHandle` —
 * or an answer matching no criterion would have nowhere to go.
 *
 * The other half of rule 13 (is each criterion valid, and is its field upstream?) cannot live here: it needs the
 * document's SCHEMA, which `flowProblems` is not given, and the helpers that resolve a field are in the studio,
 * which `renderers/xyflow` may not import. The studio checks those alongside this.
 */
function defaultPathProblems(flow: UISchemaElement, edges: readonly FlowEdge[]): FlowProblem[] {
  const withDefault = new Set(
    edges.flatMap((edge) => (edge.sourceHandle === undefined ? [edge.source] : [])),
  );
  return drawnNodes(flow).flatMap(({ index, id, authored, kind }) =>
    kind === 'condition' && authored && !withDefault.has(id)
      ? [{ path: `/elements/${index}`, message: MISSING_DEFAULT_MESSAGE }]
      : [],
  );
}

/**
 * Rule 18: every problem that should stop a Flow uischema being applied — duplicate node ids, edge ends naming no
 * node, self-loops, repeated edges, each edge that closes a cycle with the edges accepted before it, an edge
 * leaving by a criterion that does not exist, and a Condition with no default path.
 */
export function flowProblems(flow: UISchemaElement): FlowProblem[] {
  const { ids: nodeIds, problems } = nodeIdProblems(flow);
  const handles = handlesByNode(flow);
  const accepted: FlowEdge[] = [];
  const edgeIds = new Set<string>();
  const pairs = new Set<string>();
  authoredEdges(flow).forEach((entry, index) => {
    const edge = asEdge(entry);
    if (!edge) return;
    const path = `/options/edges/${index}`;
    const unknown = (['source', 'target'] as const).filter((end) => !nodeIds.has(edge[end]));
    for (const end of unknown)
      problems.push({ path: `${path}/${end}`, message: unknownStageMessage(edge[end]) });
    if (unknown.length > 0) return;
    if (edge.source === edge.target) {
      problems.push({ path, message: SELF_LOOP_MESSAGE });
    } else if (
      edge.sourceHandle !== undefined &&
      !handles.get(edge.source)?.has(edge.sourceHandle)
    ) {
      problems.push({
        path: `${path}/sourceHandle`,
        message: unknownHandleMessage(edge.sourceHandle),
      });
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
  return [...problems, ...defaultPathProblems(flow, accepted), ...startProblems(flow)];
}
