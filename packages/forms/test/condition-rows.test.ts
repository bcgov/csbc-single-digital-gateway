import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import {
  clauseSummary,
  duplicateClauseMessage,
  emptyRowMessage,
  nextRowLabel,
  rowProblems,
  rowSummary,
  rowTitle,
  switchField,
} from '../src/renderers/xyflow/condition-rows';
import { unknownFieldMessage, type CriterionField } from '../src/renderers/xyflow/criteria';
import { conditionMode, DEFAULT_HANDLE, rowsOf } from '../src/renderers/xyflow/flow-elements';
import { conditionDecided, firstMatchingRow, matchesRow } from '../src/runner/criterion-match';
import type { Clause, ConditionRow } from '../src/types/elements';

// Doc 199 rules 35-52 — the rows-of-clauses Condition: what `rowsOf` reads, what a row means, how a row
// matches, and how a row is labelled.

const text: CriterionField = { key: 'name', label: 'Full name', kind: 'text' };
const number: CriterionField = { key: 'age', label: 'Age', kind: 'number' };
const choice: CriterionField = {
  key: 'plan',
  label: 'Plan',
  kind: 'choice',
  options: [
    { value: 'basic', label: 'Basic' },
    { value: 'pro', label: 'Pro' },
  ],
};
const FIELDS = [text, number, choice];

const schema: JsonSchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', title: 'Full name' },
    age: { type: 'number', title: 'Age' },
    plan: {
      type: 'string',
      oneOf: [
        { const: 'basic', title: 'Basic' },
        { const: 'pro', title: 'Pro' },
      ],
    },
  },
};

const clause = (patch: Partial<Clause> = {}): Clause =>
  ({ id: 'cl1', field: 'name', operator: 'equals', value: 'Ada', ...patch }) as Clause;

const row = (patch: Partial<ConditionRow> = {}): ConditionRow => ({
  id: 'r1',
  label: 'Condition 1',
  match: 'all',
  clauses: [clause()],
  ...patch,
});

const conditionOf = (options: unknown) =>
  ({ type: 'Condition', options }) as unknown as UISchemaElement;

describe('rowsOf (rule 35)', () => {
  it('reads options.rows', () => {
    expect(rowsOf(conditionOf({ id: 'c1', rows: [row()] }))).toHaveLength(1);
  });

  it('does NOT read the pre-rows options.criteria — the cut is hard', () => {
    const legacy = conditionOf({
      id: 'c1',
      criteria: [{ id: 'r1', field: 'name', operator: 'equals', value: 'Ada' }],
    });
    // A legacy criterion carries no row label and no `match`, so promoting it would invent both. The
    // Condition draws with no branches instead, which the author can see.
    expect(rowsOf(legacy)).toEqual([]);
  });

  it('skips a non-record row, a row with no id and a row with no usable clause', () => {
    const rows = rowsOf(
      conditionOf({
        id: 'c1',
        rows: [
          'nope',
          { label: 'no id', match: 'all', clauses: [clause()] },
          { id: 'empty', label: 'x', match: 'all', clauses: [] },
          { id: 'unusable', label: 'x', match: 'all', clauses: ['nope'] },
          row({ id: 'kept' }),
        ],
      }),
    );
    expect(rows.map(({ id }) => id)).toEqual(['kept']);
  });

  it('keeps the FIRST of two rows sharing an id, and the first of two clauses sharing one', () => {
    const rows = rowsOf(
      conditionOf({
        id: 'c1',
        rows: [
          row({ label: 'first', clauses: [clause(), clause({ field: 'age' })] }),
          row({ label: 'second' }),
        ],
      }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.label).toBe('first');
    // Both clauses were authored with id `cl1`, so the second is dropped.
    expect(rows[0]?.clauses).toHaveLength(1);
  });

  it("reads an unknown `match` as 'all', the narrower reading", () => {
    // The narrower reading can never capture traffic the author did not mean it to.
    expect(rowsOf(conditionOf({ id: 'c1', rows: [{ ...row(), match: 'either' }] }))[0]?.match).toBe(
      'all',
    );
    expect(rowsOf(conditionOf({ id: 'c1', rows: [{ ...row(), match: 'any' }] }))[0]?.match).toBe(
      'any',
    );
  });

  it('reads a missing label as an empty one rather than skipping the row', () => {
    const rows = rowsOf(
      conditionOf({ id: 'c1', rows: [{ id: 'r1', match: 'all', clauses: [clause()] }] }),
    );
    expect(rows[0]?.label).toBe('');
  });
});

describe('rowProblems (rule 38)', () => {
  it('accepts a row whose clauses are all complete', () => {
    expect(rowProblems(row(), FIELDS)).toEqual([]);
  });

  it('reports a row with no clauses: it is an output that can never be taken', () => {
    expect(rowProblems(row({ clauses: [] }), FIELDS)).toEqual([emptyRowMessage]);
  });

  it('reports a repeated clause id', () => {
    const problems = rowProblems(row({ clauses: [clause(), clause()] }), FIELDS);
    expect(problems).toContain(duplicateClauseMessage('cl1'));
  });

  it("carries through each clause's own problems", () => {
    expect(rowProblems(row({ clauses: [clause({ field: 'gone' })] }), FIELDS)).toEqual([
      unknownFieldMessage('gone'),
    ]);
  });
});

describe('summaries (rule 38)', () => {
  it('shows a resolved field by LABEL and a dangling one by its raw key', () => {
    expect(clauseSummary(clause(), FIELDS)).toBe('Full name equals Ada');
    expect(clauseSummary(clause({ field: 'gone' }), FIELDS)).toBe('gone equals Ada');
  });

  it('leaves out the value for an operator that takes none', () => {
    expect(clauseSummary({ id: 'c', field: 'name', operator: 'isEmpty' }, FIELDS)).toBe(
      'Full name is empty',
    );
  });

  it('reads a list value as its entries', () => {
    expect(
      clauseSummary({ id: 'c', field: 'plan', operator: 'in', value: ['basic', 'pro'] }, FIELDS),
    ).toBe('Plan is one of basic, pro');
  });

  it('joins the first two clauses with " · " and counts the rest', () => {
    const clauses = [
      clause(),
      clause({ id: 'cl2', field: 'age', operator: 'gt', value: 3 }),
      clause({ id: 'cl3', field: 'plan', operator: 'equals', value: 'pro' }),
    ];
    expect(rowSummary(row({ clauses }), FIELDS)).toBe(
      'Full name equals Ada · Age is greater than 3 · +1 more',
    );
  });

  it('falls back to the summary when a row has no authored label', () => {
    expect(rowTitle(row({ label: '  ' }), FIELDS)).toBe('Full name equals Ada');
    expect(rowTitle(row(), FIELDS)).toBe('Condition 1');
  });
});

describe('matching (rules 38-40)', () => {
  const twoClauses = (match: ConditionRow['match']) =>
    row({
      match,
      clauses: [clause(), clause({ id: 'cl2', field: 'age', operator: 'gt', value: 30 })],
    });

  it("'all' requires every clause", () => {
    expect(matchesRow(twoClauses('all'), schema, { name: 'Ada', age: 40 })).toBe(true);
    expect(matchesRow(twoClauses('all'), schema, { name: 'Ada', age: 20 })).toBe(false);
  });

  it("'any' requires one clause", () => {
    expect(matchesRow(twoClauses('any'), schema, { name: 'Ada', age: 20 })).toBe(true);
    expect(matchesRow(twoClauses('any'), schema, { name: 'Bob', age: 20 })).toBe(false);
  });

  it('a row with no clauses NEVER matches, rather than matching vacuously', () => {
    // `Array.every` would say true, which would make an empty row swallow every answer while sitting
    // above the Else row.
    expect(matchesRow(row({ clauses: [] }), schema, { name: 'Ada' })).toBe(false);
  });

  it("an unevaluable clause fails an 'all' row and does not carry an 'any' row", () => {
    const dangling = clause({ id: 'cl9', field: 'gone', operator: 'equals', value: 'x' });
    expect(matchesRow(row({ clauses: [clause(), dangling] }), schema, { name: 'Ada' })).toBe(false);
    expect(
      matchesRow(row({ match: 'any', clauses: [clause(), dangling] }), schema, { name: 'Ada' }),
    ).toBe(true);
    expect(matchesRow(row({ match: 'any', clauses: [dangling] }), schema, { name: 'Ada' })).toBe(
      false,
    );
  });

  it('firstMatchingRow returns the first matching row in authored order', () => {
    const node = conditionOf({
      id: 'c1',
      rows: [
        row({ id: 'first', clauses: [clause({ field: 'age', operator: 'gt', value: 10 })] }),
        row({ id: 'second', clauses: [clause({ field: 'age', operator: 'gt', value: 20 })] }),
      ],
    });
    // Both rows match an age of 40; the first one authored wins, like an if/else-if chain.
    expect(firstMatchingRow(node, schema, { age: 40 })?.id).toBe('first');
  });

  it('conditionDecided reads EVERY clause of every row, not just a row’s first (rule 40)', () => {
    // `name` is required and unanswered, so the branch is still open even though `age` is answered —
    // reading only the first clause of the second row would have called it decided.
    const node = conditionOf({
      id: 'c1',
      rows: [
        row({ id: 'r1', clauses: [clause({ field: 'age', operator: 'gt', value: 99 })] }),
        row({
          id: 'r2',
          clauses: [clause({ id: 'cl2', field: 'age', operator: 'lt', value: 5 }), clause()],
        }),
      ],
    });
    expect(conditionDecided(node, schema, { age: 40 })).toBe(false);
    expect(conditionDecided(node, schema, { age: 40, name: 'Ada' })).toBe(true);
  });
});

describe('the new operators evaluate (rule 36)', () => {
  const rowWith = (operator: Clause['operator'], value: unknown) =>
    row({ clauses: [{ id: 'c', field: 'name', operator, value } as Clause] });

  it('startsWith and endsWith match case-insensitively', () => {
    expect(matchesRow(rowWith('startsWith', 'ad'), schema, { name: 'Ada' })).toBe(true);
    expect(matchesRow(rowWith('endsWith', 'DA'), schema, { name: 'Ada' })).toBe(true);
    expect(matchesRow(rowWith('startsWith', 'da'), schema, { name: 'Ada' })).toBe(false);
  });

  it('in matches one of the listed values, and notIn is its negation', () => {
    const listed = (operator: 'in' | 'notIn') =>
      row({ clauses: [{ id: 'c', field: 'plan', operator, value: ['pro'] } as Clause] });
    expect(matchesRow(listed('in'), schema, { plan: 'pro' })).toBe(true);
    expect(matchesRow(listed('in'), schema, { plan: 'basic' })).toBe(false);
    expect(matchesRow(listed('notIn'), schema, { plan: 'basic' })).toBe(true);
    // A blank answer is not in the list, so `notIn` holds — the citizen has picked none of them.
    expect(matchesRow(listed('notIn'), schema, {})).toBe(true);
  });

  it('a wrong-typed value for in/notIn never matches (doc 202 rule 22)', () => {
    const scalar = row({
      clauses: [{ id: 'c', field: 'plan', operator: 'in', value: 'pro' } as Clause],
    });
    expect(matchesRow(scalar, schema, { plan: 'pro' })).toBe(false);
  });
});

describe('row labels (rule 46)', () => {
  it('numbers one past the HIGHEST Condition <n>, not one past the row count', () => {
    expect(nextRowLabel([])).toBe('Condition 1');
    expect(nextRowLabel([row({ label: 'Condition 1' }), row({ label: 'Condition 3' })])).toBe(
      'Condition 4',
    );
  });

  it('ignores a label the author wrote themselves', () => {
    expect(nextRowLabel([row({ label: 'Business' })])).toBe('Condition 1');
  });
});

describe('switch mode (rule 51)', () => {
  const single = (id: string, value: string) =>
    row({ id, clauses: [{ id: `cl-${id}`, field: 'plan', operator: 'equals', value }] });

  it('names the one field when every row is a single equals on it', () => {
    expect(switchField([single('a', 'basic'), single('b', 'pro')])).toBe('plan');
  });

  it('is unavailable when a row holds two clauses, another field, or another operator', () => {
    expect(switchField([])).toBeUndefined();
    expect(
      switchField([
        single('a', 'basic'),
        row({ id: 'b', clauses: [clause(), clause({ id: 'c2' })] }),
      ]),
    ).toBeUndefined();
    expect(switchField([single('a', 'basic'), row({ id: 'b' })])).toBeUndefined();
    expect(
      switchField([row({ clauses: [clause({ operator: 'contains', value: 'A' })] })]),
    ).toBeUndefined();
  });

  it("reads an absent or unknown mode as 'rules'", () => {
    expect(conditionMode(conditionOf({ id: 'c1', rows: [] }))).toBe('rules');
    expect(conditionMode(conditionOf({ id: 'c1', mode: 'nope', rows: [] }))).toBe('rules');
    expect(conditionMode(conditionOf({ id: 'c1', mode: 'switch', rows: [] }))).toBe('switch');
  });
});

describe('the Else handle (rule 37)', () => {
  it("is the reserved id 'else'", () => {
    expect(DEFAULT_HANDLE).toBe('else');
  });
});
