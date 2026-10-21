import type { UISchemaElement } from '@jsonforms/core';
import {
  CONDITION_TYPE,
  DEFAULT_HANDLE,
  drawnNodes,
  FLOW_TYPE,
  rowsOf,
} from '../../renderers/xyflow/flow-elements';
import type { ElementIds } from './element-ids';
import { findById, updateById, type TreeElement } from './element-tree';
import {
  connectionProblem,
  storedHandle,
  type EdgePatch,
} from '../../renderers/xyflow/flow-gestures';

export type { EdgePatch };

// Re-pointing one edge of a Flow (doc 209 rules 8-13). Pure — no React, no ids, no studio state — so the
// inspector panel and the drag of an edge's tip run the SAME rule from their two entry points (rule 19).

/** A re-point's outcome: the Flow to keep, and WHY it was refused when it was (rules 14-15). */
export interface RepointResult {
  readonly uischema: UISchemaElement;
  /** Absent when the edit landed. A refusal returns the Flow UNCHANGED, so the canvas snaps back by itself. */
  readonly problem?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A Flow's authored `options.edges` entries, or `[]` — the RAW ones, so keys this file does not know survive. */
const rawEdges = (flow: UISchemaElement): readonly unknown[] => {
  const edges = flow.options?.['edges'];
  return Array.isArray(edges) ? edges : [];
};

const stringOr = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback;

/**
 * Rule 8: the handle `source` can actually honour — `undefined` when it is not a Condition, or when the row it
 * names is not one of that Condition's.
 *
 * DROPPED rather than refused. An author moving an edge onto a Stage is saying where it should now start; the
 * branch it used to leave by is not a second intention to be argued with, it is simply no longer meaningful.
 */
function honouredHandle(
  flow: UISchemaElement,
  source: string,
  handle: string | undefined,
): string | undefined {
  if (handle === undefined) return undefined;
  const node = drawnNodes(flow).find(({ id, authored }) => authored && id === source);
  if (node?.element.type !== CONDITION_TYPE) return undefined;
  return rowsOf(node.element).some((row) => row.id === handle) ? handle : undefined;
}

/**
 * Doc 209 rules 9-13: `flow` with the edge `edgeId` re-pointed, or `flow` itself when nothing changed, the edge
 * is not there, or a rule refuses the move — in which case `problem` says which.
 *
 * Rule 10: the check is `connectionProblem`, the same one a NEW connection runs, passing `edgeId` so the edge is
 * not measured against its own entry. A re-pointed edge is a new connection with an old id; two separate rules
 * would be two rules to keep in step.
 *
 * Identity is preserved on a no-op (rule 9, doc 187 rule 15): `applyInspector` re-renders the canvas whenever
 * the document object changes, so returning a fresh-but-equal Flow would flicker on every keystroke-free edit.
 */
export function repointEdge(
  flow: UISchemaElement,
  edgeId: string,
  patch: EdgePatch,
): RepointResult {
  const entries = rawEdges(flow);
  const index = entries.findIndex((entry) => isRecord(entry) && entry['id'] === edgeId);
  const entry = entries[index];
  if (!isRecord(entry)) return { uischema: flow };

  const source = patch.source ?? stringOr(entry['source'], '');
  const target = patch.target ?? stringOr(entry['target'], '');
  const asked =
    'sourceHandle' in patch ? patch.sourceHandle : (entry['sourceHandle'] as string | undefined);
  const handle = honouredHandle(flow, source, storedHandle(asked));

  const current = storedHandle(entry['sourceHandle'] as string | undefined);
  if (source === entry['source'] && target === entry['target'] && handle === current)
    return { uischema: flow };

  const problem = connectionProblem(flow, source, target, handle ?? DEFAULT_HANDLE, edgeId);
  if (problem !== undefined) return { uischema: flow, problem };

  // `exactOptionalPropertyTypes`: an Else edge carries NO key, which is precisely what marks the default path.
  const { sourceHandle: _dropped, ...rest } = entry;
  const next = {
    ...rest,
    source,
    target,
    ...(handle === undefined ? {} : { sourceHandle: handle }),
  };
  const edges = [...entries];
  edges[index] = next;
  return { uischema: { ...flow, options: { ...flow.options, edges } } };
}

/**
 * Doc 209 rule 9: the same re-point, addressed by the FLOW's studio element id — what the inspector panel and
 * the tip drag both call. Returns the whole document, so it can be handed straight to a state updater.
 *
 * The Flow element is rebuilt, so its id has to be CARRIED (doc 187's trap: `updateById` carries ids only for
 * rebuilt ANCESTORS, and without this the first edit would drop the selection).
 */
export function repointEdgeIn(
  uischema: UISchemaElement,
  flowId: string,
  edgeId: string,
  patch: EdgePatch,
  ids: ElementIds,
): RepointResult {
  const root = uischema as TreeElement;
  const flow = findById(root, flowId, ids);
  if (flow?.type !== FLOW_TYPE) return { uischema };
  const { uischema: next, problem } = repointEdge(flow, edgeId, patch);
  if (problem !== undefined) return { uischema, problem };
  if (next === flow) return { uischema };
  return {
    uischema: updateById(
      root,
      flowId,
      (element) => {
        const rebuilt = next as TreeElement;
        ids.carry(element, rebuilt);
        return rebuilt;
      },
      ids,
    ),
  };
}
