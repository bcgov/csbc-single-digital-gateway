import { clauseProblems, operatorsFor, takesList } from '../../renderers/xyflow/criteria';
import { rowsOf } from '../../renderers/xyflow/flow-elements';
import type { Clause } from '../../types/elements';
import type { CriterionField } from '../../renderers/xyflow/criteria';
import {
  conditionAt,
  fieldsOf,
  newClause,
  replacingRow,
  startingValue,
  withRows,
} from './condition-edit-parts';
import type { ElementIds } from './element-ids';
import type { TreeElement } from './element-tree';
import type { StudioDocument } from './schema-properties';

// Clause edits inside a Condition's row (doc 199 rules 28, 36, 48). A clause never changes its row, and a row
// never changes its id, so no clause edit can move or detach a branch's edges.

/** Rule 48: the row gains another complete clause, built exactly as `addRow` builds its first. */
export function addClause(
  document: StudioDocument,
  conditionId: string,
  rowId: string,
  ids: ElementIds,
  newId: () => string,
): StudioDocument {
  const root = document.uischema as TreeElement;
  const condition = conditionAt(root, conditionId, ids);
  if (!condition) return document;

  const rows = rowsOf(condition);
  const current = rows.find((row) => row.id === rowId);
  if (!current) return document;

  const clause = newClause(
    fieldsOf(document, condition),
    new Set(current.clauses.map((entry) => entry.id)),
    newId,
  );
  if (!clause) return document;

  const next = replacingRow(rows, rowId, (row) => ({ ...row, clauses: [...row.clauses, clause] }));
  return next === undefined ? document : withRows(document, conditionId, next, ids);
}

/**
 * Rule 48: the clause is dropped. The LAST clause of a row can never be removed — a row with no clauses never
 * matches (rule 38), so it would be an output that can never be taken; the popover clears it instead.
 */
export function removeClause(
  document: StudioDocument,
  conditionId: string,
  rowId: string,
  clauseId: string,
  ids: ElementIds,
): StudioDocument {
  const root = document.uischema as TreeElement;
  const condition = conditionAt(root, conditionId, ids);
  if (!condition) return document;

  const rows = rowsOf(condition);
  const current = rows.find((row) => row.id === rowId);
  if (!current || current.clauses.length <= 1) return document;
  const kept = current.clauses.filter((clause) => clause.id !== clauseId);
  if (kept.length === current.clauses.length) return document;

  const next = replacingRow(rows, rowId, (row) => ({ ...row, clauses: kept }));
  return next === undefined ? document : withRows(document, conditionId, next, ids);
}

/**
 * Rule 28: `patch` applied to the clause. Changing the field to one of a DIFFERENT kind resets the operator and
 * value — neither is valid across kinds (rule 1) — while a same-kind field keeps both. Changing only the
 * operator between a scalar and a LIST one resets the value for the same reason (rule 36). The clause's id never
 * changes, and neither does its row's, so the branch's edges stay attached. A patch that would leave the clause
 * invalid is refused.
 */
export function setClause(
  document: StudioDocument,
  conditionId: string,
  rowId: string,
  clauseId: string,
  patch: Partial<Omit<Clause, 'id'>>,
  ids: ElementIds,
): StudioDocument {
  const root = document.uischema as TreeElement;
  const condition = conditionAt(root, conditionId, ids);
  if (!condition) return document;

  const rows = rowsOf(condition);
  const current = rows.find((row) => row.id === rowId)?.clauses.find((c) => c.id === clauseId);
  if (!current) return document;

  const fields = fieldsOf(document, condition);
  const next = patchedClause(current, patch, fields);
  if (clauseProblems(next, fields).length > 0) return document;

  const rewritten = replacingRow(rows, rowId, (row) => ({
    ...row,
    clauses: row.clauses.map((clause) => (clause.id === clauseId ? next : clause)),
  }));
  return rewritten === undefined ? document : withRows(document, conditionId, rewritten, ids);
}

/** Rules 28, 36: `patch` applied, with the operator and value reset wherever the patch invalidates them. */
function patchedClause(
  current: Clause,
  patch: Partial<Omit<Clause, 'id'>>,
  fields: readonly CriterionField[],
): Clause {
  const kindOf = (key: string) => fields.find((field) => field.key === key)?.kind;
  const nextField = patch.field ?? current.field;
  const changedKind =
    patch.field !== undefined &&
    patch.field !== current.field &&
    kindOf(nextField) !== kindOf(current.field);

  const field = fields.find((candidate) => candidate.key === nextField);
  const reset = changedKind && field ? operatorsFor(field.kind)[0] : undefined;
  const operator = patch.operator ?? reset ?? current.operator;

  // A scalar value cannot survive a move to `in` / `notIn`, nor a list a move back, so the value restarts
  // whenever the operator crosses that line even though the field has not changed.
  const changedShape =
    patch.value === undefined && takesList(operator) !== takesList(current.operator);
  const value =
    changedKind || changedShape
      ? field
        ? startingValue(field, operator)
        : undefined
      : (patch.value ?? current.value);

  return value === undefined
    ? { id: current.id, field: nextField, operator }
    : { id: current.id, field: nextField, operator, value };
}
