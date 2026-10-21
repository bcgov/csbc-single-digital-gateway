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

/**
 * Doc 209 rules 8-9: which ends of an edge a re-point moves. An absent key leaves that end alone.
 *
 * Declared HERE rather than beside `repointEdge`: the drag gesture carries one across the editor port, and
 * `renderers/xyflow` may never import the studio.
 */
export interface EdgePatch {
  readonly source?: string;
  readonly target?: string;
  /**
   * The Condition ROW the edge leaves by. `DEFAULT_HANDLE`, `''` and `undefined` all mean the Else path, which
   * is stored as no handle at all (doc 199 rule 18).
   */
  readonly sourceHandle?: string | undefined;
}

/** The shape of an xyflow edge change this file reads. Structural, so xyflow's own type is not needed here. */
interface EdgeChange {
  readonly type: string;
  readonly id?: string;
  readonly selected?: boolean;
}

/**
 * Doc 209 rule 2: xyflow's edge selection, as a gesture — the edge a batch of changes SELECTS, or `null` when
 * it only deselects, and `undefined` when the batch is about something else (a measurement, a removal).
 *
 * A click deselects every other edge and selects one, so the batch carries both kinds; the selected one wins.
 * Returning `undefined` for an unrelated batch matters — every layout pass emits changes, and treating those as
 * "nothing is selected" would clear the panel out from under the author.
 */
export function selectEdgeGesture(
  flowId: string,
  changes: readonly EdgeChange[],
): FlowGesture | undefined {
  const selections = changes.filter((change) => change.type === 'select');
  if (selections.length === 0) return undefined;
  const chosen = selections.find((change) => change.selected === true);
  return { type: 'select-edge', flowId, edgeId: chosen?.id ?? null };
}

/**
 * Doc 209 rule 19: an edge end dragged onto another node, as a re-point. `undefined` when the drag was released
 * over nothing — xyflow reports a connection with a missing end, which is not an edit, just an abandoned drag.
 *
 * The WHOLE connection is sent, not the end that moved: xyflow does not say which one did, and `repointEdge`
 * ignores an end that did not change anyway (rule 9).
 */
export function reconnectGesture(
  flowId: string,
  edgeId: string,
  connection: FlowConnection,
): FlowGesture | undefined {
  const { source, target } = connection;
  if (!source || !target) return undefined;
  return {
    type: 'repoint',
    flowId,
    edgeId,
    patch: { source, target, sourceHandle: storedHandle(connection.sourceHandle) },
  };
}

/** The part of xyflow's final connection state a refused reconnect reads. Structural — no xyflow import. */
export interface ReconnectEnd {
  /** `false` once the drag settled over a handle it may not join; `null` when it settled over nothing. */
  readonly isValid: boolean | null;
  readonly toHandle: { readonly nodeId: string; readonly id?: string | null } | null;
}

/**
 * Which end of the edge stays PUT — xyflow's `handleType` here is the ANCHOR, not the end being dragged
 * (`EdgeUpdateAnchors`: grabbing the target anchor calls back with `type: 'source'`, the handle the
 * connection is still attached to). Reading it as the moving end inverts every refusal, which is how a
 * dragged target reported the Else path of the node it was dropped on. Found by hand.
 */
export type ReconnectAnchor = 'source' | 'target';

/**
 * Doc 209 rules 15-16: a reconnect xyflow REFUSED, as the re-point it was reaching for.
 *
 * `isValidConnection` runs during a reconnect too, so a drop xyflow judges invalid never reaches `onReconnect`
 * — the edge snaps back in silence, and the author is told nothing. Found by hand: the inspector's pickers
 * reported their reasons and the identical drag reported none.
 *
 * Emitting the re-point anyway is deliberate rather than a second refusal path: `repointEdge` is the single
 * judge (rule 10), so the drag and the panel produce the SAME message, and a drop that turns out to be fine
 * after all simply lands. `undefined` for a drag released over nothing — that is an abandoned gesture, not an
 * edit to explain.
 */
export function reconnectRefusal(
  flowId: string,
  edge: { readonly id: string },
  anchor: ReconnectAnchor,
  state: ReconnectEnd,
): FlowGesture | undefined {
  if (state.isValid !== false || state.toHandle === null) return undefined;
  const { nodeId, id } = state.toHandle;
  // The end that MOVED is the other one from the anchor.
  const patch: EdgePatch =
    anchor === 'source' ? { target: nodeId } : { source: nodeId, sourceHandle: storedHandle(id) };
  return { type: 'repoint', flowId, edgeId: edge.id, patch };
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
