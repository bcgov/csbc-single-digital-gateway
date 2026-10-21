import { describe, expect, it } from 'vitest';
import type { Clause, Operator } from '../src/types/elements';
import {
  clauseProblems,
  emptyListMessage,
  missingValueMessage,
  needsValue,
  OPERATORS_BY_KIND,
  operatorsFor,
  unknownChoiceMessage,
  unknownFieldMessage,
  takesList,
  unknownOperatorMessage,
  wrongTypeMessage,
  type CriterionField,
} from '../src/renderers/xyflow/criteria';

// Doc 199 rules 1-5, 36 — the clause model: operators keyed by the field's ControlKind, which operators need a
// value, which take a LIST, and what makes a clause invalid. Pure, no React, no @xyflow/react.

const text: CriterionField = { key: 'k1', label: 'Full name', kind: 'text' };
const number: CriterionField = { key: 'k2', label: 'Team size', kind: 'number' };
const boolean: CriterionField = { key: 'k3', label: 'Subscribed', kind: 'boolean' };
const choice: CriterionField = {
  key: 'k4',
  label: 'Province',
  kind: 'choice',
  options: [
    { value: 'bc', label: 'British Columbia' },
    { value: 'ab', label: 'Alberta' },
  ],
};
const FIELDS = [text, number, boolean, choice];

const clause = (patch: Partial<Clause> = {}): Clause => ({
  id: 'c1',
  field: 'k1',
  operator: 'equals',
  value: 'Ada',
  ...patch,
});

/**
 * A clause with NO `value` key at all. `exactOptionalPropertyTypes` forbids passing an explicit `undefined`
 * to an optional property, and absent-vs-undefined is exactly what `needsValue` turns on — so the two fixtures
 * are kept apart rather than spreading `{ value: undefined }`.
 */
const withoutValue = (patch: Partial<Omit<Clause, 'value'>> = {}): Clause => ({
  id: 'c1',
  field: 'k1',
  operator: 'isEmpty',
  ...patch,
});

describe('operators by field kind (rules 1-2)', () => {
  it('offers equality, the substring operators and presence for a text field (rule 36)', () => {
    expect(operatorsFor('text')).toEqual([
      'equals',
      'notEquals',
      'contains',
      'startsWith',
      'endsWith',
      'isEmpty',
      'isNotEmpty',
    ]);
  });

  it('offers the comparisons as well for a number field', () => {
    expect(operatorsFor('number')).toEqual([
      'equals',
      'notEquals',
      'gt',
      'gte',
      'lt',
      'lte',
      'isEmpty',
      'isNotEmpty',
    ]);
  });

  it('offers equality, the list operators and presence for a choice field (rule 36)', () => {
    expect(operatorsFor('choice')).toEqual([
      'equals',
      'notEquals',
      'in',
      'notIn',
      'isEmpty',
      'isNotEmpty',
    ]);
    // A choice is a closed set, so "contains" and the comparisons would be meaningless.
    expect(operatorsFor('choice')).not.toContain('contains');
    expect(operatorsFor('choice')).not.toContain('gt');
  });

  it('offers isTrue/isFalse only for a boolean field', () => {
    expect(operatorsFor('boolean')).toEqual(['isTrue', 'isFalse']);
  });

  it('exposes one frozen OPERATORS_BY_KIND map read only through operatorsFor', () => {
    expect(Object.isFrozen(OPERATORS_BY_KIND)).toBe(true);
    for (const kind of ['text', 'number', 'choice', 'boolean'] as const) {
      expect(Object.isFrozen(OPERATORS_BY_KIND[kind]), kind).toBe(true);
      expect(operatorsFor(kind), kind).toBe(OPERATORS_BY_KIND[kind]);
    }
  });

  it('returns no operators for an unknown kind rather than throwing', () => {
    expect(operatorsFor(undefined)).toEqual([]);
  });
});

describe('needsValue (rule 3)', () => {
  it('is false for isEmpty, isNotEmpty, isTrue and isFalse', () => {
    for (const operator of ['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse'] as const) {
      expect(needsValue(operator), operator).toBe(false);
    }
  });

  it('is true for every comparison, equality, substring and list operator', () => {
    const withValue: Operator[] = [
      'equals',
      'notEquals',
      'contains',
      'startsWith',
      'endsWith',
      'in',
      'notIn',
      'gt',
      'gte',
      'lt',
      'lte',
    ];
    for (const operator of withValue) expect(needsValue(operator), operator).toBe(true);
  });
});

describe('takesList (rule 36)', () => {
  it('is true for in and notIn alone', () => {
    expect(takesList('in')).toBe(true);
    expect(takesList('notIn')).toBe(true);
    for (const operator of ['equals', 'contains', 'gt', 'isEmpty', 'isTrue'] as const) {
      expect(takesList(operator), operator).toBe(false);
    }
  });
});

const inClause = (value: unknown): Clause =>
  ({ id: 'c1', field: 'k4', operator: 'in', value }) as Clause;

describe('list-valued clauses (rule 36)', () => {
  it('accepts a list of the choice field’s own option values', () => {
    expect(clauseProblems(inClause(['bc', 'ab']), FIELDS)).toEqual([]);
  });

  it('refuses a scalar where a list belongs, as the wrong TYPE', () => {
    expect(clauseProblems(inClause('bc'), FIELDS)).toEqual([wrongTypeMessage('Province')]);
  });

  it('refuses a list where a scalar belongs', () => {
    expect(
      clauseProblems(clause({ field: 'k4', operator: 'equals', value: ['bc'] }), FIELDS),
    ).toEqual([wrongTypeMessage('Province')]);
  });

  it('refuses an EMPTY list: it could never match anything', () => {
    expect(clauseProblems(inClause([]), FIELDS)).toEqual([emptyListMessage('in')]);
  });

  it('reports an entry that is not one of the field’s options', () => {
    expect(clauseProblems(inClause(['bc', 'yt']), FIELDS)).toEqual([
      unknownChoiceMessage('Province'),
    ]);
  });
});

describe('clauseProblems (rules 4-5)', () => {
  it('accepts a complete criterion against a matching field', () => {
    expect(clauseProblems(clause(), FIELDS)).toEqual([]);
    expect(clauseProblems(clause({ field: 'k2', operator: 'gte', value: 3 }), FIELDS)).toEqual([]);
    expect(
      clauseProblems(clause({ field: 'k4', operator: 'equals', value: 'bc' }), FIELDS),
    ).toEqual([]);
  });

  it('reports a field that is not in the offered set', () => {
    expect(clauseProblems(clause({ field: 'gone' }), FIELDS)).toEqual([
      unknownFieldMessage('gone'),
    ]);
    // With no field there is nothing to judge the operator or value against.
    expect(clauseProblems(clause({ field: 'gone' }), FIELDS)).toHaveLength(1);
  });

  it("reports an operator that is not in the field kind's set", () => {
    expect(clauseProblems(clause({ operator: 'gt' }), FIELDS)).toEqual([
      unknownOperatorMessage('gt', 'Full name'),
    ]);
    expect(
      clauseProblems(clause({ field: 'k3', operator: 'equals', value: true }), FIELDS),
    ).toEqual([unknownOperatorMessage('equals', 'Subscribed')]);
  });

  it('reports a missing value when the operator needs one', () => {
    expect(clauseProblems(withoutValue({ operator: 'equals' }), FIELDS)).toEqual([
      missingValueMessage('equals'),
    ]);
  });

  it('reports a value of the wrong type for the field', () => {
    expect(clauseProblems(clause({ field: 'k2', operator: 'gt', value: 'three' }), FIELDS)).toEqual(
      [wrongTypeMessage('Team size')],
    );
    expect(clauseProblems(clause({ value: 7 }), FIELDS)).toEqual([wrongTypeMessage('Full name')]);
    // A non-finite number is not a usable comparison value either.
    expect(
      clauseProblems(clause({ field: 'k2', operator: 'gt', value: Number.NaN }), FIELDS),
    ).toEqual([wrongTypeMessage('Team size')]);
  });

  it("reports a choice value that is not one of the field's choiceOptions consts (rule 4)", () => {
    expect(
      clauseProblems(clause({ field: 'k4', operator: 'equals', value: 'yt' }), FIELDS),
    ).toEqual([unknownChoiceMessage('Province')]);
  });

  it('accepts an absent value for a presence or boolean operator', () => {
    expect(clauseProblems(withoutValue({ operator: 'isEmpty' }), FIELDS)).toEqual([]);
    expect(clauseProblems(withoutValue({ field: 'k3', operator: 'isTrue' }), FIELDS)).toEqual([]);
  });
});
