import { describe, expect, it } from 'vitest';
import type { ChoiceOption } from '../src/renderers/ui/choice-options';
import {
  draftFrom,
  dropIndex,
  editRow,
  insertAfter,
  keptRows,
  moveOption,
  removeRow,
  rowProblems,
  savedEntries,
  slugify,
  type Option,
} from '../src/studio/options/option-draft';

// Doc 206 rules 10-20 — the dialog's draft. Pure: every rule here is decided without React.

const OPTIONS: ChoiceOption[] = [
  { value: 'bc', label: 'British Columbia' },
  { value: 'ab', label: 'Alberta', description: 'Wild Rose Country' },
];

const values = (draft: readonly Option[]) => draft.map((row) => row.value);
const labels = (draft: readonly Option[]) => draft.map((row) => row.label);

/** A draft typed row by row, exactly as an author would: value by hand, then label. */
const draftOf = (rows: { label: string; value: string; description?: string }[]): Option[] =>
  rows.reduce<Option[]>((draft, row) => {
    const added = insertAfter(draft, null);
    let next = editRow(added.draft, added.addedId, { value: row.value });
    next = editRow(next, added.addedId, { label: row.label });
    return row.description === undefined
      ? next
      : editRow(next, added.addedId, { description: row.description });
  }, []);

describe('slugify (rule 12)', () => {
  it('lowercases and turns runs of non-alphanumerics into a single underscore', () => {
    expect(slugify('British Columbia')).toBe('british_columbia');
    expect(slugify('Yes — definitely!')).toBe('yes_definitely');
    expect(slugify('A  B')).toBe('a_b');
  });

  it('trims leading and trailing underscores, and keeps digits', () => {
    expect(slugify('  Option 1  ')).toBe('option_1');
    expect(slugify('!!!')).toBe('');
  });
});

describe('draftFrom (rule 10)', () => {
  it('makes one row per option, with distinct ids', () => {
    const draft = draftFrom(OPTIONS);
    expect(labels(draft)).toEqual(['British Columbia', 'Alberta']);
    expect(values(draft)).toEqual(['bc', 'ab']);
    expect(new Set(draft.map((row) => row.id)).size).toBe(2);
  });

  it('marks every existing row touched, so an authored value is never re-slugged', () => {
    expect(draftFrom(OPTIONS).every((row) => row.touched)).toBe(true);
  });

  it('carries a description as an ABSENT key when there is none', () => {
    const [first, second] = draftFrom(OPTIONS);
    expect(second?.description).toBe('Wild Rose Country');
    expect(first && 'description' in first).toBe(false);
  });

  it('renders a numeric const as its text (rule 17)', () => {
    const draft = draftFrom([{ value: 10, label: 'Ten' }]);
    expect(draft[0]?.value).toBe('10');
  });
});

describe('auto-slug (rules 11-12)', () => {
  it('fills the value from the label while the row is untouched', () => {
    const { draft, addedId } = insertAfter(draftFrom(OPTIONS), null);
    const typed = editRow(draft, addedId, { label: 'Nova Scotia' });
    expect(typed.find((row) => row.id === addedId)?.value).toBe('nova_scotia');
  });

  it('stops permanently once the value is edited by hand', () => {
    const { draft, addedId } = insertAfter(draftFrom(OPTIONS), null);
    const byHand = editRow(draft, addedId, { value: 'ns' });
    const relabelled = editRow(byHand, addedId, { label: 'Nova Scotia' });
    expect(relabelled.find((row) => row.id === addedId)?.value).toBe('ns');
  });

  it('does not resume when the value is cleared by hand', () => {
    const { draft, addedId } = insertAfter(draftFrom(OPTIONS), null);
    const cleared = editRow(editRow(draft, addedId, { value: 'ns' }), addedId, { value: '' });
    const relabelled = editRow(cleared, addedId, { label: 'Nova Scotia' });
    expect(relabelled.find((row) => row.id === addedId)?.value).toBe('');
  });

  it('never re-slugs a row that came from the document', () => {
    const draft = draftFrom(OPTIONS);
    const first = draft[0]!;
    expect(editRow(draft, first.id, { label: 'BC' }).find((r) => r.id === first.id)?.value).toBe(
      'bc',
    );
  });
});

describe('add and remove (rules 13-15)', () => {
  it('appends when the anchor is null, and reports the new row id', () => {
    const { draft, addedId } = insertAfter(draftFrom(OPTIONS), null);
    expect(draft).toHaveLength(3);
    expect(draft[2]?.id).toBe(addedId);
    expect(draft[2]).toMatchObject({ label: '', value: '', touched: false });
  });

  it('inserts directly BELOW the anchor row, not at the end (rule 13)', () => {
    const base = draftFrom(OPTIONS);
    const { draft, addedId } = insertAfter(base, base[0]!.id);
    expect(draft.map((row) => row.id)).toEqual([base[0]!.id, addedId, base[1]!.id]);
  });

  it('removes one row and leaves the others untouched', () => {
    const base = draftFrom(OPTIONS);
    expect(values(removeRow(base, base[0]!.id))).toEqual(['ab']);
  });

  it('ignores an unknown id rather than throwing', () => {
    const base = draftFrom(OPTIONS);
    expect(removeRow(base, 'nope')).toEqual(base);
    expect(editRow(base, 'nope', { label: 'x' })).toEqual(base);
  });
});

describe('moveOption (rule 29)', () => {
  it('moves a row to the target index, keeping every other row in order', () => {
    const base = draftFrom([...OPTIONS, { value: 'on', label: 'Ontario' }]);
    expect(values(moveOption(base, 2, 0))).toEqual(['on', 'bc', 'ab']);
    expect(values(moveOption(base, 0, 2))).toEqual(['ab', 'on', 'bc']);
  });

  it('returns the SAME array when the move changes nothing', () => {
    const base = draftFrom(OPTIONS);
    expect(moveOption(base, 1, 1)).toBe(base);
    expect(moveOption(base, 5, 0)).toBe(base);
  });
});

describe('rowProblems (rules 17-18, 20)', () => {
  it('flags every row after the first that repeats a value (rule 18)', () => {
    const draft = draftOf([
      { label: 'A', value: 'a' },
      { label: 'B', value: 'a' },
      { label: 'C', value: 'c' },
    ]);
    const problems = rowProblems(draft, 'string');
    expect(problems.get(draft[0]!.id)).toBeUndefined();
    expect(problems.get(draft[1]!.id)).toBe('duplicate');
    expect(problems.get(draft[2]!.id)).toBeUndefined();
  });

  it('flags a missing value, but allows a missing label (rule 20)', () => {
    const draft = draftOf([{ label: 'A', value: '' }]);
    expect(rowProblems(draft, 'string').get(draft[0]!.id)).toBe('missing-value');
    const unlabelled = draftOf([{ label: '', value: 'a' }]);
    expect(rowProblems(unlabelled, 'string').size).toBe(0);
  });

  it('flags a value that is not a number on a numeric field (rule 17)', () => {
    const draft = draftOf([
      { label: 'Ten', value: '10' },
      { label: 'Lots', value: 'abc' },
    ]);
    const problems = rowProblems(draft, 'number');
    expect(problems.get(draft[0]!.id)).toBeUndefined();
    expect(problems.get(draft[1]!.id)).toBe('invalid');
    // The same draft is perfectly fine for a string field.
    expect(rowProblems(draft, 'string').size).toBe(0);
  });

  it('flags a fractional value on an integer field', () => {
    const draft = draftOf([{ label: 'Half', value: '1.5' }]);
    expect(rowProblems(draft, 'integer').get(draft[0]!.id)).toBe('invalid');
    expect(rowProblems(draft, 'number').size).toBe(0);
  });

  it('does not flag a blank row, which is dropped on save (rule 19)', () => {
    const draft = draftOf([
      { label: 'A', value: 'a' },
      { label: '', value: '' },
    ]);
    expect(rowProblems(draft, 'string').size).toBe(0);
  });
});

describe('keptRows and savedEntries (rules 19-20)', () => {
  it('drops a row whose label AND value are both empty', () => {
    const draft = draftOf([
      { label: 'A', value: 'a' },
      { label: '', value: '' },
    ]);
    expect(keptRows(draft)).toHaveLength(1);
  });

  it('writes const, title and description, omitting an empty title or description', () => {
    const draft = draftOf([
      { label: 'British Columbia', value: 'bc', description: 'West coast' },
      { label: '', value: 'ab' },
    ]);
    expect(savedEntries(draft, 'string')).toEqual([
      { const: 'bc', title: 'British Columbia', description: 'West coast' },
      { const: 'ab' },
    ]);
  });

  it('writes NUMBERS for a numeric field, never their text (rule 17)', () => {
    const draft = draftOf([{ label: 'Ten', value: '10' }]);
    expect(savedEntries(draft, 'number')).toEqual([{ const: 10, title: 'Ten' }]);
    expect(savedEntries(draft, 'string')).toEqual([{ const: '10', title: 'Ten' }]);
  });

  it('refuses to save while any row has a problem (rule 18)', () => {
    const duplicate = draftOf([
      { label: 'A', value: 'a' },
      { label: 'B', value: 'a' },
    ]);
    expect(savedEntries(duplicate, 'string')).toBeUndefined();
  });

  it('refuses to save an empty list — the metaschema requires at least one (rule 19)', () => {
    expect(savedEntries([], 'string')).toBeUndefined();
    expect(savedEntries(draftOf([{ label: '', value: '' }]), 'string')).toBeUndefined();
  });
});

describe('dropIndex (doc 255 rule 5b)', () => {
  it('drops before or after the row under the pointer, accounting for the lifted row', () => {
    // Moving row 0 down: after row 2 lands at index 2 (rows 1-2 shift up), before row 2 at index 1.
    expect(dropIndex(0, 2, 'after')).toBe(2);
    expect(dropIndex(0, 2, 'before')).toBe(1);
    // Moving row 3 up: before row 1 lands at index 1, after row 1 at index 2.
    expect(dropIndex(3, 1, 'before')).toBe(1);
    expect(dropIndex(3, 1, 'after')).toBe(2);
    // On its own neighbour's near edge, nothing moves.
    expect(dropIndex(1, 0, 'after')).toBe(1);
    expect(dropIndex(1, 2, 'before')).toBe(1);
  });
});
