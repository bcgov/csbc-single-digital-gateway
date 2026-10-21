import { describe, expect, it } from 'vitest';
import type { ChoiceOption } from '../src/renderers/ui/choice-options';
import { conditionsOf } from '../src/studio/funnel-model';
import {
  cascadeClauses,
  clauseUsers,
  deletedConsts,
  originalConsts,
  renamedConsts,
} from '../src/studio/options/option-cascade';
import { draftFrom, editRow, removeRow } from '../src/studio/options/option-draft';
import { condition, form, funnel, row } from './funnel-fixtures';

const OPTIONS: ChoiceOption[] = [
  { value: 'north', label: 'North' },
  { value: 'coast', label: 'Coast' },
];

const clause = (id: string, field: string, value: unknown, operator = 'equals') =>
  ({ id, field, operator, value }) as never;

const FUNNEL = funnel(
  [form('A', 'A'), form('B', 'B')],
  [],
  [
    condition(
      'c1',
      [
        row('r1', 'Northern', [clause('k1', 'region', 'north'), clause('k2', 'other', 'north')]),
        row('r2', 'Listed', [clause('k3', 'region', ['north', 'coast'], 'in')]),
      ],
      'Where do you live',
    ),
  ],
);

describe('renames and deletes (rules 11-12)', () => {
  it('reads a changed value as a rename and a removed row as a delete, by row identity', () => {
    const draft = draftFrom(OPTIONS);
    const originals = originalConsts(draft, OPTIONS);
    const renamed = editRow(draft, draft[0]!.id, { value: 'northern' });
    expect([...renamedConsts(renamed, originals, 'string')]).toEqual([['north', 'northern']]);
    expect(deletedConsts(renamed, originals, 'string')).toEqual([]);
    const removed = removeRow(draft, draft[1]!.id);
    expect(deletedConsts(removed, originals, 'string')).toEqual(['coast']);
    expect(renamedConsts(removed, originals, 'string').size).toBe(0);
  });

  it('names every clause on the field that holds a deleted value, list values entry by entry', () => {
    expect(clauseUsers(FUNNEL, 'region', ['north'])).toEqual([
      { conditionLabel: 'Where do you live', rowLabel: 'Northern', value: 'north' },
      { conditionLabel: 'Where do you live', rowLabel: 'Listed', value: 'north' },
    ]);
    expect(clauseUsers(FUNNEL, 'region', ['nowhere'])).toEqual([]);
    expect(clauseUsers(form('F', 'F'), 'region', ['north'])).toEqual([]);
  });

  it('rewrites renamed values in clauses on the field only, element-wise in lists', () => {
    const next = cascadeClauses(FUNNEL, 'region', new Map([['north', 'northern']]));
    const [rows] = conditionsOf(next).map((c) => c.options.rows);
    expect(rows![0]!.clauses.map((c) => c.value)).toEqual(['northern', 'north']);
    expect(rows![1]!.clauses[0]!.value).toEqual(['northern', 'coast']);
    // Everything else about the Funnel is kept.
    expect(next['elements']).toBe(FUNNEL['elements']);
  });

  it('returns the same uischema when nothing is renamed or nothing matches', () => {
    expect(cascadeClauses(FUNNEL, 'region', new Map())).toBe(FUNNEL);
    expect(cascadeClauses(FUNNEL, 'region', new Map([['east', 'west']]))).toBe(FUNNEL);
    const root = form('F', 'F');
    expect(cascadeClauses(root, 'region', new Map([['north', 'n']]))).toBe(root);
  });
});
