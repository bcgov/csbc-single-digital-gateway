import type { JsonSchema } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { clauseProblems } from '../src/renderers/xyflow/criteria';
import { criterionFieldOf, matchesClause } from '../src/runner/criterion-match';
import { setClause } from '../src/studio/layout/clause-edits';
import { createElementIds } from '../src/studio/layout/element-ids';
import { child, clausesIn, condition, control, flow, row, stage } from './condition-edit-fixtures';
import type { Clause } from '../src/types/elements';

// Doc 206 rules 39-40 — a choice field's consts may be NUMBERS, and a clause may move between choice fields.
//
// Reported as "I can't change the value in the condition popup, the first item stays selected". The cause was
// worse than it looked: on a numeric-const choice field EVERY value was refused — the real const failed the
// type guard, the select's raw string failed the membership check — and `setClause` refuses any edit that
// lands on a problem, so the picker was frozen on `startingValue`, which is options[0].

const schema = {
  type: 'object',
  properties: {
    province: { type: 'string', title: 'Province', oneOf: [{ const: 'bc' }, { const: 'ab' }] },
    colour: { type: 'string', title: 'Colour', oneOf: [{ const: 'red' }, { const: 'blue' }] },
    team: { type: 'number', title: 'Team size', oneOf: [{ const: 1 }, { const: 10 }] },
  },
} as JsonSchema;

const base = (rows: object[]) =>
  flow(
    [
      stage('a', [control('province'), control('colour'), control('team')]),
      condition('c', rows),
      stage('b'),
    ],
    [{ id: 'e0', source: 'a', target: 'c' }],
  );

/** `patch` applied to the row's single clause, and what the document ended up holding. */
const edit = (clause: object, patch: object) => {
  const ids = createElementIds();
  const root = base([row('x', clause)]);
  const next = setClause(
    { schema, uischema: root },
    ids.idOf(child(root, 1)),
    'x',
    'cl1',
    patch,
    ids,
  );
  return clausesIn(child(next.uischema, 1))[0];
};

const fieldsOf = (key: string) => [criterionFieldOf(key, schema)!];
const clauseOn = (key: string, operator: string, value: unknown) =>
  ({ id: 'cl1', field: key, operator, value }) as Clause;

describe('a numeric-const choice field is still a choice field (rule 39)', () => {
  it('classifies it as a choice, carrying numeric option values', () => {
    expect(criterionFieldOf('team', schema)).toMatchObject({
      kind: 'choice',
      options: [
        { value: 1, label: '1' },
        { value: 10, label: '10' },
      ],
    });
  });

  it('accepts a NUMERIC const as a clause value', () => {
    expect(clauseProblems(clauseOn('team', 'equals', 10), fieldsOf('team'))).toEqual([]);
  });

  it('still refuses a string that is not one of the consts', () => {
    expect(clauseProblems(clauseOn('team', 'equals', '10'), fieldsOf('team'))).not.toEqual([]);
  });

  it('still refuses a number that is not one of the consts', () => {
    expect(clauseProblems(clauseOn('team', 'equals', 7), fieldsOf('team'))).not.toEqual([]);
  });

  it('leaves a STRING choice field behaving exactly as before', () => {
    expect(clauseProblems(clauseOn('province', 'equals', 'bc'), fieldsOf('province'))).toEqual([]);
    expect(clauseProblems(clauseOn('province', 'equals', 'zz'), fieldsOf('province'))).not.toEqual(
      [],
    );
    expect(clauseProblems(clauseOn('province', 'equals', 1), fieldsOf('province'))).not.toEqual([]);
  });

  it('accepts a numeric list for in / notIn, and matches it at fill time', () => {
    expect(clauseProblems(clauseOn('team', 'in', [1, 10]), fieldsOf('team'))).toEqual([]);
    const field = criterionFieldOf('team', schema)!;
    expect(matchesClause(clauseOn('team', 'in', [1, 10]), field, { team: 10 })).toBe(true);
    expect(matchesClause(clauseOn('team', 'in', [1]), field, { team: 10 })).toBe(false);
  });
});

describe('the value picker can actually be changed (rule 39)', () => {
  it('writes another numeric const', () => {
    expect(edit(clauseOn('team', 'equals', 1), { value: 10 })).toEqual({
      id: 'cl1',
      field: 'team',
      operator: 'equals',
      value: 10,
    });
  });

  it('still refuses a value that is not one of the consts, leaving the clause alone', () => {
    expect(edit(clauseOn('team', 'equals', 1), { value: '10' })).toEqual({
      id: 'cl1',
      field: 'team',
      operator: 'equals',
      value: 1,
    });
  });
});

describe('a clause can move between choice fields (rule 40)', () => {
  it('restarts the value on the new field, instead of refusing the edit', () => {
    // Both are `choice`, so the KIND does not change — the old const used to be carried over, flagged as an
    // unknown choice, and the whole edit refused, so the field picker snapped back.
    expect(edit(clauseOn('province', 'equals', 'bc'), { field: 'colour' })).toEqual({
      id: 'cl1',
      field: 'colour',
      operator: 'equals',
      value: 'red',
    });
  });

  it('restarts on a numeric field’s first const', () => {
    expect(edit(clauseOn('province', 'equals', 'bc'), { field: 'team' })).toEqual({
      id: 'cl1',
      field: 'team',
      operator: 'equals',
      value: 1,
    });
  });

  it('KEEPS a value the new field still accepts', () => {
    const shared = {
      type: 'object',
      properties: {
        a: { type: 'string', title: 'A', oneOf: [{ const: 'x' }, { const: 'y' }] },
        b: { type: 'string', title: 'B', oneOf: [{ const: 'x' }, { const: 'z' }] },
      },
    } as JsonSchema;
    const ids = createElementIds();
    const root = flow(
      [
        stage('a', [control('a'), control('b')]),
        condition('c', [row('x', clauseOn('a', 'equals', 'x'))]),
        stage('b'),
      ],
      [{ id: 'e0', source: 'a', target: 'c' }],
    );
    const next = setClause(
      { schema: shared, uischema: root },
      ids.idOf(child(root, 1)),
      'x',
      'cl1',
      { field: 'b' },
      ids,
    );
    expect(clausesIn(child(next.uischema, 1))[0]).toMatchObject({ field: 'b', value: 'x' });
  });

  it('leaves a move that changes KIND working as it did', () => {
    expect(edit(clauseOn('province', 'equals', 'bc'), { field: 'colour' })).toMatchObject({
      field: 'colour',
    });
  });
});
