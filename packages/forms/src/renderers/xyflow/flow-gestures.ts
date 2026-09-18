import type { UISchemaElement } from '@jsonforms/core';
import type { FlowGesture } from './flow-editor';
import { DEFAULT_HANDLE, drawnNodes } from './flow-elements';
import { createsCycle, flowEdges } from './flow-graph';

// xyflow callbacks as Flow gestures (doc 196 rules 3-7). Pure — no React, no @xyflow/react at runtime — so the rules are
// unit-tested without driving xyflow, whose drags and connections jsdom cannot perform.

/** The parts of an xyflow connection a connect reads. */
export interface FlowConnection {
  readonly source: string | null | undefined;
  readonly target: string | null | undefined;
  /**
   * Doc 199 rule 45c: the handle the drag STARTED at. Dropped before this, every edge dragged from a Condition
   * became its Else edge — the row the author actually pulled from stayed unwired, and its `+` stayed on the
   * card, which is what "I dragged from the row and nothing connected" looks like.
   */
  readonly sourceHandle?: string | null | undefined;
}

/**
 * Rule 5: whether `source → target` may be added — both ends are drawn NODES with their own authored id, they differ,
 * the edge is not already there, and it closes no cycle. Branches are allowed.
 *
 * Doc 199 rule 16: the ends are read from `drawnNodes`, not `drawnStages` — a Condition is an edge endpoint like any
 * other node, and reading Stages alone would make every connection to or from one impossible.
 *
 * Doc 199 rule 45c: an existing edge only blocks this one when it leaves BY THE SAME OUTPUT. Identity is
 * `(source, sourceHandle, target)` — rule 11 — so two of a Condition's rows may lead to the same Stage, which is
 * ordinary authoring. Comparing the pair alone refused the second row's drag outright.
 */
export function canConnect(
  flow: UISchemaElement,
  source: string | null | undefined,
  target: string | null | undefined,
  sourceHandle?: string | null | undefined,
): boolean {
  if (!source || !target || source === target) return false;
  const authored = new Set(drawnNodes(flow).flatMap(({ id, authored: own }) => (own ? [id] : [])));
  if (!authored.has(source) || !authored.has(target)) return false;
  const edges = flowEdges(flow);
  const handle = storedHandle(sourceHandle);
  if (
    edges.some(
      (edge) => edge.source === source && edge.target === target && edge.sourceHandle === handle,
    )
  )
    return false;
  return !createsCycle(edges, source, target);
}

/**
 * Doc 199 rule 18: the STORED form of a drag's source handle. The canvas addresses a Condition's default output
 * by the reserved `DEFAULT_HANDLE`, but a default edge is stored with NO handle at all — so the reserved id, and
 * a Stage's handle-less drag, both normalise to `undefined`. Storing the literal would leave an edge naming no
 * row, which `flowEdges` drops.
 */
export const storedHandle = (sourceHandle: string | null | undefined): string | undefined =>
  typeof sourceHandle === 'string' && sourceHandle !== '' && sourceHandle !== DEFAULT_HANDLE
    ? sourceHandle
    : undefined;

/** Rule 6: an accepted connection as a connect, or `undefined` when an end is missing. */
export function connectGesture(
  flowId: string,
  connection: FlowConnection,
): FlowGesture | undefined {
  const { source, target } = connection;
  if (!source || !target) return undefined;
  const sourceHandle = storedHandle(connection.sourceHandle);
  // `exactOptionalPropertyTypes`: an absent handle is an ABSENT KEY, which is what marks the default path.
  return sourceHandle === undefined
    ? { type: 'connect', flowId, source, target }
    : { type: 'connect', flowId, source, target, sourceHandle };
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
