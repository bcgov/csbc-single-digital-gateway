import type { UISchemaElement } from '@jsonforms/core';
import { FORM_TYPE } from '../../renderers/gridstack/grid-layouts';
import {
  authoredStageId,
  drawnStages,
  FLOW_TYPE,
  STAGE_TYPE,
} from '../../renderers/xyflow/flow-elements';
import { canConnect } from '../../renderers/xyflow/flow-gestures';
import { STAGE_COLUMN_WIDTH, stagePositions } from '../../renderers/xyflow/flow-positions';
import type { StagePosition } from '../../types/elements';
import type { ElementIds } from './element-ids';
import { findById, updateById, withElements, type TreeElement } from './element-tree';

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

/** Rule 4: the Stage with `stageId` at `position` (rounded) — an auto-placed Stage becomes authored. */
export function moveStage(
  uischema: UISchemaElement,
  stageId: string,
  position: StagePosition,
  ids: ElementIds,
): UISchemaElement {
  const root = uischema as TreeElement;
  if (findById(root, stageId, ids)?.type !== STAGE_TYPE) return uischema;
  const rounded = { x: Math.round(position.x), y: Math.round(position.y) };
  return updateById(root, stageId, (stage) => withOptions(stage, { position: rounded }, ids), ids);
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

/** Rule 18: where a new Stage goes — right of the selected Stage, else right of the right-most Stage, else the origin. */
function newStagePosition(
  flow: UISchemaElement,
  selectedStageId: string | undefined,
): StagePosition {
  const positions = stagePositions(flow);
  const selected = selectedStageId === undefined ? undefined : positions.get(selectedStageId);
  if (selected) return { x: selected.x + STAGE_COLUMN_WIDTH, y: selected.y };
  const xs = [...positions.values()].map(({ x }) => x);
  return xs.length > 0 ? { x: Math.max(...xs) + STAGE_COLUMN_WIDTH, y: 0 } : { x: 0, y: 0 };
}

/**
 * Rules 18, 20: a Flow root gains `"Stage <n>"` holding one `"Form <m>"`, with a fresh id. With a Stage selected it sits
 * right of it and — when the selected Stage has an authored id — is connected from it. Any other root is refused.
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

  const id = freshId(new Set(stages.map(({ element }) => authoredStageId(element))), newId);
  const stage = {
    type: STAGE_TYPE,
    label: nextElementLabel(root, STAGE_TYPE, 'Stage'),
    options: { id, position: newStagePosition(root, drawn?.id) },
    elements: [{ type: FORM_TYPE, label: nextElementLabel(root, FORM_TYPE, 'Form'), elements: [] }],
  } as TreeElement;

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

/** Rules 19-20: the selected Stage gains `"Form <n>"`; refused unless a Stage is selected. */
export function insertForm(
  uischema: UISchemaElement,
  selectedId: string | null,
  ids: ElementIds,
): FlowInsertResult {
  const root = uischema as TreeElement;
  const stage = selectedId === null ? undefined : findById(root, selectedId, ids);
  if (selectedId === null || stage?.type !== STAGE_TYPE) return { uischema, inserted: undefined };
  const form = {
    type: FORM_TYPE,
    label: nextElementLabel(root, FORM_TYPE, 'Form'),
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
