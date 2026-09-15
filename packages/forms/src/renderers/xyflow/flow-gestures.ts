import type { UISchemaElement } from '@jsonforms/core';
import type { FlowGesture } from './flow-editor';
import { drawnStages } from './flow-elements';
import { createsCycle, flowEdges } from './flow-graph';

// xyflow callbacks as Flow gestures (doc 196 rules 3-7). Pure — no React, no @xyflow/react at runtime — so the rules are
// unit-tested without driving xyflow, whose drags and connections jsdom cannot perform.

/** The parts of a dragged xyflow node a move reads. */
export interface DraggedStageNode {
  readonly position: { readonly x: number; readonly y: number };
  readonly data: { readonly element: UISchemaElement };
}

/** The parts of an xyflow connection a connect reads. */
export interface FlowConnection {
  readonly source: string | null | undefined;
  readonly target: string | null | undefined;
}

/**
 * Rule 5: whether `source → target` may be added — both ends are drawn Stages with their own authored id, they differ,
 * the pair is not already an edge, and the edge closes no cycle. Branches are allowed.
 */
export function canConnect(
  flow: UISchemaElement,
  source: string | null | undefined,
  target: string | null | undefined,
): boolean {
  if (!source || !target || source === target) return false;
  const authored = new Set(drawnStages(flow).flatMap(({ id, authored: own }) => (own ? [id] : [])));
  if (!authored.has(source) || !authored.has(target)) return false;
  const edges = flowEdges(flow);
  if (edges.some((edge) => edge.source === source && edge.target === target)) return false;
  return !createsCycle(edges, source, target);
}

/** Rule 4: a dropped Stage node as a move to its rounded position, addressed by its element's id. */
export function moveGesture(
  node: DraggedStageNode,
  idOf: (element: UISchemaElement) => string,
): FlowGesture {
  return {
    type: 'move',
    stageId: idOf(node.data.element),
    position: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
  };
}

/** Rule 6: an accepted connection as a connect, or `undefined` when an end is missing. */
export function connectGesture(
  flowId: string,
  connection: FlowConnection,
): FlowGesture | undefined {
  const { source, target } = connection;
  return source && target ? { type: 'connect', flowId, source, target } : undefined;
}

/** Rule 7: the edges xyflow is about to delete as a disconnect, or `undefined` when there are none. */
export function disconnectGesture(
  flowId: string,
  edges: readonly { readonly id: string }[],
): FlowGesture | undefined {
  return edges.length > 0
    ? { type: 'disconnect', flowId, edgeIds: edges.map(({ id }) => id) }
    : undefined;
}
