import { describe, expect, it } from 'vitest';
import {
  clauseFor,
  clauseSummary,
  nextRowLabel,
  rowSummary,
  type CriterionField,
} from '../src/studio/criteria';
import { row } from './funnel-fixtures';

const fields: CriterionField[] = [
  { key: 'age', label: 'Age', kind: 'number' },
  {
    key: 'region',
    label: 'Region',
    kind: 'choice',
    options: [
      { value: 'n', label: 'North' },
      { value: 's', label: 'South' },
    ],
  },
  { key: 'ok', label: 'OK', kind: 'boolean' },
];

describe('clauseFor', () => {
  it("starts with the kind's first operator and a fitting value", () => {
    expect(clauseFor(fields[0]!, 'k')).toEqual({
      id: 'k',
      field: 'age',
      operator: 'equals',
      value: 0,
    });
    expect(clauseFor(fields[1]!, 'k')).toEqual({
      id: 'k',
      field: 'region',
      operator: 'equals',
      value: 'n',
    });
    expect(clauseFor(fields[2]!, 'k')).toEqual({ id: 'k', field: 'ok', operator: 'isTrue' });
  });
});

describe('summaries', () => {
  it('words a clause with labels for the field and choice values', () => {
    expect(clauseSummary({ id: 'k', field: 'age', operator: 'gte', value: 18 }, fields)).toBe(
      'Age is at least 18',
    );
    expect(
      clauseSummary({ id: 'k', field: 'region', operator: 'in', value: ['n', 's'] }, fields),
    ).toBe('Region is one of North, South');
    expect(clauseSummary({ id: 'k', field: 'ok', operator: 'isTrue' }, fields)).toBe('OK is true');
    expect(clauseSummary({ id: 'k', field: 'gone', operator: 'isEmpty' }, fields)).toBe(
      'gone is empty',
    );
  });

  it('words a row: not set, two clauses joined by its match, then how many more', () => {
    const age = { id: 'a', field: 'age', operator: 'gt' as const, value: 1 };
    expect(rowSummary(row('r', 'Condition 1'), fields)).toBe('Condition 1 (not set)');
    expect(rowSummary(row('r', 'x', [age, age]), fields)).toBe(
      'Age is greater than 1 · Age is greater than 1',
    );
    expect(rowSummary({ ...row('r', 'x', [age, age, age]), match: 'any' }, fields)).toBe(
      'Age is greater than 1 or Age is greater than 1 +1 more',
    );
  });
});

describe('nextRowLabel', () => {
  it('is one past the highest numbered label, never a duplicate', () => {
    expect(nextRowLabel([])).toBe('Condition 1');
    expect(nextRowLabel([row('a', 'Condition 1'), row('b', 'Condition 3')])).toBe('Condition 4');
    expect(nextRowLabel([row('a', 'Adults'), row('b', 'Kids')])).toBe('Condition 3');
  });
});
