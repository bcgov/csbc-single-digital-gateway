import type { UISchemaElement } from '@jsonforms/core';
import type { ChoiceOption, ChoiceType } from '../../renderers/ui/choice-control';
import type { ElementIds } from '../layout/element-ids';
import { withElements, type TreeElement } from '../layout/element-tree';
import { constOf, keptRows, type Option } from './option-draft';

// Doc 206 rules 21-24 — what a save does to the Flow Conditions that reference the options being edited.
//
// A rename is distinguishable from a delete-plus-add ONLY because each draft row carries a stable id. Without
// that, every edit would read as "the old const vanished and a new one appeared", and the cascade could not
// exist at all.

/** Row id → the const that row opened as. A row added in the dialog is absent (rule 21). */
export type OriginalConsts = ReadonlyMap<string, string | number>;

/** Where a const is referenced, for the warning before a delete (rule 23). */
export interface ClauseUse {
  readonly conditionLabel: string;
  readonly rowLabel: string;
  readonly value: string | number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Rule 21: `draftFrom` produced one row per option, in order, so the two zip. */
export function originalConsts(
  draft: readonly Option[],
  options: readonly ChoiceOption[],
): OriginalConsts {
  const originals = new Map<string, string | number>();
  draft.forEach((row, index) => {
    const option = options[index];
    if (option !== undefined) originals.set(row.id, option.value);
  });
  return originals;
}

/**
 * Rule 21: `oldConst → newConst` for every surviving row whose value changed. Keyed by the ORIGINAL const,
 * because that is what the clauses hold.
 *
 * A reordered row is not a rename — identity is the row id, never the position. A row that no longer exists is
 * a DELETE, and is absent here by construction: the walk is over the rows that survive.
 */
export function renamedConsts(
  draft: readonly Option[],
  originals: OriginalConsts,
  type: ChoiceType,
): Map<string | number, string | number> {
  const renames = new Map<string | number, string | number>();
  for (const row of keptRows(draft)) {
    const original = originals.get(row.id);
    if (original === undefined) continue;
    const next = constOf(row.value, type);
    if (next !== undefined && next !== original) renames.set(original, next);
  }
  return renames;
}

/**
 * Rule 23: the consts that no longer exist — a removed row, or one blanked into being dropped by `keptRows`.
 * In their original order, so the warning reads in the order the author saw them.
 */
export function deletedConsts(
  draft: readonly Option[],
  originals: OriginalConsts,
  type: ChoiceType,
): (string | number)[] {
  const surviving = new Set<string>();
  for (const row of keptRows(draft)) {
    // A row whose value no longer parses is a PROBLEM, not a delete — Save is blocked before this is asked.
    if (constOf(row.value, type) !== undefined) surviving.add(row.id);
  }
  return [...originals].filter(([rowId]) => !surviving.has(rowId)).map(([, original]) => original);
}

/** The `rows` of a Condition element, as authored. */
const rowsOf = (element: TreeElement): Record<string, unknown>[] => {
  const rows = isRecord(element.options) ? element.options['rows'] : undefined;
  return Array.isArray(rows) ? rows.filter(isRecord) : [];
};

const clausesOf = (row: Record<string, unknown>): Record<string, unknown>[] =>
  Array.isArray(row['clauses']) ? (row['clauses'] as unknown[]).filter(isRecord) : [];

const textOf = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

/** Every Condition at or below `root`, in document order. */
function conditions(root: TreeElement): TreeElement[] {
  const found: TreeElement[] = [];
  const walk = (element: TreeElement) => {
    if (element.type === 'Condition') found.push(element);
    for (const child of element.elements ?? []) walk(child as TreeElement);
  };
  walk(root);
  return found;
}

/**
 * Rule 23: every clause on `propertyKey` holding one of `consts`, named so the author can be told what a delete
 * will break. A list operator (`in` / `notIn`) is searched entry by entry.
 *
 * It finds MULTI-choice clauses too (rule 24) — `criteria.ts` membership-checks single choices only, so for a
 * multi-select this is the only thing that will ever report the reference.
 */
export function clauseUsers(
  uischema: UISchemaElement,
  propertyKey: string,
  consts: readonly (string | number)[],
): ClauseUse[] {
  const wanted = new Set<string | number>(consts);
  const uses: ClauseUse[] = [];

  for (const condition of conditions(uischema as TreeElement)) {
    const conditionLabel = textOf((condition as { label?: unknown }).label, 'Condition');
    for (const row of rowsOf(condition)) {
      const rowLabel = textOf(row['label'], conditionLabel);
      for (const clause of clausesOf(row)) {
        if (clause['field'] !== propertyKey) continue;
        const value = clause['value'];
        const held = Array.isArray(value) ? value : [value];
        for (const entry of held)
          if (wanted.has(entry as string | number))
            uses.push({ conditionLabel, rowLabel, value: entry as string | number });
      }
    }
  }
  return uses;
}

/** One clause value rewritten, or the same value when no entry of it was renamed. */
function renamedValue(
  value: unknown,
  renames: ReadonlyMap<string | number, string | number>,
): unknown {
  if (Array.isArray(value)) {
    const next = value.map((entry) => renames.get(entry as string | number) ?? entry);
    return next.some((entry, index) => entry !== value[index]) ? next : value;
  }
  return renames.get(value as string | number) ?? value;
}

/** A Condition with its rows rewritten, or the same element when no clause changed. */
function cascadeCondition(
  condition: TreeElement,
  propertyKey: string,
  renames: ReadonlyMap<string | number, string | number>,
  ids: ElementIds,
): TreeElement {
  let changed = false;
  const rows = rowsOf(condition).map((row) => {
    const clauses = clausesOf(row).map((clause) => {
      if (clause['field'] !== propertyKey) return clause;
      const value = renamedValue(clause['value'], renames);
      if (value === clause['value']) return clause;
      changed = true;
      return { ...clause, value };
    });
    return changed ? { ...row, clauses } : row;
  });
  if (!changed) return condition;

  const options = isRecord(condition.options) ? condition.options : {};
  const next = { ...condition, options: { ...options, rows } } as TreeElement;
  ids.carry(condition, next);
  return next;
}

/**
 * Rules 21-22: every clause on `propertyKey` rewritten through `renames`.
 *
 * Returns the SAME object when nothing matched (rule 28), and carries studio ids on every rebuilt element —
 * without that the selection would be dropped by the very edit that repaired the reference.
 *
 * This must run in the SAME document update as the option write. Two steps would leave a mid-state whose
 * clauses fail `clauseProblems`, and `clause-edits.ts` refuses any further edit to a clause with problems, so
 * the repair would be refused by the thing it was repairing.
 */
export function cascadeClauses(
  uischema: UISchemaElement,
  propertyKey: string,
  renames: ReadonlyMap<string | number, string | number>,
  ids: ElementIds,
): UISchemaElement {
  if (renames.size === 0) return uischema;

  const walk = (element: TreeElement): TreeElement => {
    const self =
      element.type === 'Condition' ? cascadeCondition(element, propertyKey, renames, ids) : element;
    if (!self.elements) return self;
    return withElements(
      self,
      self.elements.map((child) => walk(child as TreeElement)),
      ids,
    );
  };
  return walk(uischema as TreeElement);
}
