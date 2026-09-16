import type { UISchemaElement } from '@jsonforms/core';
import { FORM_TYPE } from '../../renderers/gridstack/grid-layouts';
import {
  authoredStageId,
  drawnStages,
  FLOW_TYPE,
  STAGE_TYPE,
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
): UISchemaElement {
  const root = uischema as TreeElement;
  const flow = findById(root, flowId, ids);
  if (flow?.type !== FLOW_TYPE || !canConnect(flow, source, target)) return uischema;
  const edges = rawEdges(flow);
  const id = freshId(new Set(edges.map(edgeIdOf)), newId);
  return updateById(
    root,
    flowId,
    (element) => withOptions(element, { edges: [...edges, { id, source, target }] }, ids),
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
  const taken = new Set(drawnStages(root).map(({ element }) => authoredStageId(element)));
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
 * Rules 18, 20: a Flow root gains `"Stage <n>"` holding one `"Form <m>"`, with a fresh id. When the selected Stage has
 * an authored id the new Stage is connected from it. Any other root is refused.
 */
export function insertStage(
  uischema: UISchemaElement,
  selectedId: string | null,
  ids: ElementIds,
  newId: () => string,
): FlowInsertResult {
  const root = uischema as TreeElement;
  if (root.type !== FLOW_TYPE) return { uischema, inserted: undefined };
  const stages = drawnStages(root);
  const selected = selectedId === null ? undefined : findById(root, selectedId, ids);
  const drawn = stages.find((stage) => stage.element === selected);

  const stage = newStageElement(root, newId);
  const id = authoredStageId(stage) as string;

  let next = withElements(root, [...(root.elements ?? []), stage], ids);
  if (drawn?.authored) {
    const edges = rawEdges(next);
    const edgeId = freshId(new Set(edges.map(edgeIdOf)), newId);
    next = withOptions(
      next,
      { edges: [...edges, { id: edgeId, source: drawn.id, target: id }] },
      ids,
    );
  }
  return { uischema: next, inserted: stage };
}

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
  ids: ElementIds,
  newId: () => string,
): FlowInsertResult {
  const root = uischema as TreeElement;
  const flow = findById(root, flowId, ids);
  if (flow !== root || root.type !== FLOW_TYPE) return { uischema, inserted: undefined };
  const split = flowEdges(root).find((edge) => edge.id === edgeId);
  if (!split) return { uischema, inserted: undefined };

  const stage = newStageElement(root, newId);
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
