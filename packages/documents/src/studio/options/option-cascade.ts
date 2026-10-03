import type { ConditionRow } from '@repo/forms';
import type { ChoiceOption, ChoiceType } from '../../renderers/ui/choice-options';
import type { Uischema } from '../document-types';
import { conditionsOf, withFunnel, type FunnelCondition } from '../funnel-model';
import { constOf, keptRows, type Option } from './option-draft';

// Doc 255 rules 11-13 (ported from @repo/forms doc 206 rules 21-24) — what a save does to the Funnel Conditions that
// test the options being edited. A rename is distinguishable from a delete-plus-add ONLY because each draft row carries
// a stable id; without that every edit would read as "the old const vanished and a new one appeared".

/** Row id → the const that row opened as. A row added in the dialog is absent. */
export type OriginalConsts = ReadonlyMap<string, string | number>;

/** Where a const is tested, for the warning before a delete (rule 12). */
export interface ClauseUse {
  readonly conditionLabel: string;
  readonly rowLabel: string;
  readonly value: string | number;
}

/** `draftFrom` produced one row per option, in order, so the two zip. */
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
 * `oldConst → newConst` for every surviving row whose value changed, keyed by the ORIGINAL const — what the clauses
 * hold. A reordered row is not a rename (identity is the row id); a row that no longer exists is a delete.
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

/** The consts that no longer exist — a removed row, or one blanked into being dropped — in their original order. */
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

const nonEmpty = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim() !== '' ? value : fallback;

/**
 * Rule 12: every clause on `propertyKey` holding one of `consts`, in every Condition of a Funnel root, named so the author
 * can be told what a delete will break. A list value (`in` / `notIn`) is searched entry by entry. A Form root has no
 * Conditions (rule 13).
 */
export function clauseUsers(
  uischema: Uischema,
  propertyKey: string,
  consts: readonly (string | number)[],
): ClauseUse[] {
  const wanted = new Set<string | number>(consts);
  const uses: ClauseUse[] = [];
  for (const condition of conditionsOf(uischema)) {
    const conditionLabel = nonEmpty(condition.label, 'Condition');
    for (const row of condition.options.rows) {
      const rowLabel = nonEmpty(row.label, conditionLabel);
      for (const clause of row.clauses) {
        if (clause.field !== propertyKey) continue;
        const held = Array.isArray(clause.value) ? clause.value : [clause.value];
        for (const entry of held)
          if (wanted.has(entry as string | number))
            uses.push({ conditionLabel, rowLabel, value: entry as string | number });
      }
    }
  }
  return uses;
}

/** One clause value rewritten, or the same value when no entry of it was renamed. */
function renamedValue<T>(value: T, renames: ReadonlyMap<string | number, string | number>): T {
  if (Array.isArray(value)) {
    const next = value.map((entry: string | number) => renames.get(entry) ?? entry);
    return (next.some((entry, index) => entry !== value[index]) ? next : value) as T;
  }
  return (renames.get(value as string | number) ?? value) as T;
}

/** A Condition with its clauses on `propertyKey` renamed, or the same Condition when none changed. */
function cascadeCondition(
  condition: FunnelCondition,
  propertyKey: string,
  renames: ReadonlyMap<string | number, string | number>,
): FunnelCondition {
  let changed = false;
  const rows = condition.options.rows.map((row): ConditionRow => {
    let rowChanged = false;
    const clauses = row.clauses.map((clause) => {
      if (clause.field !== propertyKey || clause.value === undefined) return clause;
      const value = renamedValue(clause.value, renames);
      if (value === clause.value) return clause;
      rowChanged = true;
      return { ...clause, value };
    });
    if (!rowChanged) return row;
    changed = true;
    return { ...row, clauses };
  });
  return changed ? { ...condition, options: { ...condition.options, rows } } : condition;
}

/**
 * Rule 11: every clause on `propertyKey` rewritten through `renames`; the SAME uischema when nothing matched. Applied in
 * the same content write as the options, so no mid-state ever holds a clause testing a value that does not exist.
 */
export function cascadeClauses(
  uischema: Uischema,
  propertyKey: string,
  renames: ReadonlyMap<string | number, string | number>,
): Uischema {
  if (renames.size === 0) return uischema;
  const conditions = conditionsOf(uischema);
  const next = conditions.map((condition) => cascadeCondition(condition, propertyKey, renames));
  return next.some((condition, index) => condition !== conditions[index])
    ? withFunnel(uischema, { conditions: next })
    : uischema;
}
