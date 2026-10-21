import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { controlKindOf } from '../src/renderers/ui/control-kind';
import {
  clauseProblems as rawClauseProblems,
  OPERATOR_LABELS,
  OPERATORS_BY_KIND,
  operatorsFor,
  takesList,
} from '../src/renderers/xyflow/criteria';
import { criterionFieldOf, matchesClause } from '../src/runner/criterion-match';
import { UISCHEMA_METASCHEMA } from '../src/studio/code/metaschema/uischema-metaschema';
import { validateUischemaDocument } from '../src/studio/code/validate-document';
import type { Clause } from '../src/types/elements';

// Doc 205 rules 26-32, 39 — the first ARRAY-valued answer in Flow Conditions.

const SUPPORTS = [
  { const: 'wheelchair', title: 'Wheelchair access' },
  { const: 'interpreter', title: 'Interpreter' },
];

const schema = {
  type: 'object',
  properties: {
    supports: { type: 'array', title: 'Supports', uniqueItems: true, items: { oneOf: SUPPORTS } },
    plan: { type: 'string', title: 'Plan', oneOf: [{ const: 'basic', title: 'Basic' }] },
    note: { type: 'string', title: 'Note' },
  },
} as JsonSchema;

const field = criterionFieldOf('supports', schema)!;

/** `clauseProblems` takes the field LIST; every case here is about one field. */
const clauseProblems = (c: Clause, f: typeof field) => rawClauseProblems(c, [f]);

const clause = (operator: Clause['operator'], value?: unknown): Clause =>
  ({ id: 'c1', field: 'supports', operator, ...(value === undefined ? {} : { value }) }) as Clause;

describe("ControlKind 'multi-choice' (rule 26)", () => {
  it('classifies a multi-choice property, checked before the type fallthrough', () => {
    expect(controlKindOf(schema.properties?.['supports'])).toBe('multi-choice');
  });

  it('still classifies single choice, text, number and boolean as before', () => {
    expect(controlKindOf(schema.properties?.['plan'])).toBe('choice');
    expect(controlKindOf(schema.properties?.['note'])).toBe('text');
    expect(controlKindOf({ type: 'number' })).toBe('number');
    expect(controlKindOf({ type: 'boolean' })).toBe('boolean');
    // A bare array is still not a field at all — only one whose items describe a choice list.
    expect(controlKindOf({ type: 'array' })).toBeUndefined();
  });

  it('offers the field as a criterion, carrying its options (rule 31)', () => {
    expect(field).toEqual({
      key: 'supports',
      label: 'Supports',
      kind: 'multi-choice',
      options: [
        { value: 'wheelchair', label: 'Wheelchair access' },
        { value: 'interpreter', label: 'Interpreter' },
      ],
    });
  });
});

describe('operators (rules 27-28)', () => {
  it('offers exactly includes, notIncludes, isEmpty and isNotEmpty', () => {
    expect(operatorsFor('multi-choice')).toEqual([
      'includes',
      'notIncludes',
      'isEmpty',
      'isNotEmpty',
    ]);
  });

  it('does not offer equals/notEquals, which compare an array by reference (rule 27)', () => {
    expect(operatorsFor('multi-choice')).not.toContain('equals');
    expect(operatorsFor('multi-choice')).not.toContain('notEquals');
  });

  it('keeps includes/notIncludes OUT of takesList — the value is ONE const (rule 28)', () => {
    expect(takesList('includes')).toBe(false);
    expect(takesList('notIncludes')).toBe(false);
    // `in`/`notIn` keep their existing, opposite meaning and stay list-valued.
    expect(takesList('in')).toBe(true);
  });

  it('leaves in/notIn to the single choice kind, and every other kind unchanged', () => {
    expect(operatorsFor('choice')).toContain('in');
    expect(operatorsFor('choice')).not.toContain('includes');
    expect(operatorsFor('text')).not.toContain('includes');
    expect(Object.keys(OPERATORS_BY_KIND)).toContain('multi-choice');
  });

  it('labels both new operators', () => {
    expect(OPERATOR_LABELS.includes).toBe('includes');
    expect(OPERATOR_LABELS.notIncludes).toBe('does not include');
  });
});

describe('matching an array answer (rules 28-29)', () => {
  it('includes is true when the answer contains the const, false when it does not', () => {
    expect(
      matchesClause(clause('includes', 'wheelchair'), field, { supports: ['wheelchair'] }),
    ).toBe(true);
    expect(
      matchesClause(clause('includes', 'wheelchair'), field, {
        supports: ['interpreter', 'wheelchair'],
      }),
    ).toBe(true);
    expect(
      matchesClause(clause('includes', 'wheelchair'), field, { supports: ['interpreter'] }),
    ).toBe(false);
  });

  it('notIncludes is its exact negation, including for an absent answer', () => {
    for (const data of [{ supports: ['interpreter'] }, { supports: [] }, {}]) {
      const includes = matchesClause(clause('includes', 'wheelchair'), field, data);
      const notIncludes = matchesClause(clause('notIncludes', 'wheelchair'), field, data);
      expect(notIncludes, JSON.stringify(data)).toBe(!includes);
    }
    expect(matchesClause(clause('notIncludes', 'wheelchair'), field, {})).toBe(true);
  });

  it('is false for a scalar answer, which cannot contain anything', () => {
    expect(matchesClause(clause('includes', 'wheelchair'), field, { supports: 'wheelchair' })).toBe(
      false,
    );
  });

  it('treats an EMPTY array as an empty answer (rule 29)', () => {
    // Otherwise an untouched multi-select reads as answered and conditionDecided routes a blank branch.
    expect(matchesClause(clause('isEmpty'), field, { supports: [] })).toBe(true);
    expect(matchesClause(clause('isNotEmpty'), field, { supports: [] })).toBe(false);
    expect(matchesClause(clause('isNotEmpty'), field, { supports: ['wheelchair'] })).toBe(true);
    expect(matchesClause(clause('isEmpty'), field, {})).toBe(true);
  });

  it('leaves isEmpty/isNotEmpty correct for every other kind', () => {
    const note = criterionFieldOf('note', schema);
    const noteClause = { id: 'c', field: 'note', operator: 'isEmpty' } as Clause;
    expect(matchesClause(noteClause, note, { note: '' })).toBe(true);
    expect(matchesClause(noteClause, note, { note: 'x' })).toBe(false);
    // `0` and `false` remain answers, not emptiness.
    const number = criterionFieldOf('n', { type: 'object', properties: { n: { type: 'number' } } });
    expect(
      matchesClause({ id: 'c', field: 'n', operator: 'isEmpty' } as Clause, number, { n: 0 }),
    ).toBe(false);
  });

  it('refuses an operator the kind does not offer, and a wrong-typed value', () => {
    expect(matchesClause(clause('equals', 'wheelchair'), field, { supports: ['wheelchair'] })).toBe(
      false,
    );
    expect(matchesClause(clause('includes', true), field, { supports: ['wheelchair'] })).toBe(
      false,
    );
  });
});

describe('the flow metaschema (rules 30, 39)', () => {
  /**
   * A COMPLETE Flow: the gate also refuses a Condition with no Else path (doc 199), so a bare Condition would
   * fail for a reason that has nothing to do with the operator under test.
   */
  const document = (operator: string) =>
    ({
      type: 'Flow',
      options: {
        startId: 'a',
        edges: [
          { id: 'e1', source: 'a', target: 'x' },
          { id: 'e2', source: 'x', target: 'b', sourceHandle: 'r1' },
          { id: 'e3', source: 'x', target: 'c' },
        ],
      },
      elements: [
        { type: 'Stage', label: 'Start', id: 'a', elements: [] },
        {
          type: 'Condition',
          label: 'Needs support',
          id: 'x',
          options: {
            rows: [
              {
                id: 'r1',
                label: 'Needs support',
                match: 'all',
                clauses: [{ id: 'c1', field: 'supports', operator, value: 'wheelchair' }],
              },
            ],
          },
        },
        { type: 'Stage', label: 'Yes', id: 'b', elements: [] },
        { type: 'Stage', label: 'No', id: 'c', elements: [] },
      ],
    }) as unknown as UISchemaElement;

  it('lists includes and notIncludes in the hard-coded operator enum', () => {
    // The ONE operator site that is not a compile error — it would quietly invalidate a valid Flow.
    const text = JSON.stringify(UISCHEMA_METASCHEMA);
    expect(text).toContain('includes');
    expect(text).toContain('notIncludes');
  });

  it('accepts a Flow whose Condition uses includes at the apply gate', () => {
    expect(validateUischemaDocument(document('includes')).valid).toBe(true);
    expect(validateUischemaDocument(document('notIncludes')).valid).toBe(true);
  });

  it('still refuses an operator that does not exist', () => {
    expect(validateUischemaDocument(document('containsAny')).valid).toBe(false);
  });
});

describe('a multi-choice clause is membership-checked too (doc 206 rule 24, closed)', () => {
  /**
   * `criteria.ts` checked membership for `choice` ONLY, so a broken `includes` value was reported NOWHERE:
   * not on the canvas at authoring time, and deliberately not at fill time either (`criterion-match.ts`
   * does not re-check), where it silently followed the Else path. Doc 206 rule 24 left it open because the
   * markers would have been unfixable — `setClause` refused every edit to a clause with problems. Rule 24b
   * fixed that, so the check can now be turned on.
   */
  it('reports a value that is not one of the options', () => {
    expect(clauseProblems(clause('includes', 'nonsense'), field)).not.toEqual([]);
    expect(clauseProblems(clause('notIncludes', 'nonsense'), field)).not.toEqual([]);
  });

  it('accepts every value that IS one of the options', () => {
    for (const option of SUPPORTS)
      expect(clauseProblems(clause('includes', option.const), field), option.const).toEqual([]);
  });

  it('leaves the operators that take no value alone', () => {
    expect(clauseProblems(clause('isEmpty'), field)).toEqual([]);
    expect(clauseProblems(clause('isNotEmpty'), field)).toEqual([]);
  });

  it('still reports a wrong-TYPED value as a type problem, not a membership one', () => {
    expect(clauseProblems(clause('includes', true), field)).not.toEqual([]);
  });

  it('leaves SINGLE choice behaving exactly as before', () => {
    const plan = criterionFieldOf('plan', schema)!;
    const on = (value: unknown) =>
      ({ id: 'c1', field: 'plan', operator: 'equals', value }) as Clause;
    expect(clauseProblems(on('basic'), plan)).toEqual([]);
    expect(clauseProblems(on('gone'), plan)).not.toEqual([]);
  });
});
