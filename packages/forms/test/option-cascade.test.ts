import type { UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { createElementIds } from '../src/studio/layout/element-ids';
import type { ChoiceOption } from '../src/renderers/ui/choice-control';
import {
  cascadeClauses,
  clauseUsers,
  deletedConsts,
  originalConsts,
  renamedConsts,
} from '../src/studio/options/option-cascade';
import { draftFrom, editRow, insertAfter, removeRow } from '../src/studio/options/option-draft';
import { child, clausesIn, condition, flow, row, stage } from './condition-edit-fixtures';

// Doc 206 rules 21-24 — what happens to a Flow Condition when an option it references is renamed or deleted.

const OPTIONS: ChoiceOption[] = [
  { value: 'bc', label: 'British Columbia' },
  { value: 'ab', label: 'Alberta' },
];

const clause = (value: unknown, operator = 'equals') => ({
  id: 'c1',
  field: 'k4',
  operator,
  value,
});

const documentWith = (...clauses: object[]): UISchemaElement =>
  flow([
    stage('a'),
    condition(
      'x',
      clauses.map((entry, index) => row(`r${index + 1}`, entry)),
    ),
    stage('b'),
  ]);

describe('originalConsts (rule 21)', () => {
  it('maps each opening row id to the const it started as', () => {
    const draft = draftFrom(OPTIONS);
    const originals = originalConsts(draft, OPTIONS);
    expect(originals.get(draft[0]!.id)).toBe('bc');
    expect(originals.get(draft[1]!.id)).toBe('ab');
  });

  it('knows nothing about a row added in the dialog', () => {
    const { draft, addedId } = insertAfter(draftFrom(OPTIONS), null);
    expect(originalConsts(draft, OPTIONS).has(addedId)).toBe(false);
  });
});

describe('renamedConsts (rule 21)', () => {
  it('reports a row whose value changed, keyed by its ORIGINAL const', () => {
    const draft = draftFrom(OPTIONS);
    const originals = originalConsts(draft, OPTIONS);
    const edited = editRow(draft, draft[0]!.id, { value: 'brit_col' });
    expect([...renamedConsts(edited, originals, 'string')]).toEqual([['bc', 'brit_col']]);
  });

  it('reports nothing when only labels and descriptions changed', () => {
    const draft = draftFrom(OPTIONS);
    const originals = originalConsts(draft, OPTIONS);
    const edited = editRow(draft, draft[0]!.id, { label: 'B.C.' });
    expect(renamedConsts(edited, originals, 'string').size).toBe(0);
  });

  it('is not fooled by a reorder — the row id, not the position, is the identity', () => {
    const draft = draftFrom(OPTIONS);
    const originals = originalConsts(draft, OPTIONS);
    expect(renamedConsts([draft[1]!, draft[0]!], originals, 'string').size).toBe(0);
  });

  it('reports a renamed NUMERIC const as a number, not its text (rule 17)', () => {
    const numeric: ChoiceOption[] = [{ value: 10, label: 'Ten' }];
    const draft = draftFrom(numeric);
    const originals = originalConsts(draft, numeric);
    const edited = editRow(draft, draft[0]!.id, { value: '20' });
    expect([...renamedConsts(edited, originals, 'number')]).toEqual([[10, 20]]);
  });

  it('treats a removed row as a delete, never as a rename', () => {
    const draft = draftFrom(OPTIONS);
    const originals = originalConsts(draft, OPTIONS);
    const removed = removeRow(draft, draft[0]!.id);
    expect(renamedConsts(removed, originals, 'string').size).toBe(0);
    expect(deletedConsts(removed, originals, 'string')).toEqual(['bc']);
  });
});

describe('deletedConsts (rule 23)', () => {
  it('reports nothing when every original row survives, however edited', () => {
    const draft = draftFrom(OPTIONS);
    const originals = originalConsts(draft, OPTIONS);
    const edited = editRow(draft, draft[0]!.id, { value: 'brit_col' });
    expect(deletedConsts(edited, originals, 'string')).toEqual([]);
  });

  it('reports a row dropped for being blank as deleted too (rule 19)', () => {
    const draft = draftFrom(OPTIONS);
    const originals = originalConsts(draft, OPTIONS);
    const blanked = editRow(editRow(draft, draft[1]!.id, { value: '' }), draft[1]!.id, {
      label: '',
    });
    expect(deletedConsts(blanked, originals, 'string')).toEqual(['ab']);
  });
});

describe('clauseUsers (rule 23)', () => {
  it('names the condition and row of every clause holding one of the consts', () => {
    const uischema = documentWith(clause('bc'), clause('ab'));
    const uses = clauseUsers(uischema, 'k4', ['bc']);
    expect(uses).toHaveLength(1);
    expect(uses[0]).toMatchObject({ rowLabel: 'Condition r1', value: 'bc' });
  });

  it('finds a const inside a LIST operator value (rule 21)', () => {
    const uischema = documentWith(clause(['bc', 'ab'], 'in'));
    expect(clauseUsers(uischema, 'k4', ['ab'])).toHaveLength(1);
  });

  it('ignores clauses on a different field', () => {
    const uischema = documentWith({ id: 'c1', field: 'k1', operator: 'equals', value: 'bc' });
    expect(clauseUsers(uischema, 'k4', ['bc'])).toEqual([]);
  });

  it('finds a const used by a MULTI-choice clause, which nothing else reports (rule 24)', () => {
    const uischema = documentWith(clause('bc', 'includes'));
    expect(clauseUsers(uischema, 'k4', ['bc'])).toHaveLength(1);
  });
});

const ids = () => createElementIds();
const renames = (...pairs: [string | number, string | number][]) => new Map(pairs);

describe('cascadeClauses (rules 21-22)', () => {
  it('rewrites a scalar clause value', () => {
    const next = cascadeClauses(
      documentWith(clause('bc')),
      'k4',
      renames(['bc', 'brit_col']),
      ids(),
    );
    expect(clausesIn(child(next, 1), 0)[0]?.['value']).toBe('brit_col');
  });

  it('rewrites each matching entry of a list value, leaving the others alone', () => {
    const next = cascadeClauses(
      documentWith(clause(['bc', 'ab'], 'in')),
      'k4',
      renames(['bc', 'brit_col']),
      ids(),
    );
    expect(clausesIn(child(next, 1), 0)[0]?.['value']).toEqual(['brit_col', 'ab']);
  });

  it('rewrites a multi-choice includes clause (rule 24)', () => {
    const next = cascadeClauses(
      documentWith(clause('bc', 'includes')),
      'k4',
      renames(['bc', 'brit_col']),
      ids(),
    );
    expect(clausesIn(child(next, 1), 0)[0]?.['value']).toBe('brit_col');
  });

  it('rewrites a NUMERIC const without turning it into text', () => {
    const next = cascadeClauses(documentWith(clause(10)), 'k4', renames([10, 20]), ids());
    expect(clausesIn(child(next, 1), 0)[0]?.['value']).toBe(20);
  });

  it('leaves clauses on other fields untouched', () => {
    const uischema = documentWith({ id: 'c1', field: 'k1', operator: 'equals', value: 'bc' });
    expect(cascadeClauses(uischema, 'k4', renames(['bc', 'brit_col']), ids())).toBe(uischema);
  });

  it('returns the SAME object when nothing matches, so no re-render is provoked (rule 28)', () => {
    const uischema = documentWith(clause('ab'));
    expect(cascadeClauses(uischema, 'k4', renames(['bc', 'brit_col']), ids())).toBe(uischema);
    expect(cascadeClauses(uischema, 'k4', new Map(), ids())).toBe(uischema);
  });
});
