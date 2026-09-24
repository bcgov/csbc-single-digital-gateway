import { authoredId } from '../../renderers/ui/authored-id';
import {
  needsValue,
  operatorsFor,
  takesList,
  type CriterionField,
} from '../../renderers/xyflow/criteria';
import { isCondition } from '../../renderers/xyflow/flow-elements';
import type { Clause, ConditionRow, Operator } from '../../types/elements';
import { freshId, rawEdges, withOptions } from './element-parts';
import type { ElementIds } from './element-ids';
import { findById, updateById, type TreeElement } from './element-tree';
import type { StudioDocument } from './schema-properties';
import { upstreamFieldsOf } from './upstream-fields';

// What the row edits (`condition-edits.ts`) and the clause edits (`clause-edits.ts`) share (doc 199 rules 25-28,
// 46, 48-49). Pure: every changed element is a new object carrying its studio id, untouched subtrees keep
// identity, and a refused edit returns the SAME document object.
//
// These take a StudioDocument rather than a uischema, unlike the Flow edits in `flow-edits.ts`: a clause is only
// ever authored complete (rule 46), and deciding what "complete" means needs the schema.

// Re-exported so `condition-edits.ts` and `clause-edits.ts` keep taking every shared part from one module.
export { freshId, rawEdges, withOptions };

/** The Condition with `conditionId`, or `undefined` when it is not one. */
export function conditionAt(
  root: TreeElement,
  conditionId: string,
  ids: ElementIds,
): TreeElement | undefined {
  const element = findById(root, conditionId, ids);
  return element && isCondition(element) ? element : undefined;
}

/** The fields the Condition may test (rule 6), or `[]` when it has no authored id to walk back from. */
export function fieldsOf(
  document: StudioDocument,
  condition: TreeElement,
): readonly CriterionField[] {
  const id = authoredId(condition);
  return id === undefined ? [] : upstreamFieldsOf(document, id);
}

/** The value a complete clause starts with for `field` (rules 26, 46), or `undefined` when it needs none. */
export function startingValue(
  field: CriterionField,
  operator: Operator,
): Clause['value'] | undefined {
  if (!needsValue(operator)) return undefined;
  // A list operator starts with the field's FIRST option in a one-entry list: an empty list is a problem
  // (rule 38) and a clause is never born with one.
  if (takesList(operator)) {
    // Doc 206 rule 39: an option's const may be a NUMBER. Returning `[]` for those made an empty list, which
    // is itself a problem (rule 38) — so a numeric-const choice field could not take `in` / `notIn` at all.
    const first = field.options?.[0]?.value;
    return first === undefined ? [] : [first];
  }
  if (field.kind === 'number') return 0;
  if (field.kind === 'boolean') return true;
  // Doc 205 rule 32: a multi-choice clause starts on its first option, exactly as a single choice does — the
  // value is one const either way.
  if (field.kind === 'choice' || field.kind === 'multi-choice') return field.options?.[0]?.value;
  return '';
}

/** Rules 26, 46: a complete clause on the first upstream field, or `undefined` when none can be built. */
export function newClause(
  fields: readonly CriterionField[],
  taken: ReadonlySet<string>,
  newId: () => string,
): Clause | undefined {
  const field = fields[0];
  if (!field) return undefined;
  const operator = operatorsFor(field.kind)[0];
  if (!operator) return undefined;
  const id = freshId(taken, newId);
  const value = startingValue(field, operator);
  return value === undefined
    ? { id, field: field.key, operator }
    : { id, field: field.key, operator, value };
}

/** `rows` written back onto the Condition, as a new document. */
export function withRows(
  document: StudioDocument,
  conditionId: string,
  rows: ConditionRow[],
  ids: ElementIds,
): StudioDocument {
  const root = document.uischema as TreeElement;
  const uischema = updateById(
    root,
    conditionId,
    (element) => withOptions(element, { rows }, ids),
    ids,
  );
  return { schema: document.schema, uischema };
}

/** The same rows with `rowId` replaced by `next`, or `undefined` when no row has that id. */
export function replacingRow(
  rows: readonly ConditionRow[],
  rowId: string,
  next: (row: ConditionRow) => ConditionRow,
): ConditionRow[] | undefined {
  const current = rows.find((row) => row.id === rowId);
  if (!current) return undefined;
  return rows.map((row) => (row.id === rowId ? next(row) : row));
}
