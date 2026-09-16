import { describe, expect, it } from 'vitest';
import type { Criterion, Operator } from '../src/types/elements';
import {
  criterionProblems,
  missingValueMessage,
  needsValue,
  OPERATORS_BY_KIND,
  operatorsFor,
  unknownChoiceMessage,
  unknownFieldMessage,
  unknownOperatorMessage,
  wrongTypeMessage,
  type CriterionField,
} from '../src/renderers/xyflow/criteria';

// Doc 199 rules 1-5 — the criterion model: operators keyed by the field's ControlKind, which
// operators need a value, and what makes a criterion invalid. Pure, no React, no @xyflow/react.

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

const criterion = (patch: Partial<Criterion> = {}): Criterion => ({
  id: 'c1',
  field: 'k1',
  operator: 'equals',
  value: 'Ada',
  ...patch,
});

/**
 * A criterion with NO `value` key at all. `exactOptionalPropertyTypes` forbids passing an explicit `undefined`
 * to an optional property, and absent-vs-undefined is exactly what `needsValue` turns on — so the two fixtures
 * are kept apart rather than spreading `{ value: undefined }`.
 */
const withoutValue = (patch: Partial<Omit<Criterion, 'value'>> = {}): Criterion => ({
  id: 'c1',
  field: 'k1',
  operator: 'isEmpty',
  ...patch,
});

describe('operators by field kind (rules 1-2)', () => {
  it('offers equals/notEquals/contains/isEmpty/isNotEmpty for a text field', () => {
    expect(operatorsFor('text')).toEqual([
      'equals',
      'notEquals',
      'contains',
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

  it('offers equality and presence only for a choice field', () => {
    expect(operatorsFor('choice')).toEqual(['equals', 'notEquals', 'isEmpty', 'isNotEmpty']);
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

  it('is true for every comparison and equality operator', () => {
    const withValue: Operator[] = ['equals', 'notEquals', 'contains', 'gt', 'gte', 'lt', 'lte'];
    for (const operator of withValue) expect(needsValue(operator), operator).toBe(true);
  });
});

describe('criterionProblems (rules 4-5)', () => {
  it('accepts a complete criterion against a matching field', () => {
    expect(criterionProblems(criterion(), FIELDS)).toEqual([]);
    expect(
      criterionProblems(criterion({ field: 'k2', operator: 'gte', value: 3 }), FIELDS),
    ).toEqual([]);
    expect(
      criterionProblems(criterion({ field: 'k4', operator: 'equals', value: 'bc' }), FIELDS),
    ).toEqual([]);
  });

  it('reports a field that is not in the offered set', () => {
    expect(criterionProblems(criterion({ field: 'gone' }), FIELDS)).toEqual([
      unknownFieldMessage('gone'),
    ]);
    // With no field there is nothing to judge the operator or value against.
    expect(criterionProblems(criterion({ field: 'gone' }), FIELDS)).toHaveLength(1);
  });

  it("reports an operator that is not in the field kind's set", () => {
    expect(criterionProblems(criterion({ operator: 'gt' }), FIELDS)).toEqual([
      unknownOperatorMessage('gt', 'Full name'),
    ]);
    expect(
      criterionProblems(criterion({ field: 'k3', operator: 'equals', value: true }), FIELDS),
    ).toEqual([unknownOperatorMessage('equals', 'Subscribed')]);
  });

  it('reports a missing value when the operator needs one', () => {
    expect(criterionProblems(withoutValue({ operator: 'equals' }), FIELDS)).toEqual([
      missingValueMessage('equals'),
    ]);
  });

  it('reports a value of the wrong type for the field', () => {
    expect(
      criterionProblems(criterion({ field: 'k2', operator: 'gt', value: 'three' }), FIELDS),
    ).toEqual([wrongTypeMessage('Team size')]);
    expect(criterionProblems(criterion({ value: 7 }), FIELDS)).toEqual([
      wrongTypeMessage('Full name'),
    ]);
    // A non-finite number is not a usable comparison value either.
    expect(
      criterionProblems(criterion({ field: 'k2', operator: 'gt', value: Number.NaN }), FIELDS),
    ).toEqual([wrongTypeMessage('Team size')]);
  });

  it("reports a choice value that is not one of the field's choiceOptions consts (rule 4)", () => {
    expect(
      criterionProblems(criterion({ field: 'k4', operator: 'equals', value: 'yt' }), FIELDS),
    ).toEqual([unknownChoiceMessage('Province')]);
  });

  it('accepts an absent value for a presence or boolean operator', () => {
    expect(criterionProblems(withoutValue({ operator: 'isEmpty' }), FIELDS)).toEqual([]);
    expect(criterionProblems(withoutValue({ field: 'k3', operator: 'isTrue' }), FIELDS)).toEqual(
      [],
    );
  });
});
