import type { UISchemaElement } from '@jsonforms/core';
import { MarkerType, type Edge, type Node } from '@xyflow/react';
import { drawnStages } from './flow-elements';
import { flowEdges, leafStageIds } from './flow-graph';
import { stagePositions } from './flow-positions';

// A Flow element as xyflow nodes and edges (doc 195 rules 8, 10, 12), derived from the uischema alone.

/** The xyflow node type every Stage is drawn with. */
export const STAGE_NODE_TYPE = 'stage';
/** Doc 198 rule 9: the xyflow edge type every connection is drawn with. */
export const ACTION_EDGE_TYPE = 'action';

/** Doc 198 rule 9: an edge carries the Flow's element id, which the + needs for its `insert-between` gesture. */
export type ActionEdgeData = { flowId: string };
export type ActionFlowEdge = Edge<ActionEdgeData, typeof ACTION_EDGE_TYPE>;

/** Doc 198 rule 7: `isLeaf` is what the dangling + affordance hangs off. */
export type StageNodeData = { element: UISchemaElement; isLeaf: boolean };
export type StageFlowNode = Node<StageNodeData, typeof STAGE_NODE_TYPE>;

/**
 * Rule 8: one node per Stage in `elements` order, at its doc 198 rule 2 position, carrying its element and whether it
 * is a leaf (doc 198 rule 6). Nodes are never selected, dragged or deleted by xyflow (doc 196 rule 7, doc 198 rule 4):
 * the studio selects Stages through its own port, and an editable Flow turns `elementsSelectable` on only so its edges
 * can be selected and deleted.
 */
export function toFlowNodes(flow: UISchemaElement): StageFlowNode[] {
  const positions = stagePositions(flow);
  const leaves = new Set(leafStageIds(flow));
  return drawnStages(flow).map(({ element, id }) => ({
    id,
    type: STAGE_NODE_TYPE,
    position: positions.get(id) ?? { x: 0, y: 0 },
    data: { element, isLeaf: leaves.has(id) },
    selectable: false,
    deletable: false,
  }));
}

/** Rule 10: the sanitised edges, each drawn as an ActionEdge with an arrow at its target (doc 198 rule 9). */
export function toFlowEdges(flow: UISchemaElement): Edge[] {
  return flowEdges(flow).map(({ id, source, target }) => ({
    id,
    source,
    target,
    type: ACTION_EDGE_TYPE,
    markerEnd: { type: MarkerType.ArrowClosed },
  }));
}
