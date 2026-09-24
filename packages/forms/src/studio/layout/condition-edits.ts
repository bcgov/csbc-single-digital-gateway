import { authoredId } from '../../renderers/ui/authored-id';
import { nextRowLabel } from '../../renderers/xyflow/condition-rows';
import { rowsOf } from '../../renderers/xyflow/flow-elements';
import type { ConditionRow } from '../../types/elements';
import { updateById } from './element-tree';
import {
  conditionAt,
  fieldsOf,
  freshId,
  newClause,
  rawEdges,
  replacingRow,
  withOptions,
  withRows,
} from './condition-edit-parts';
import type { ElementIds } from './element-ids';
import type { TreeElement } from './element-tree';
import type { StudioDocument } from './schema-properties';

// Row edits on a Condition (doc 199 rules 27, 46, 48-49): the four gestures that change WHICH branches a
// Condition has and in what order. The clauses inside a row are edited in `clause-edits.ts`.

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Rule 46: the Condition gains a row labelled `Condition <n>` holding ONE complete clause — the first upstream
 * field, that kind's first operator, and a value of the right type where one is needed. Refused, returning the
 * same document, when the id is not a Condition or nothing is upstream: any clause it could create would be
 * invalid, and a UI-authored document must always stay appliable by the code editor's gate.
 */
export function addRow(
  document: StudioDocument,
  conditionId: string,
  ids: ElementIds,
  newId: () => string,
): StudioDocument {
  const root = document.uischema as TreeElement;
  const condition = conditionAt(root, conditionId, ids);
  if (!condition) return document;

  const rows = rowsOf(condition);
  const clause = newClause(fieldsOf(document, condition), new Set(), newId);
  if (!clause) return document;

  const id = freshId(new Set(rows.map((row) => row.id)), newId);
  const row: ConditionRow = {
    id,
    label: nextRowLabel(rows),
    match: 'all',
    clauses: [clause],
  };
  return withRows(document, conditionId, [...rows, row], ids);
}

/**
 * Rules 27, 48: the row is dropped, and with it every edge that leaves by it — an edge whose
 * `(source, sourceHandle)` names it. The Else edge and the other rows' edges are untouched.
 */
export function removeRow(
  document: StudioDocument,
  conditionId: string,
  rowId: string,
  ids: ElementIds,
): StudioDocument {
  const root = document.uischema as TreeElement;
  const condition = conditionAt(root, conditionId, ids);
  if (!condition) return document;

  const rows = rowsOf(condition);
  const kept = rows.filter((row) => row.id !== rowId);
  if (kept.length === rows.length) return document;

  const next = withRows(document, conditionId, kept, ids);
  const conditionAuthoredId = authoredId(condition);
  if (conditionAuthoredId === undefined) return next;

  // The Flow is the root: a Condition is only ever a Flow child.
  const flow = next.uischema as TreeElement;
  const edges = rawEdges(flow);
  const remaining = edges.filter(
    (entry) =>
      !(
        isRecord(entry) &&
        entry['source'] === conditionAuthoredId &&
        entry['sourceHandle'] === rowId
      ),
  );
  if (remaining.length === edges.length) return next;
  return { schema: next.schema, uischema: withOptions(flow, { edges: remaining }, ids) };
}

/**
 * Rule 48: the row's own settings — its label and its `match`. Neither can make a row invalid, so unlike
 * `setClause` this is never refused for the patch's content; an unknown row id still returns the document.
 */
export function setRow(
  document: StudioDocument,
  conditionId: string,
  rowId: string,
  patch: Partial<Pick<ConditionRow, 'label' | 'match'>>,
  ids: ElementIds,
): StudioDocument {
  const root = document.uischema as TreeElement;
  const condition = conditionAt(root, conditionId, ids);
  if (!condition) return document;

  const rows = replacingRow(rowsOf(condition), rowId, (row) => ({ ...row, ...patch }));
  return rows === undefined ? document : withRows(document, conditionId, rows, ids);
}

/**
 * Rule 49: the row moves to `toIndex`, and order IS evaluation order. NO edge is rewritten — a row keeps its id,
 * which is the `sourceHandle` its edge names, so the branch follows its row.
 *
 * `toIndex` is clamped rather than refused: a drag that overshoots the list means "last", which is what the
 * author saw while dragging.
 */
export function moveRow(
  document: StudioDocument,
  conditionId: string,
  rowId: string,
  toIndex: number,
  ids: ElementIds,
): StudioDocument {
  const root = document.uischema as TreeElement;
  const condition = conditionAt(root, conditionId, ids);
  if (!condition) return document;

  const rows = rowsOf(condition);
  const from = rows.findIndex((row) => row.id === rowId);
  if (from === -1) return document;
  const to = Math.max(0, Math.min(rows.length - 1, Math.trunc(toIndex)));
  if (to === from) return document;

  const moved = [...rows];
  const [row] = moved.splice(from, 1);
  if (row === undefined) return document;
  moved.splice(to, 0, row);
  return withRows(document, conditionId, moved, ids);
}

/**
 * Rule 51: the Condition's mode. It is stored on `options` beside the rows and changes NONE of them — switching
 * is lossless, which is exactly why the toggle is gated on `switchField` rather than on a conversion.
 */
export function setMode(
  document: StudioDocument,
  conditionId: string,
  mode: 'rules' | 'switch',
  ids: ElementIds,
): StudioDocument {
  const root = document.uischema as TreeElement;
  const condition = conditionAt(root, conditionId, ids);
  if (!condition) return document;
  const uischema = updateById(
    root,
    conditionId,
    (element) => withOptions(element, { mode }, ids),
    ids,
  );
  return { schema: document.schema, uischema };
}
