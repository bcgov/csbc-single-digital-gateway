import type { UISchemaElement } from '@jsonforms/core';
import { FORM_TYPE } from '../../renderers/gridstack/grid-layouts';
import {
  authoredStageId,
  CONDITION_TYPE,
  drawnNodes,
  FLOW_TYPE,
  STAGE_TYPE,
  startStageId,
  type FlowNodeKind,
} from '../../renderers/xyflow/flow-elements';
import { canConnect } from '../../renderers/xyflow/flow-gestures';
import { flowEdges } from '../../renderers/xyflow/flow-graph';
import type { ElementIds } from './element-ids';
import { findById, updateById, withElements, type TreeElement } from './element-tree';
import { formIdsUsed } from './form-address';

// Flow edits in the studio document (doc 196 rules 4, 6-7, 9, 18-20). Pure: every changed element is a new object
// carrying its studio id, and untouched subtrees keep identity. Refused edits return the same uischema.

/** An insert's result: the uischema, and the inserted element as it is in it, or `undefined` when refused. */
export interface FlowInsertResult {
  readonly uischema: UISchemaElement;
  readonly inserted: UISchemaElement | undefined;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `element` with `options` merged with `changes`, carrying its id. */
function withOptions(
  element: TreeElement,
  changes: Record<string, unknown>,
  ids: ElementIds,
): TreeElement {
  const next = { ...element, options: { ...element.options, ...changes } };
  ids.carry(element, next);
  return next;
}

/** A Flow's authored `options.edges` entries, or `[]`. */
const rawEdges = (flow: UISchemaElement): readonly unknown[] => {
  const edges = flow.options?.['edges'];
  return Array.isArray(edges) ? edges : [];
};

const edgeIdOf = (entry: unknown) => (isRecord(entry) ? entry['id'] : undefined);

/** A new id from `newId`, regenerated while `taken` has it. */
function freshId(taken: ReadonlySet<unknown>, newId: () => string): string {
  let id = newId();
  while (taken.has(id)) id = newId();
  return id;
}

/** Rule 6: `source → target` appended to the Flow's edges with a fresh `nanoid(8)` id, when `canConnect` allows it. */
export function connectStages(
  uischema: UISchemaElement,
  flowId: string,
  source: string,
  target: string,
  ids: ElementIds,
  newId: () => string,
  /**
   * Doc 199 rule 45c: the Condition ROW the drag left by, already normalised by `storedHandle` — so the Else
   * output and a Stage both arrive here as `undefined` and are stored with no handle at all (rule 18).
   */
  sourceHandle?: string,
): UISchemaElement {
  const root = uischema as TreeElement;
  const flow = findById(root, flowId, ids);
  if (flow?.type !== FLOW_TYPE || !canConnect(flow, source, target, sourceHandle)) return uischema;
  const edges = rawEdges(flow);
  const id = freshId(new Set(edges.map(edgeIdOf)), newId);
  const edge =
    sourceHandle === undefined ? { id, source, target } : { id, source, target, sourceHandle };
  return updateById(
    root,
    flowId,
    (element) => withOptions(element, { edges: [...edges, edge] }, ids),
    ids,
  );
}

/** Rule 7: the Flow without the edges whose id is in `edgeIds`. */
export function disconnectEdges(
  uischema: UISchemaElement,
  flowId: string,
  edgeIds: readonly string[],
  ids: ElementIds,
): UISchemaElement {
  const root = uischema as TreeElement;
  const flow = findById(root, flowId, ids);
  if (flow?.type !== FLOW_TYPE) return uischema;
  const drop = new Set(edgeIds);
  const edges = rawEdges(flow);
  const kept = edges.filter((entry) => !drop.has(edgeIdOf(entry) as string));
  if (kept.length === edges.length) return uischema;
  return updateById(root, flowId, (element) => withOptions(element, { edges: kept }, ids), ids);
}

/** Rule 9: `flow` without the edges touching `stageId`, carrying its id; the same Flow when none do. */
export function removeStageEdges(flow: TreeElement, stageId: string, ids: ElementIds): TreeElement {
  const edges = rawEdges(flow);
  const touches = (entry: unknown) =>
    isRecord(entry) && (entry['source'] === stageId || entry['target'] === stageId);
  const kept = edges.filter((entry) => !touches(entry));
  return kept.length === edges.length ? flow : withOptions(flow, { edges: kept }, ids);
}

/** Doc 203 rule 20: `flow` without its `options.startId` when that names `stageId`, carrying its id; the same Flow otherwise. */
export function clearFlowStart(flow: TreeElement, stageId: string, ids: ElementIds): TreeElement {
  if (flow.options?.['startId'] !== stageId) return flow;
  // The key is REMOVED, never set to `undefined`: `startStageId` falls back to the first Stage only on an absent
  // key, and `withOptions` merges, so it cannot drop one.
  const options = Object.fromEntries(
    Object.entries(flow.options ?? {}).filter(([key]) => key !== 'startId'),
  );
  const next = { ...flow, options };
  ids.carry(flow, next);
  return next;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Rule 20: `"<label> <n>"`, `n` one more than the highest among `type` elements labelled exactly `"<label> <digits>"`. */
export function nextElementLabel(root: UISchemaElement, type: string, label: string): string {
  const pattern = new RegExp(`^${escapeRegExp(label)} (\\d+)$`);
  let highest = 0;
  const visit = (element: TreeElement) => {
    const text = (element as { label?: unknown }).label;
    const match = element.type === type && typeof text === 'string' ? pattern.exec(text) : null;
    highest = Math.max(highest, Number(match?.[1] ?? 0));
    for (const child of element.elements ?? []) visit(child);
  };
  visit(root as TreeElement);
  return `${label} ${highest + 1}`;
}

/**
 * Rules 18, 20: a fresh `"Stage <n>"` holding one `"Form <m>"`, both with ids unused anywhere in `root`. Shared by
 * `insertStage` and `insertStageBetween` so an appended and an inserted Stage are identical but for their edges.
 *
 * Doc 198 rule 11: no `options.position` is written — where the Stage lands follows from its rank and its place in
 * `elements` (doc 198 rules 1-2).
 */
function newStageElement(root: TreeElement, newId: () => string): TreeElement {
  // Doc 199 rule 15: Stages and Conditions share ONE id-space, so a new id must avoid both.
  const taken = new Set(drawnNodes(root).map(({ element }) => authoredStageId(element)));
  return {
    type: STAGE_TYPE,
    label: nextElementLabel(root, STAGE_TYPE, 'Stage'),
    options: { id: freshId(taken, newId) },
    // Doc 197 rule 4: the Stage's Form is addressable from the moment it exists.
    elements: [
      {
        type: FORM_TYPE,
        label: nextElementLabel(root, FORM_TYPE, 'Form'),
        options: { id: freshId(formIdsUsed(root), newId) },
        elements: [],
      },
    ],
  } as TreeElement;
}

/**
 * Doc 199 rule 24: a fresh `"Condition <n>"`, with an id unused by any node (rule 15). It holds NO children —
 * a Condition is not a Layout — and starts with no criteria, which is a legal pass-through (rule 13); its
 * criteria are authored on the card afterwards, each born complete (rule 26).
 */
function newConditionElement(root: TreeElement, newId: () => string): TreeElement {
  const taken = new Set(drawnNodes(root).map(({ element }) => authoredStageId(element)));
  return {
    type: CONDITION_TYPE,
    label: nextElementLabel(root, CONDITION_TYPE, 'Condition'),
    options: { id: freshId(taken, newId), criteria: [] },
  } as TreeElement;
}

/** The new node of `kind`, so an appended and an inserted node are identical but for their edges. */
const newNodeElement = (root: TreeElement, kind: FlowNodeKind, newId: () => string): TreeElement =>
  kind === 'condition' ? newConditionElement(root, newId) : newStageElement(root, newId);

/**
 * Rules 18, 20, widened by doc 199 rules 20, 24: a Flow root gains a new node of `kind`, with a fresh id. When the
 * selected NODE has an authored id the new node is connected from it — from `sourceHandle` when one is given, which
 * is how a Condition's criterion output wires its branch (rule 20). Any other root is refused.
 *
 * The source is looked up in `drawnNodes`, not `drawnStages`: an append now starts at a Condition's output just as
 * readily as at a leaf Stage.
 */
export function insertNode(
  uischema: UISchemaElement,
  selectedId: string | null,
  kind: FlowNodeKind,
  sourceHandle: string | undefined,
  ids: ElementIds,
  newId: () => string,
): FlowInsertResult {
  const root = uischema as TreeElement;
  if (root.type !== FLOW_TYPE) return { uischema, inserted: undefined };
  const selected = selectedId === null ? undefined : findById(root, selectedId, ids);
  const drawn = drawnNodes(root).find((node) => node.element === selected);

  // Doc 203 rule 19: whether the Flow had a start at all is read BEFORE the insert.
  const startless = startStageId(root) === undefined;

  const node = newNodeElement(root, kind, newId);
  const id = authoredStageId(node) as string;

  let next = withElements(root, [...(root.elements ?? []), node], ids);
  if (drawn?.authored) {
    const edges = rawEdges(next);
    const edgeId = freshId(new Set(edges.map(edgeIdOf)), newId);
    // `exactOptionalPropertyTypes`, and rule 18: a default-path edge keeps NO handle key at all.
    const edge =
      sourceHandle === undefined
        ? { id: edgeId, source: drawn.id, target: id }
        : { id: edgeId, source: drawn.id, target: id, sourceHandle };
    next = withOptions(next, { edges: [...edges, edge] }, ids);
  }
  // Doc 203 rule 19: the FIRST Stage of a Flow is stamped as its start, so a flow built from the empty-Flow
  // origin `+` is never startless. Later Stages — and every Condition — leave it alone.
  if (kind === 'stage' && startless) next = withOptions(next, { startId: id }, ids);
  return { uischema: next, inserted: node };
}

/** `insertNode` for a Stage with no handle — the doc 198 shape, kept for its callers. */
export const insertStage = (
  uischema: UISchemaElement,
  selectedId: string | null,
  ids: ElementIds,
  newId: () => string,
): FlowInsertResult => insertNode(uischema, selectedId, 'stage', undefined, ids, newId);

/**
 * Doc 198 rule 10: the edge `edgeId` split in two by a new Stage. The existing edge KEEPS ITS ID and is retargeted at
 * the new Stage, then one edge `new → oldTarget` is appended, so the downstream Stage is never orphaned. Refused when
 * `flowId` is not the Flow root or `edgeId` is not one of its sanitised edges. A split can never close a cycle, so
 * `flowProblems` cannot be tripped by it.
 */
export function insertStageBetween(
  uischema: UISchemaElement,
  flowId: string,
  edgeId: string,
  kind: FlowNodeKind,
  ids: ElementIds,
  newId: () => string,
): FlowInsertResult {
  const root = uischema as TreeElement;
  const flow = findById(root, flowId, ids);
  if (flow !== root || root.type !== FLOW_TYPE) return { uischema, inserted: undefined };
  const split = flowEdges(root).find((edge) => edge.id === edgeId);
  if (!split) return { uischema, inserted: undefined };

  const stage = newNodeElement(root, kind, newId);
  const stageId = authoredStageId(stage) as string;
  let next = withElements(root, [...(root.elements ?? []), stage], ids);

  const edges = rawEdges(next);
  const appended = freshId(new Set(edges.map(edgeIdOf)), newId);
  const retargeted = edges.map((entry) =>
    isRecord(entry) && entry['id'] === edgeId ? { ...entry, target: stageId } : entry,
  );
  next = withOptions(
    next,
    { edges: [...retargeted, { id: appended, source: stageId, target: split.target }] },
    ids,
  );
  return { uischema: next, inserted: stage };
}

/**
 * Rules 19-20: the selected Stage gains `"Form <n>"`, with a fresh address (doc 197 rule 4); refused unless a Stage is
 * selected.
 */
export function insertForm(
  uischema: UISchemaElement,
  selectedId: string | null,
  ids: ElementIds,
  newId: () => string,
): FlowInsertResult {
  const root = uischema as TreeElement;
  const stage = selectedId === null ? undefined : findById(root, selectedId, ids);
  if (selectedId === null || stage?.type !== STAGE_TYPE) return { uischema, inserted: undefined };
  const form = {
    type: FORM_TYPE,
    label: nextElementLabel(root, FORM_TYPE, 'Form'),
    options: { id: freshId(formIdsUsed(root), newId) },
    elements: [],
  } as TreeElement;
  const next = updateById(
    root,
    selectedId,
    (element) => withElements(element, [...(element.elements ?? []), form], ids),
    ids,
  );
  return { uischema: next, inserted: form };
}
