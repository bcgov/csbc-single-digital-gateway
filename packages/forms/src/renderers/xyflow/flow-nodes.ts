import type { UISchemaElement } from '@jsonforms/core';
import { MarkerType, type Edge, type Node } from '@xyflow/react';
import { DEFAULT_HANDLE, drawnNodes, rowsOf, startStageId } from './flow-elements';
import { isRouted } from './flow-edge-path';
import { flowEdges, leafStageIds, unreachableStageIds } from './flow-graph';
import type { RoutePoint } from './flow-elk';

// A Flow element as xyflow nodes and edges (doc 195 rules 8, 10, 12; doc 199 rules 16-18), derived from the
// uischema alone.

/** The xyflow node type every Stage is drawn with. */
export const STAGE_NODE_TYPE = 'stage';
/** Doc 199 rule 17: the xyflow node type every Condition is drawn with. */
export const CONDITION_NODE_TYPE = 'condition';
/** Doc 198 rule 9: the xyflow edge type every connection is drawn with. */
export const ACTION_EDGE_TYPE = 'action';

/** Doc 198 rule 30: where ELK put each node, and the route it gave each edge — both handed in by the renderer. */
export type PositionsById = ReadonlyMap<string, { x: number; y: number }>;
export type RoutesById = ReadonlyMap<string, RoutePoint[]>;

/** Before ELK has answered (rule 30) there are no positions or routes; a node then sits at the origin. */
const NO_LAYOUT: PositionsById = new Map();
const NO_ROUTES: RoutesById = new Map();

/** Doc 198 rule 9: an edge carries the Flow's element id, which the + needs for its `insert-between` gesture. */
export type ActionEdgeData = {
  /** Doc 198 rule 9: the Flow's element id, set by the renderer under an editor. Absent on a view-only edge. */
  flowId?: string;
  /** Doc 198 rule 30b: the lane dagre gave this edge, when it spans more than one rank. */
  points?: RoutePoint[];
  /**
   * Doc 199 rule 50: the label of the ROW this edge leaves by, drawn as a chip near the target. Absent for a
   * Stage edge and for a Condition's Else edge, which is styled rather than named.
   */
  branchLabel?: string;
  /** Rule 45: whether this edge leaves a Condition's Else output, which draws dashed in the warning colour. */
  isElse?: boolean;
};
export type ActionFlowEdge = Edge<ActionEdgeData, typeof ACTION_EDGE_TYPE>;

/**
 * Doc 198 rule 7: `isLeaf` is what the dangling + affordance hangs off.
 *
 * Doc 203 rule 7: `isStart` and `isUnreachable` are whole-Flow questions — which Stage the Flow begins at, and
 * which Stages no path from it reaches — that neither the node nor the dispatched card can see, so they are
 * derived here alongside `isLeaf` and handed down as data.
 */
export type StageNodeData = {
  element: UISchemaElement;
  isLeaf: boolean;
  isStart: boolean;
  isUnreachable: boolean;
};
export type StageFlowNode = Node<StageNodeData, typeof STAGE_NODE_TYPE>;

/**
 * A Condition draws its outputs from its own criteria. Doc 199 rule 20: which of them are already WIRED is a
 * question about the Flow's edges, which neither the node nor the dispatched card can see — so it is derived
 * here, exactly as a Stage's `isLeaf` is, and handed down to the card through `ConditionOutputsContext`.
 * The default output is named by `DEFAULT_HANDLE`, the same id its handle carries.
 */
export type ConditionNodeData = { element: UISchemaElement; connectedOutputs: string[] };
export type ConditionFlowNode = Node<ConditionNodeData, typeof CONDITION_NODE_TYPE>;

export type FlowNode = StageFlowNode | ConditionFlowNode;

/**
 * Rule 8, widened by doc 199 rule 16: one node per Stage AND Condition in `elements` order, at its doc 198
 * rule 2 position. Nodes are never selected, dragged or deleted by xyflow (doc 196 rule 7, doc 198 rule 4): the
 * studio selects them through its own port, and an editable Flow turns `elementsSelectable` on only so its edges
 * can be selected and deleted.
 *
 * Only a Stage can be a leaf (doc 199 rule 14) — a Condition owns its outputs on its card instead.
 */
export function toFlowNodes(
  flow: UISchemaElement,
  positions: PositionsById = NO_LAYOUT,
): FlowNode[] {
  const leaves = new Set(leafStageIds(flow));
  const edges = flowEdges(flow);
  // Doc 203 rule 7: whole-Flow questions, asked ONCE here rather than per node.
  const start = startStageId(flow);
  const unreachable = new Set(unreachableStageIds(flow));
  return drawnNodes(flow).map(({ element, id, kind }) => {
    const shared = {
      id,
      position: positions.get(id) ?? { x: 0, y: 0 },
      selectable: false,
      deletable: false,
    };
    // No `as const` here: these are already literal-typed by their declarations, and the assertion is only
    // legal on a literal itself, not on a reference to one.
    return kind === 'condition'
      ? {
          ...shared,
          type: CONDITION_NODE_TYPE,
          data: {
            element,
            connectedOutputs: edges.flatMap((edge) =>
              edge.source === id ? [edge.sourceHandle ?? DEFAULT_HANDLE] : [],
            ),
          },
        }
      : {
          ...shared,
          type: STAGE_NODE_TYPE,
          data: {
            element,
            isLeaf: leaves.has(id),
            isStart: start !== undefined && start === id,
            isUnreachable: unreachable.has(id),
          },
        };
  });
}

/**
 * Rule 10: the sanitised edges, each drawn as an ActionEdge with an arrow at its target (doc 198 rule 9).
 *
 * Doc 199 rule 18: an edge with no `sourceHandle` is the DEFAULT path, and a Condition addresses that output by
 * the reserved `DEFAULT_HANDLE` — so the absent key is translated into it, the mirror of `asEdge` normalising it
 * back out when reading.
 *
 * TRAP: translate ONLY for edges leaving a Condition. `StageNode`'s handles carry no `id` at all, and xyflow
 * DROPS an edge whose `sourceHandle` names a handle the source node does not have — so stamping the default
 * handle on a Stage edge silently removes every pre-199 connection from the canvas, with no error anywhere.
 */
export function toFlowEdges(flow: UISchemaElement, routes: RoutesById = NO_ROUTES): Edge[] {
  const labels = new Map<string, Map<string, string>>();
  const conditions = new Set(
    drawnNodes(flow).flatMap(({ element, id, kind }) => {
      if (kind !== 'condition') return [];
      labels.set(id, new Map(rowsOf(element).map((row) => [row.id, row.label])));
      return [id];
    }),
  );
  return flowEdges(flow).map(({ id, source, target, sourceHandle }) => {
    const isCondition = conditions.has(source);
    const handle = sourceHandle ?? (isCondition ? DEFAULT_HANDLE : undefined);
    const points = routes.get(id) ?? [];
    // Doc 199 rule 50: the chip names the branch, so a Stage edge and an Else edge carry no label.
    const branchLabel =
      sourceHandle === undefined ? undefined : labels.get(source)?.get(sourceHandle);
    const data = {
      ...(isRouted(points) ? { points } : {}),
      ...(branchLabel === undefined || branchLabel === '' ? {} : { branchLabel }),
      ...(isCondition && sourceHandle === undefined ? { isElse: true } : {}),
    };
    return {
      id,
      source,
      target,
      // `exactOptionalPropertyTypes`: a Stage edge keeps an ABSENT key, never an explicit undefined.
      ...(handle === undefined ? {} : { sourceHandle: handle }),
      ...(Object.keys(data).length > 0 ? { data } : {}),
      type: ACTION_EDGE_TYPE,
      markerEnd: { type: MarkerType.ArrowClosed },
    };
  });
}
