import { drawnNodes, startStageId, type DrawnNode } from '../renderers/xyflow/flow-elements';
import { flowEdges } from '../renderers/xyflow/flow-graph';
import type { FlowEdge } from '../types/elements';
import { conditionDecided, conditionEdge } from './criterion-match';
import { nextStageId, stageFormsOf, type RunnerFlow } from './runner-position';

// What the step rail promises (doc 202 rules 10c, 10d). PURE — no React — like `runner-position`, which owns where the
// runner IS and goes next; this module owns what the rail LISTS and what it hints lies beyond.

/** The walk's shared view of the Flow: sanitised edges and the authored nodes by id. */
interface Graph {
  readonly edges: readonly FlowEdge[];
  readonly nodes: ReadonlyMap<string, DrawnNode>;
}

const graphOf = ({ flow }: RunnerFlow): Graph => ({
  edges: flowEdges(flow),
  nodes: new Map(
    drawnNodes(flow).flatMap((node) => (node.authored ? [[node.id, node] as const] : [])),
  ),
});

/** Whether a node is a Stage the citizen would land on — rule 10b's Form-less Stages are walked straight past. */
const landsOn = (node: DrawnNode) => node.kind === 'stage' && stageFormsOf(node.element).length > 0;

/** A Stage's outgoing edge: the canvas gives one, and the first in edge order keeps a hand-edited fan-out deterministic. */
const stageEdge = (graph: Graph, nodeId: string) =>
  graph.edges.find((candidate) => candidate.source === nodeId);

const NOTHING_VISITED: ReadonlySet<string> = new Set<string>();

/**
 * Rule 10e: whether the walk may continue through this Condition. The answers deciding it is one way
 * (`conditionDecided`); the citizen having ALREADY GONE that way is the other. Pressing Next with "Applying as" empty
 * takes the default path — the runner routes by `conditionEdge` whether or not the choice was made — so once the Stage
 * that route lands on is visited, the route is history rather than a guess, and the rail must follow it. Without this,
 * standing on "Individual" still listed only "Applicant" and hinted at "3–4 more stages".
 */
function routeSettled(
  context: RunnerFlow,
  node: DrawnNode,
  nodeId: string,
  visited: ReadonlySet<string>,
): boolean {
  if (conditionDecided(node.element, context.schema, context.data)) return true;
  const landing = nextStageId(context, nodeId);
  return landing !== undefined && visited.has(landing);
}

/** The projected path, and the undecided Condition it stopped at, if any. */
export interface ProjectedPath {
  readonly stageIds: readonly string[];
  /** The Condition whose unmade choice ended the walk — `undefined` when the path runs to the end of the flow. */
  readonly stoppedAt: string | undefined;
}

/**
 * Doc 202 rule 10c: the Stages the citizen is actually required to enter, in the order they will meet them, given
 * the answers so far — the sidebar's list.
 *
 * It walks the same sanitised `flowEdges` as `nextStageId`, from the same start (rule 18), through the same
 * `conditionEdge`. The ONE difference is where it stops: at a Condition that is not yet `conditionDecided`, the walk
 * ends rather than following the default path. Everything downstream of an unmade choice is therefore absent from
 * the list — including stages common to every branch, which is the honest reading of "only the stages the user is
 * required to enter": until the branch resolves, the runner does not know the user will reach them.
 *
 * Stages with no Forms are skipped exactly as rule 10b requires, so the list and the traversal agree; the cycle
 * guard is `nextStageId`'s, for the same reason (rule 17: a hand-edited document never passed the apply gate).
 */
export function projectPath(
  context: RunnerFlow,
  visited: ReadonlySet<string> = NOTHING_VISITED,
): ProjectedPath {
  const { schema, data } = context;
  const graph = graphOf(context);

  const stageIds: string[] = [];
  const seen = new Set<string>();
  let current = startStageId(context.flow);
  while (current !== undefined && !seen.has(current)) {
    seen.add(current);
    const node = graph.nodes.get(current);
    if (node === undefined) break;

    if (node.kind === 'condition') {
      // The stop that makes this different from `nextStageId`.
      if (!routeSettled(context, node, current, visited)) return { stageIds, stoppedAt: current };
      current = conditionEdge({
        condition: node.element,
        nodeId: current,
        edges: graph.edges,
        schema,
        data,
      })?.target;
      continue;
    }

    if (landsOn(node)) stageIds.push(current);
    current = stageEdge(graph, current)?.target;
  }
  return { stageIds, stoppedAt: undefined };
}

/**
 * The stage ids the rail LISTS, in order: the projected path, plus `currentStageId` when it is absent — a DEFENSIVE
 * union so the rail can never contradict the page on screen (rule 10c). One definition, shared by the rail and by
 * the runner's error attribution (rule 27b), so the two can never disagree about which stages are on the path.
 */
export function listedStageIds(
  context: RunnerFlow,
  currentStageId?: string,
  visited: ReadonlySet<string> = NOTHING_VISITED,
): string[] {
  const ids = [...projectPath(context, visited).stageIds];
  if (currentStageId !== undefined && !ids.includes(currentStageId)) ids.push(currentStageId);
  return ids;
}

/** Rule 10c's list alone. */
export const projectedStageIds = (
  context: RunnerFlow,
  visited: ReadonlySet<string> = NOTHING_VISITED,
): string[] => [...projectPath(context, visited).stageIds];

/** The fewest and most Stages still ahead. */
export interface StepRange {
  readonly min: number;
  readonly max: number;
}

/**
 * Doc 202 rule 10d: how many MORE Stages lie beyond the projected path — the ghost step's count — or `undefined` when
 * there is nothing to hint at (the path is fully decided, or no branch holds another Stage).
 *
 * From the undecided Condition the walk stopped at, every outgoing edge is a possible branch. Downstream, a Condition
 * the answers already decide follows its one `conditionEdge` (the answers are not going to change for it by walking
 * on), and an undecided one branches again. Each branch counts the Stages it would land on (rule 10b skips Form-less
 * ones); the range is the shortest and longest over every branch.
 *
 * Memoised per node, so a diamond is walked once. `onPath` is the cycle guard for a hand-edited document (rule 17): a
 * branch that loops back ends there, contributing nothing further.
 */
export function upcomingStepRange(
  context: RunnerFlow,
  visited: ReadonlySet<string> = NOTHING_VISITED,
): StepRange | undefined {
  const { stoppedAt } = projectPath(context, visited);
  if (stoppedAt === undefined) return undefined;
  const { schema, data } = context;
  const graph = graphOf(context);
  const memo = new Map<string, StepRange>();
  const onPath = new Set<string>();
  const NONE: StepRange = { min: 0, max: 0 };

  const rangeFrom = (nodeId: string | undefined): StepRange => {
    if (nodeId === undefined || onPath.has(nodeId)) return NONE;
    const known = memo.get(nodeId);
    if (known !== undefined) return known;
    const node = graph.nodes.get(nodeId);
    if (node === undefined) return NONE;

    onPath.add(nodeId);
    let range: StepRange;
    if (
      node.kind === 'condition' &&
      (nodeId === stoppedAt || !routeSettled(context, node, nodeId, visited))
    ) {
      const branches = graph.edges
        .filter((edge) => edge.source === nodeId)
        .map((edge) => rangeFrom(edge.target));
      range =
        branches.length === 0
          ? NONE
          : {
              min: Math.min(...branches.map((branch) => branch.min)),
              max: Math.max(...branches.map((branch) => branch.max)),
            };
    } else if (node.kind === 'condition') {
      range = rangeFrom(
        conditionEdge({ condition: node.element, nodeId, edges: graph.edges, schema, data })
          ?.target,
      );
    } else {
      const rest = rangeFrom(stageEdge(graph, nodeId)?.target);
      const own = landsOn(node) ? 1 : 0;
      range = { min: rest.min + own, max: rest.max + own };
    }
    onPath.delete(nodeId);
    memo.set(nodeId, range);
    return range;
  };

  const range = rangeFrom(stoppedAt);
  return range.max === 0 ? undefined : range;
}
