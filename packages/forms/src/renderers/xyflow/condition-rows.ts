import type { Clause, ConditionRow } from '../../types/elements';
import {
  clauseProblems,
  needsValue,
  OPERATOR_LABELS,
  takesList,
  type CriterionField,
} from './criteria';

// What a Condition ROW means (doc 199 rules 38, 46). Pure — no React, no @xyflow/react — so the card that
// draws a row, the popover that edits one and the gate that validates one share one answer.
//
// EVALUATION is deliberately NOT here: `matchesRow` lives with the rest of the fill-time half in
// `runner/criterion-match.ts` (doc 202), because matching a clause against answers is the runner's job and
// putting the row half here would split one `switch` across two modules.

/** How many clauses a row's summary spells out before it counts the rest (rule 38). */
const SUMMARY_CLAUSES = 2;

export const emptyRowMessage = 'This condition has no clauses, so it can never be taken.';
export const duplicateClauseMessage = (id: string) => `Two clauses share the id "${id}".`;

/**
 * Rule 38: why `row` is not usable against `fields`, or `[]` when it is — every clause's `clauseProblems`
 * (rule 5), plus the two problems only a row can have: no clauses at all, and a repeated clause id.
 *
 * An empty row is a problem rather than a silent pass-through: it is an OUTPUT that can never be taken, so an
 * edge leaving it is dead. `rowsOf` already skips a row whose clauses are all unusable, so a row that reaches
 * here with none was authored empty.
 */
export function rowProblems(row: ConditionRow, fields: readonly CriterionField[]): string[] {
  if (row.clauses.length === 0) return [emptyRowMessage];
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const clause of row.clauses) {
    if (seen.has(clause.id)) problems.push(duplicateClauseMessage(clause.id));
    seen.add(clause.id);
    problems.push(...clauseProblems(clause, fields));
  }
  return problems;
}

/** A clause's value in words: a list reads as its entries, a scalar as itself, a valueless operator as ''. */
function valueText(clause: Clause): string {
  if (!needsValue(clause.operator) || clause.value === undefined) return '';
  if (takesList(clause.operator)) {
    return Array.isArray(clause.value) ? clause.value.join(', ') : String(clause.value);
  }
  return String(clause.value);
}

/**
 * Rule 38: one clause as a line of text — `<field> <operator> <value>`. The field shows its LABEL when it
 * resolves and its raw KEY when it does not, so a dangling clause reads as what it actually names (rule 9)
 * rather than silently as something else.
 */
export function clauseSummary(clause: Clause, fields: readonly CriterionField[]): string {
  const field = fields.find((candidate) => candidate.key === clause.field);
  const operator = OPERATOR_LABELS[clause.operator] ?? clause.operator;
  const value = valueText(clause);
  const head = `${field?.label ?? clause.field} ${operator}`;
  return value === '' ? head : `${head} ${value}`;
}

/**
 * Rule 38: the row's mono summary line — the first two clauses joined with ` · `, then ` · +N more`. It is one
 * ellipsised line on a fixed-width card (rule 42), which is why it counts the rest rather than listing them.
 */
export function rowSummary(row: ConditionRow, fields: readonly CriterionField[]): string {
  const shown = row.clauses
    .slice(0, SUMMARY_CLAUSES)
    .map((clause) => clauseSummary(clause, fields))
    .join(' · ');
  const rest = row.clauses.length - SUMMARY_CLAUSES;
  return rest > 0 ? `${shown} · +${rest} more` : shown;
}

/** What a row with no authored label shows: its summary, so a branch is never nameless on the card. */
export const rowTitle = (row: ConditionRow, fields: readonly CriterionField[]): string =>
  row.label.trim() !== '' ? row.label.trim() : rowSummary(row, fields);

/**
 * Rule 45: what the pinned Else row is called. It lives here, in the PURE module, rather than beside the card
 * that draws it: `flow-nodes.ts` names the Else EDGE with it too (rule 50), and a constant reached for by a
 * React-free module must not sit in a component file.
 */
export const ELSE_LABEL = 'Else';

/** The stem every generated row label starts with (rule 46). */
export const ROW_LABEL_STEM = 'Condition';

const GENERATED_LABEL = /^Condition (?<n>\d+)$/;

/**
 * Rule 46: the label `+ Add condition` gives the next row — one past the HIGHEST `Condition <n>` already in the
 * node, not one past the row count. Deleting row 2 of three would otherwise produce a second `Condition 3`.
 */
export function nextRowLabel(rows: readonly ConditionRow[]): string {
  const highest = rows.reduce((top, row) => {
    const matched = GENERATED_LABEL.exec(row.label.trim())?.groups?.['n'];
    const n = matched === undefined ? 0 : Number(matched);
    return Number.isFinite(n) && n > top ? n : top;
  }, 0);
  return `${ROW_LABEL_STEM} ${highest + 1}`;
}

/**
 * Rule 51: the single field every row tests, or `undefined` when the rows are not shaped like a switch.
 *
 * Switch mode is the SAME node with a simpler face: the header names one field and each row is one value. That
 * is lossless only while every row holds exactly one `equals` clause on that one field — anything else would
 * have to be thrown away to show it — so this is both the gate on the toggle and what the header displays.
 */
export function switchField(rows: readonly ConditionRow[]): string | undefined {
  const first = rows[0]?.clauses[0];
  if (rows.length === 0 || first === undefined) return undefined;
  const single = rows.every(
    (row) =>
      row.clauses.length === 1 &&
      row.clauses[0]?.operator === 'equals' &&
      row.clauses[0]?.field === first.field,
  );
  return single ? first.field : undefined;
}

/** Rule 51: what the author is shown when the toggle is unavailable. */
export const SWITCH_UNAVAILABLE_HINT =
  'Switch mode needs every condition to test one field for one value.';
