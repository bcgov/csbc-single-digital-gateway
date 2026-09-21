import type { UISchemaElement } from '@jsonforms/core';
import type { FlowGesture } from './flow-editor';
import { DEFAULT_HANDLE, drawnNodes } from './flow-elements';
import {
  BRANCH_TAKEN_MESSAGE,
  createsCycle,
  CYCLE_MESSAGE,
  DEFAULT_TAKEN_MESSAGE,
  DUPLICATE_EDGE_MESSAGE,
  flowEdges,
  SELF_LOOP_MESSAGE,
  unknownStageMessage,
} from './flow-graph';

// xyflow callbacks as Flow gestures (doc 196 rules 3-7). Pure — no React, no @xyflow/react at runtime — so the rules are
// unit-tested without driving xyflow, whose drags and connections jsdom cannot perform.

/** Doc 209 rule 14: a drag released over the pane, or an edge end cleared — there is nothing to connect to. */
export const MISSING_END_MESSAGE = 'An edge needs a stage at each end.';

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
 * Rule 5, reshaped by doc 209 rule 14: WHY `source → target` may not be added, or `undefined` when it may.
 *
 * It replaces the boolean `canConnect`. A boolean carried no reason, and rule 15 has to tell the author why a
 * re-point snapped back — so the reason is produced where the rule is decided rather than re-derived, in
 * different words, by whoever needs to say it. "May connect" is `=== undefined` at the call sites; a second
 * `canConnect` wrapper would be one more thing that could drift from this.
 *
 * The messages are `flow-graph`'s OWN: the apply gate already refuses each of these in the code panel, and a
 * canvas that refused the same edit in different words would read as a different rule.
 *
 * Doc 199 rule 16: the ends are read from `drawnNodes`, not `drawnStages` — a Condition is an edge endpoint like
 * any other node, and reading Stages alone would make every connection to or from one impossible.
 *
 * Doc 199 rule 45c: an existing edge only blocks this one when it leaves BY THE SAME OUTPUT. Identity is
 * `(source, sourceHandle, target)` — rule 11 — so two of a Condition's rows may lead to the same Stage, which is
 * ordinary authoring. Comparing the pair alone refused the second row's drag outright.
 */
export function connectionProblem(
  flow: UISchemaElement,
  source: string | null | undefined,
  target: string | null | undefined,
  sourceHandle?: string | null | undefined,
  /**
   * Doc 209 rule 10: the edge BEING re-pointed, whose own entry must not count as the duplicate it is about to
   * stop being, nor as part of the graph it is about to leave. Absent for a brand new connection.
   */
  exceptEdgeId?: string,
): string | undefined {
  if (!source || !target) return MISSING_END_MESSAGE;
  if (source === target) return SELF_LOOP_MESSAGE;
  const kinds = new Map(
    drawnNodes(flow).flatMap(({ id, authored, kind }) => (authored ? [[id, kind] as const] : [])),
  );
  for (const end of [source, target]) if (!kinds.has(end)) return unknownStageMessage(end);
  const edges = flowEdges(flow).filter((edge) => edge.id !== exceptEdgeId);
  const handle = storedHandle(sourceHandle);
  const leaving = edges.filter((edge) => edge.source === source && edge.sourceHandle === handle);
  if (leaving.some((edge) => edge.target === target)) return DUPLICATE_EDGE_MESSAGE;
  /**
   * Doc 209 rule 11: one CONDITION OUTPUT, one destination. `flowEdges` keys an edge on
   * `(source, sourceHandle, target)` — which rightly lets two ROWS meet at one Stage (doc 199 rule 45c) — but
   * that key also admits one row leading to two, and an answer matching that row would then have two places to
   * go. The canvas already hides a connected output's `+`, so only a re-point could reach this.
   *
   * A STAGE is exempt: two edges off one Stage are an ordinary branch (rule 5, "Branches are allowed"), and it
   * has no outputs to be occupied.
   */
  if (kinds.get(source) === 'condition' && leaving.length > 0)
    return handle === undefined ? DEFAULT_TAKEN_MESSAGE : BRANCH_TAKEN_MESSAGE;
  return createsCycle(edges, source, target) ? CYCLE_MESSAGE : undefined;
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
