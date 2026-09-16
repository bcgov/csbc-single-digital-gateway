import type { UISchemaElement } from '@jsonforms/core';
import { MarkerType, type Edge, type Node } from '@xyflow/react';
import { DEFAULT_HANDLE, drawnNodes } from './flow-elements';
import { flowEdges, leafStageIds } from './flow-graph';
import { stagePositions } from './flow-positions';

// A Flow element as xyflow nodes and edges (doc 195 rules 8, 10, 12; doc 199 rules 16-18), derived from the
// uischema alone.

/** The xyflow node type every Stage is drawn with. */
export const STAGE_NODE_TYPE = 'stage';
/** Doc 199 rule 17: the xyflow node type every Condition is drawn with. */
export const CONDITION_NODE_TYPE = 'condition';
/** Doc 198 rule 9: the xyflow edge type every connection is drawn with. */
export const ACTION_EDGE_TYPE = 'action';

/** Doc 198 rule 9: an edge carries the Flow's element id, which the + needs for its `insert-between` gesture. */
export type ActionEdgeData = { flowId: string };
export type ActionFlowEdge = Edge<ActionEdgeData, typeof ACTION_EDGE_TYPE>;

/** Doc 198 rule 7: `isLeaf` is what the dangling + affordance hangs off. */
export type StageNodeData = { element: UISchemaElement; isLeaf: boolean };
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
export function toFlowNodes(flow: UISchemaElement): FlowNode[] {
  const positions = stagePositions(flow);
  const leaves = new Set(leafStageIds(flow));
  const edges = flowEdges(flow);
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
      : { ...shared, type: STAGE_NODE_TYPE, data: { element, isLeaf: leaves.has(id) } };
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
export function toFlowEdges(flow: UISchemaElement): Edge[] {
  const conditions = new Set(
    drawnNodes(flow).flatMap(({ id, kind }) => (kind === 'condition' ? [id] : [])),
  );
  return flowEdges(flow).map(({ id, source, target, sourceHandle }) => {
    const handle = sourceHandle ?? (conditions.has(source) ? DEFAULT_HANDLE : undefined);
    return {
      id,
      source,
      target,
      // `exactOptionalPropertyTypes`: a Stage edge keeps an ABSENT key, never an explicit undefined.
      ...(handle === undefined ? {} : { sourceHandle: handle }),
      type: ACTION_EDGE_TYPE,
      markerEnd: { type: MarkerType.ArrowClosed },
    };
  });
}
