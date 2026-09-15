import type { UISchemaElement } from '@jsonforms/core';
import { MarkerType, type Edge, type Node } from '@xyflow/react';
import { drawnStages } from './flow-elements';
import { flowEdges } from './flow-graph';
import { stagePositions } from './flow-positions';

// A Flow element as xyflow nodes and edges (doc 195 rules 8, 10, 12), derived from the uischema alone.

/** The xyflow node type every Stage is drawn with. */
export const STAGE_NODE_TYPE = 'stage';

export type StageNodeData = { element: UISchemaElement };
export type StageFlowNode = Node<StageNodeData, typeof STAGE_NODE_TYPE>;

/** Rule 8: one node per Stage in `elements` order, at its rule 12 position, carrying its element. */
export function toFlowNodes(flow: UISchemaElement): StageFlowNode[] {
  const positions = stagePositions(flow);
  return drawnStages(flow).map(({ element, id }) => ({
    id,
    type: STAGE_NODE_TYPE,
    position: positions.get(id) ?? { x: 0, y: 0 },
    data: { element },
  }));
}

/** Rule 10: the sanitised edges, each with an arrow at its target. */
export function toFlowEdges(flow: UISchemaElement): Edge[] {
  return flowEdges(flow).map(({ id, source, target }) => ({
    id,
    source,
    target,
    markerEnd: { type: MarkerType.ArrowClosed },
  }));
}
