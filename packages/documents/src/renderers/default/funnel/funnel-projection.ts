import { conditionDecided } from './clause-match';
import { startNodeOf } from './funnel-graph';
import {
  edgeFrom,
  graphOf,
  landingFrom,
  type FunnelContext,
  type FunnelGraph,
} from './funnel-position';

// What the step rail promises (doc 274 rules 11-12). PURE.

const NOTHING: ReadonlySet<string> = new Set<string>();

/** Rule 11: the answers decide this Condition, or the citizen already went the way it routes. */
function routeSettled(
  context: FunnelContext,
  graph: FunnelGraph,
  conditionId: string,
  visited: ReadonlySet<string>,
): boolean {
  const condition = graph.conditions.get(conditionId);
  if (condition === undefined) return true;
  if (conditionDecided(condition, context.schema, context.data)) return true;
  const landing = landingFrom(context, conditionId, graph);
  return landing !== undefined && visited.has(landing);
}

export interface ProjectedPath {
  readonly formIds: readonly string[];
  /** The undecided Condition the walk stopped at, or `undefined` when it ran to the end. */
  readonly stoppedAt: string | undefined;
}

/** Rule 11: the Forms the citizen is required to enter, in order, stopping at an unsettled Condition. */
export function projectPath(context: FunnelContext, visited = NOTHING): ProjectedPath {
  const graph = graphOf(context.funnel);
  const formIds: string[] = [];
  const seen = new Set<string>();
  let current = startNodeOf(context.funnel);
  while (current !== undefined && !seen.has(current)) {
    seen.add(current);
    if (graph.conditions.has(current) && !routeSettled(context, graph, current, visited))
      return { formIds, stoppedAt: current };
    if (graph.forms.has(current)) formIds.push(current);
    else if (!graph.conditions.has(current)) break;
    current = edgeFrom(context, graph, current)?.target;
  }
  return { formIds, stoppedAt: undefined };
}

/** Rule 11: the rail's list — the projection, plus the current Form when it is absent. */
export function listedFormIds(
  context: FunnelContext,
  currentId?: string,
  visited = NOTHING,
): string[] {
  const ids = [...projectPath(context, visited).formIds];
  if (currentId !== undefined && !ids.includes(currentId)) ids.push(currentId);
  return ids;
}

export interface StepRange {
  readonly min: number;
  readonly max: number;
}

const NONE: StepRange = { min: 0, max: 0 };

/** Rule 12: the fewest and most Forms an undecided branch may still add, or `undefined` when nothing is undecided. */
export function upcomingStepRange(
  context: FunnelContext,
  visited = NOTHING,
): StepRange | undefined {
  const { stoppedAt } = projectPath(context, visited);
  if (stoppedAt === undefined) return undefined;
  const graph = graphOf(context.funnel);
  const memo = new Map<string, StepRange>();
  const onPath = new Set<string>();

  const rangeFrom = (nodeId: string | undefined): StepRange => {
    if (nodeId === undefined || onPath.has(nodeId)) return NONE;
    const known = memo.get(nodeId);
    if (known !== undefined) return known;
    onPath.add(nodeId);
    let range = NONE;
    if (graph.forms.has(nodeId)) {
      const rest = rangeFrom(edgeFrom(context, graph, nodeId)?.target);
      range = { min: rest.min + 1, max: rest.max + 1 };
    } else if (nodeId === stoppedAt || !routeSettled(context, graph, nodeId, visited)) {
      const branches = graph.edges
        .filter((e) => e.source === nodeId)
        .map((e) => rangeFrom(e.target));
      if (branches.length > 0)
        range = {
          min: Math.min(...branches.map((b) => b.min)),
          max: Math.max(...branches.map((b) => b.max)),
        };
    } else if (graph.conditions.has(nodeId)) {
      range = rangeFrom(edgeFrom(context, graph, nodeId)?.target);
    }
    onPath.delete(nodeId);
    memo.set(nodeId, range);
    return range;
  };

  const range = rangeFrom(stoppedAt);
  return range.max === 0 ? undefined : range;
}
