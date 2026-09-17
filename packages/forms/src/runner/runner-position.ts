import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { FORM_TYPE } from '../renderers/gridstack/grid-layouts';
import { drawnNodes, elementsOf, startStageId } from '../renderers/xyflow/flow-elements';
import { flowEdges } from '../renderers/xyflow/flow-graph';
import { conditionEdge, type RunnerData } from './criterion-match';

// Where the runner is, and where it goes next (doc 202 rules 13-18, 25). PURE — no React, no @xyflow/react — so
// `renderers/default`'s Flow entry may import it (rule 42), and no studio import (rule 45).
//
// Everything here is derived from the authored document plus the answers; the runner stores only the position
// and the visited set (the Data Model table), never a copy of the graph.

/**
 * Rule 14: where the runner is inside a `Flow` — a Stage, and one Form within it. A `Form` root has no stages,
 * so its position is `null` (rule 7); this type describes the Flow case alone.
 */
export interface RunnerPosition {
  readonly stageId: string;
  readonly formId: string;
}

/** The document and answers every traversal question is asked against. */
export interface RunnerFlow {
  /** The `Flow` root element. */
  readonly flow: UISchemaElement;
  readonly schema: JsonSchema;
  readonly data: RunnerData | undefined;
}

/**
 * Rule 14's result, discriminated rather than an overloaded `undefined`: the caller renders Next for
 * `'position'` and Submit for `'end'` (rule 16) without re-deriving which it is.
 */
export type RunnerStep =
  | { readonly kind: 'position'; readonly position: RunnerPosition }
  | { readonly kind: 'end' };

/** One `Form` of a Stage, as the runner addresses it. */
export interface StageForm {
  readonly element: UISchemaElement;
  /** Index among the Stage's Forms — not among its `elements`. */
  readonly index: number;
  readonly id: string;
  /** Whether `id` is the Form's own `options.id` (doc 197), so a host may put it in a URL. */
  readonly authored: boolean;
}

/** The prefix of a Form's id within its Stage when it has no usable `options.id`. */
const FORM_PLACEHOLDER_PREFIX = '__form-';

/**
 * A Stage's Forms in `elements` order, each with an id.
 *
 * Unlike a Stage's placeholder id (rule 13), a placeholder Form id IS navigable: nothing but the runner itself
 * ever addresses a Form by it — no edge does — so a Form authored before doc 197 (or pasted without an id) must
 * still be reachable, or a whole Stage would be unfillable. Ids are made unique within the Stage the same way
 * `drawnNodes` makes node ids unique, so a duplicated `options.id` cannot make two Forms the same position.
 */
export function stageFormsOf(stage: UISchemaElement): StageForm[] {
  const used = new Set<string>();
  const forms: StageForm[] = [];
  for (const element of elementsOf(stage)) {
    if (element.type !== FORM_TYPE) continue;
    const index = forms.length;
    const authored = element.options?.['id'];
    if (typeof authored === 'string' && authored !== '' && !used.has(authored)) {
      used.add(authored);
      forms.push({ element, index, id: authored, authored: true });
      continue;
    }
    let id = `${FORM_PLACEHOLDER_PREFIX}${index}`;
    for (let n = 2; used.has(id); n += 1) id = `${FORM_PLACEHOLDER_PREFIX}${index}-${n}`;
    used.add(id);
    forms.push({ element, index, id, authored: false });
  }
  return forms;
}

/**
 * Rule 13: the Stage `stageId` addresses, or `undefined`. A node with a PLACEHOLDER id is never returned — no
 * edge can address it, so it is unreachable by definition and the runner must not navigate to it — and neither
 * is a Condition, which is traversed, never visited.
 */
export function navigableStage(
  flow: UISchemaElement,
  stageId: string,
): UISchemaElement | undefined {
  return drawnNodes(flow).find(
    ({ id, authored, kind }) => authored && kind === 'stage' && id === stageId,
  )?.element;
}

/** Rule 25's sidebar gate: whether a Stage may be navigated to at all, before asking whether it was visited. */
export const isNavigableStage = (flow: UISchemaElement, stageId: string): boolean =>
  navigableStage(flow, stageId) !== undefined;

/**
 * The position on `stageId`'s FIRST Form, or `undefined` when the Stage is not navigable (rule 13) or holds no
 * Form to land on. Used for the start (rule 18), for each advance (rule 14) and by the sidebar when returning
 * to a visited Stage (rule 25) — one definition of "opening a Stage", so the three can never differ.
 */
export function firstPositionIn(
  flow: UISchemaElement,
  stageId: string,
): RunnerPosition | undefined {
  const stage = navigableStage(flow, stageId);
  const first = stage === undefined ? undefined : stageFormsOf(stage)[0];
  return first === undefined ? undefined : { stageId, formId: first.id };
}

/**
 * Rule 18: where a Flow begins — the Stage `startStageId` names, on its first Form.
 *
 * The fallbacks all live in `startStageId` (doc 203 rules 1-3): an absent `startId`, one naming a deleted Stage,
 * a Condition or a placeholder id all resolve to the first Stage in `elements` order, so a Flow authored before
 * doc 203 runs and a dangling start never dead-ends. `undefined` here means the Flow has no usable Stage at all,
 * or its start holds no Forms.
 */
export function startPosition(flow: UISchemaElement): RunnerPosition | undefined {
  const stageId = startStageId(flow);
  return stageId === undefined ? undefined : firstPositionIn(flow, stageId);
}

/**
 * Rules 15-17: the next Stage the answers lead to from `stageId` — the first one that actually holds a Form —
 * or `undefined` for the end of the flow (rule 16, where Submit lives).
 *
 * The walk reads the SANITISED `flowEdges` (doc 199 rule 7), never raw `options.edges`. From each node it takes
 * its outgoing edge: a Condition's is chosen by evaluating its criteria (`conditionEdge`, rules 19-23), while a
 * Stage — which the canvas only ever gives one outgoing edge — takes the FIRST in edge order, so a hand-edited
 * fan-out is deterministic rather than a throw. Reaching a Condition is not arriving anywhere, so the walk
 * continues through it.
 *
 * A Stage with NO Forms is transparent for the same reason: there is nothing to land on, so the walk continues
 * past it instead of stranding the user on an empty pane. That is a judgement the doc leaves open; the visited
 * set below makes it safe.
 *
 * Rule 17: the apply gate refuses a cycle-closing edge, but a hand-edited document never passed that gate — so
 * every node the walk touches goes into `seen` and a repeat ends the walk rather than looping forever.
 */
export function nextStageId(context: RunnerFlow, stageId: string): string | undefined {
  const { flow, schema, data } = context;
  const edges = flowEdges(flow);
  const nodes = new Map(
    drawnNodes(flow).flatMap((node) => (node.authored ? [[node.id, node] as const] : [])),
  );

  const seen = new Set<string>([stageId]);
  let current = stageId;
  for (;;) {
    const node = nodes.get(current);
    const edge =
      node?.kind === 'condition'
        ? conditionEdge({ condition: node.element, nodeId: current, edges, schema, data })
        : edges.find((candidate) => candidate.source === current);
    // No outgoing edge — including a Condition with no default path, and a placeholder id no edge can name.
    if (edge === undefined) return undefined;
    if (seen.has(edge.target)) return undefined;
    seen.add(edge.target);

    const target = nodes.get(edge.target);
    // `flowEdges` drops an edge whose end names no drawn node, so this only guards a future sanitiser change.
    if (target === undefined) return undefined;
    if (target.kind === 'stage' && stageFormsOf(target.element).length > 0) return edge.target;
    current = edge.target;
  }
}

/**
 * Rule 14: advancing — the next Form of the current Stage, else the first Form of the next Stage (rules 15-17),
 * else the end of the flow.
 *
 * A position whose Stage or Form no longer resolves (the document changed under the runner) is not an error: it
 * falls through to the stage walk, and then to `'end'`, so the user lands on Submit rather than nowhere.
 */
export function nextStep(context: RunnerFlow, position: RunnerPosition): RunnerStep {
  const { flow } = context;
  const stage = navigableStage(flow, position.stageId);
  if (stage !== undefined) {
    const forms = stageFormsOf(stage);
    const index = forms.findIndex((form) => form.id === position.formId);
    const next = index < 0 ? undefined : forms[index + 1];
    if (next !== undefined)
      return { kind: 'position', position: { stageId: position.stageId, formId: next.id } };
  }

  const stageId = nextStageId(context, position.stageId);
  const opened = stageId === undefined ? undefined : firstPositionIn(flow, stageId);
  // `nextStageId` only returns a Stage that holds a Form, so `opened` is defined whenever `stageId` is.
  return opened === undefined ? { kind: 'end' } : { kind: 'position', position: opened };
}

/** Whether the flow ends here, so the action bar shows Submit instead of Next (rule 16). */
export const isFinalStep = (context: RunnerFlow, position: RunnerPosition): boolean =>
  nextStep(context, position).kind === 'end';

/**
 * Rule 25: the Stages reached so far, so the sidebar can offer a return to a visited Stage but refuse a skip
 * ahead — a branch is decided by upstream answers, and a Stage never reached may be one those answers would
 * never select.
 *
 * The SAME set comes back when the Stage is already in it. That identity matters: the runner holds this in
 * React state, so a no-op re-visit (Back, then Next again) must not produce a new set and a re-render.
 */
export function visitedWith(
  visited: ReadonlySet<string>,
  stageId: string | undefined,
): ReadonlySet<string> {
  if (stageId === undefined || visited.has(stageId)) return visited;
  return new Set(visited).add(stageId);
}
