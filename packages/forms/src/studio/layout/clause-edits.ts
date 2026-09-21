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
  /**
   * Doc 206 rule 24b: refuse only an edit that would BREAK a clause that is currently valid.
   *
   * This used to refuse any patch whose result still had problems, which protected a valid clause and
   * made a broken one UN-EDITABLE — the only repair was to delete and re-create it. An author fixing a
   * value one keystroke at a time passes through states that are still invalid, so refusing them is
   * refusing the repair. It also kept rule 24's membership check permanently off, since the markers it
   * raises would have been unfixable.
   */
  if (clauseProblems(next, fields).length > 0 && clauseProblems(current, fields).length === 0)
    return document;

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

  const build = (next: Clause['value'] | undefined): Clause =>
    next === undefined
      ? { id: current.id, field: nextField, operator }
      : { id: current.id, field: nextField, operator, value: next };

  /**
   * Doc 206 rule 40: a value only survives a field change while the NEW field still accepts it.
   *
   * Keying the restart on the KIND alone was not enough — two CHOICE fields share a kind but not their
   * option lists, so the old const was carried onto the new field, `clauseProblems` flagged it as an unknown
   * choice, and `setClause` then refused the whole edit: the field picker snapped straight back and the
   * clause could never be moved between choice fields at all.
   */
  const changedField = patch.field !== undefined && patch.field !== current.field;
  if (changedField && patch.value === undefined && field) {
    const candidate = build(value);
    if (clauseProblems(candidate, fields).length > 0) return build(startingValue(field, operator));
  }

  return build(value);
}
