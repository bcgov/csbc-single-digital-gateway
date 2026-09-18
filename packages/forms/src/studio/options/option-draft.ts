import { nanoid } from 'nanoid';
import type { ChoiceOption, ChoiceType } from '../../renderers/ui/choice-control';

// Doc 206 rules 10-20 — the Edit Options dialog's DRAFT. Pure, and deliberately free of React: the numeric
// coercion (rule 17) and the duplicate rule (rule 18) are the two things most likely to be subtly wrong, and
// both are decided here, before any component exists.
//
// `id` and `touched` never reach the document. `id` is what makes a rename distinguishable from a
// delete-plus-add (rule 21) and what the focus moves are addressed by; `touched` is what stops the auto-slug.

/** One row of the draft (rule 10). */
export interface Option {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly description?: string;
  readonly touched: boolean;
}

/** One entry of a saved `oneOf` / `items.oneOf` list — exactly the shape docs 188 and 205 already define. */
export interface SavedEntry {
  readonly const: string | number;
  readonly title?: string;
  readonly description?: string;
}

/** Why a row cannot be saved (rules 17-18, 20). */
export type RowProblem = 'duplicate' | 'invalid' | 'missing-value';

/** What an author may change on a row. */
export interface RowPatch {
  readonly label?: string;
  readonly value?: string;
  readonly description?: string;
}

/**
 * Rule 12: lowercase, every run of non-alphanumerics to one `_`, leading and trailing `_` trimmed.
 *
 * `\p{L}\p{N}` rather than `a-z0-9`: this is a bilingual government app, and stripping the accents out of
 * "Québec" would make the value unrecognisable to the author who typed the label.
 */
export const slugify = (label: string): string =>
  label
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '');

/** An empty row (rule 13). `touched: false`, so typing a label fills the value. */
const blankOption = (): Option => ({ id: nanoid(8), label: '', value: '', touched: false });

/**
 * Rule 10: one row per option, each `touched` — an existing value was authored deliberately and must never be
 * re-slugged from its label.
 *
 * A numeric const becomes its text (rule 17): the input must be able to hold a half-typed number. `savedEntries`
 * parses it back.
 *
 * `ChoiceOption.label` has already fallen back to `String(const)` for an entry with no `title` (doc 188 rule 2),
 * so opening and saving such a field MATERIALISES that title. Unlike `items.type` (rule 27) this is a rewrite
 * the author can see in the row and undo by clearing the label, and it changes nothing that renders.
 */
export const draftFrom = (options: readonly ChoiceOption[]): Option[] =>
  options.map((option) => ({
    id: nanoid(8),
    label: option.label,
    value: String(option.value),
    // `exactOptionalPropertyTypes`: an absent description is an ABSENT KEY, never `undefined`.
    ...(option.description === undefined ? {} : { description: option.description }),
    touched: true,
  }));

/**
 * Rule 13: an empty row directly BELOW `id`, or appended when `id` is `null` or unknown. Returns the new row's
 * id so the caller can focus its Label — the fast-entry path depends on it.
 */
export function insertAfter(
  draft: readonly Option[],
  id: string | null,
): { draft: Option[]; addedId: string } {
  const added = blankOption();
  const found = id === null ? -1 : draft.findIndex((row) => row.id === id);
  const index = found === -1 ? draft.length : found + 1;
  return { draft: [...draft.slice(0, index), added, ...draft.slice(index)], addedId: added.id };
}

/** Rule 15. An unknown id changes nothing, and returns the same array. */
export function removeRow(draft: readonly Option[], id: string): Option[] {
  const next = draft.filter((row) => row.id !== id);
  return next.length === draft.length ? (draft as Option[]) : next;
}

/**
 * Rules 11-12: one row patched. Setting the value by hand marks the row `touched` FOREVER — including when it
 * is cleared, because the author is saying "no value", which `rowProblems` reports rather than silently
 * re-filling from the label.
 */
export function editRow(draft: readonly Option[], id: string, patch: RowPatch): Option[] {
  const index = draft.findIndex((row) => row.id === id);
  const current = draft[index];
  if (current === undefined) return draft as Option[];

  const touched = current.touched || patch.value !== undefined;
  const label = patch.label ?? current.label;
  const value =
    patch.value ??
    // The auto-slug runs only while the row is untouched AND the label is what changed.
    (patch.label !== undefined && !current.touched ? slugify(patch.label) : current.value);
  const description = patch.description ?? current.description;

  const next: Option = {
    id: current.id,
    label,
    value,
    ...(description === undefined || description === '' ? {} : { description }),
    touched,
  };
  return draft.map((row, at) => (at === index ? next : row));
}

/** Rule 29: `from` moved to `to`. Out of range, or a move that changes nothing, returns the same array. */
export function moveOption(draft: readonly Option[], from: number, to: number): Option[] {
  const moved = draft[from];
  if (moved === undefined || to < 0 || to >= draft.length || from === to) return draft as Option[];
  const without = draft.filter((_, at) => at !== from);
  return [...without.slice(0, to), moved, ...without.slice(to)];
}

/** Rule 19: the rows a save would write — a row with an empty label AND an empty value is dropped. */
export const keptRows = (draft: readonly Option[]): Option[] =>
  draft.filter((row) => row.label !== '' || row.value !== '');

/** The const `text` stands for under `type`, or `undefined` when it is not one (rule 17). */
export function constOf(text: string, type: ChoiceType): string | number | undefined {
  if (type === 'string') return text;
  const trimmed = text.trim();
  // `Number('')` and `Number(' ')` are both 0 — a blank value must not become the const 0.
  if (trimmed === '') return undefined;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return undefined;
  return type === 'number' || Number.isInteger(value) ? value : undefined;
}

/**
 * Rules 17-18, 20: every row that cannot be saved, by row id. A row is judged only once — the FIRST row with a
 * given const keeps it, so only the repeats are marked, matching what `optionsFrom` would actually do with the
 * list (it keeps the first and silently drops the rest, which is why a duplicate must block Save rather than
 * warn).
 *
 * Blank rows are not judged at all: they are dropped on save, not written badly.
 */
export function rowProblems(
  draft: readonly Option[],
  type: ChoiceType,
): ReadonlyMap<string, RowProblem> {
  const problems = new Map<string, RowProblem>();
  const seen = new Set<string | number>();

  for (const row of keptRows(draft)) {
    if (row.value === '') {
      // Rule 20: an empty LABEL is a documented fallback; an empty value is not a choice at all.
      problems.set(row.id, 'missing-value');
      continue;
    }
    const value = constOf(row.value, type);
    if (value === undefined) {
      problems.set(row.id, 'invalid');
      continue;
    }
    if (seen.has(value)) problems.set(row.id, 'duplicate');
    else seen.add(value);
  }
  return problems;
}

/**
 * Rules 16-20: the list to write, or `undefined` when the draft cannot be saved — any row has a problem, or
 * nothing survives `keptRows`. An empty list is never returned: both `oneOf` and `items.oneOf` carry
 * `minItems: 1`, so it would fail the code-panel apply gate AND stop the field being a choice field at all.
 */
export function savedEntries(draft: readonly Option[], type: ChoiceType): SavedEntry[] | undefined {
  const kept = keptRows(draft);
  if (kept.length === 0 || rowProblems(draft, type).size > 0) return undefined;

  return kept.map((row) => {
    const value = constOf(row.value, type);
    return {
      // `rowProblems` was empty, so every kept row has a const.
      const: value as string | number,
      ...(row.label === '' ? {} : { title: row.label }),
      ...(row.description === undefined || row.description === ''
        ? {}
        : {
            description: row.description,
          }),
    };
  });
}
