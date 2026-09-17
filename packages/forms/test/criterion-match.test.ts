import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { needsValue, operatorsFor } from '../src/renderers/xyflow/criteria';
import {
  conditionEdge,
  criterionFieldOf,
  firstMatchingRow,
  matchesClause,
} from '../src/runner/criterion-match';
import type { Clause, ConditionRow, Operator } from '../src/types/elements';

// Doc 202 rules 19-23, doc 199 rules 38-40 — the fill-time half of the clause model: does this clause MATCH the
// answers, and which ROW of a Condition wins?

const schema: JsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Full name' },
    age: { type: 'number' },
    agree: { type: 'boolean' },
    plan: {
      type: 'string',
      oneOf: [
        { const: 'basic', title: 'Basic' },
        { const: 'pro', title: 'Pro' },
      ],
    },
    things: { type: 'array' },
  },
};

const criterion = (field: string, operator: Operator, value?: unknown): Clause =>
  ({
    id: `c-${field}-${operator}`,
    field,
    operator,
    ...(value === undefined ? {} : { value }),
  }) as Clause;

const fieldFor = (key: string) => criterionFieldOf(key, schema);

/** `matchesClause` with the field resolved from the schema, which is how the traversal calls it. */
const matches = (crit: Clause, data: Record<string, unknown> | undefined) =>
  matchesClause(crit, fieldFor(crit.field), data);

/**
 * Doc 199 rule 35: one clause per row, so every pre-rows expectation about "the first matching criterion" reads
 * unchanged as one about the first matching ROW — the row id is the old criterion id, which is what the edges
 * address.
 */
const rowOf = (clause: Clause, match: ConditionRow['match'] = 'all'): ConditionRow => ({
  id: clause.id,
  label: clause.id,
  match,
  clauses: [clause],
});

/** A sanitised Flow edge, as `conditionEdge` is given them (never raw `options.edges`). */
const edge = (id: string, source: string, target: string, sourceHandle?: string) => ({
  id,
  source,
  target,
  ...(sourceHandle === undefined ? {} : { sourceHandle }),
});

const condition = (id: string, clauses: Clause[]) =>
  ({
    type: 'Condition',
    options: { id, rows: clauses.map((clause) => rowOf(clause)) },
  }) as unknown as UISchemaElement;

describe('matchesClause (doc 202 rules 19-23)', () => {
  describe('one vocabulary with the authoring half (rule 19)', () => {
    it('shares needsValue and operatorsFor with criterionProblems, so the two cannot disagree', () => {
      // The evaluator refuses exactly the operators the authoring validator refuses, for the same kind.
      for (const key of ['name', 'age', 'agree', 'plan']) {
        const field = fieldFor(key);
        expect(field, key).toBeDefined();
        const offered = operatorsFor(field?.kind);
        expect(offered.length, key).toBeGreaterThan(0);
        // An operator the kind does not offer never matches, whatever the answer.
        const notOffered = (['contains', 'gt', 'isTrue'] as Operator[]).filter(
          (operator) => !offered.includes(operator),
        );
        for (const operator of notOffered) {
          expect(matches(criterion(key, operator, 'x'), { [key]: 'x' }), `${key}/${operator}`).toBe(
            false,
          );
        }
      }
      // And the value-taking set is the shared one.
      expect(needsValue('equals')).toBe(true);
      expect(needsValue('isEmpty')).toBe(false);
    });

    it('never matches an operator the field kind does not offer', () => {
      // `contains` is text-only; a number field must refuse it even when the substring would "work".
      expect(operatorsFor('number')).not.toContain('contains');
      expect(matches(criterion('age', 'contains', '1'), { age: 21 })).toBe(false);
    });
  });

  describe('operator semantics (rule 20)', () => {
    it('compares equals and notEquals strictly', () => {
      expect(matches(criterion('name', 'equals', 'Ada'), { name: 'Ada' })).toBe(true);
      expect(matches(criterion('name', 'equals', 'Ada'), { name: 'ada' })).toBe(false);
      expect(matches(criterion('name', 'notEquals', 'Ada'), { name: 'Grace' })).toBe(true);
      expect(matches(criterion('name', 'notEquals', 'Ada'), { name: 'Ada' })).toBe(false);
      // No answer at all is not equal to anything.
      expect(matches(criterion('name', 'notEquals', 'Ada'), {})).toBe(true);
    });

    it('treats contains as a case-insensitive substring of a string answer', () => {
      expect(matches(criterion('name', 'contains', 'da'), { name: 'Ada' })).toBe(true);
      expect(matches(criterion('name', 'contains', 'DA'), { name: 'Ada' })).toBe(true);
      expect(matches(criterion('name', 'contains', 'zz'), { name: 'Ada' })).toBe(false);
      expect(matches(criterion('name', 'contains', 'da'), {})).toBe(false);
    });

    it('compares gt, gte, lt and lte as finite numbers', () => {
      expect(matches(criterion('age', 'gt', 18), { age: 21 })).toBe(true);
      expect(matches(criterion('age', 'gt', 21), { age: 21 })).toBe(false);
      expect(matches(criterion('age', 'gte', 21), { age: 21 })).toBe(true);
      expect(matches(criterion('age', 'lt', 21), { age: 18 })).toBe(true);
      expect(matches(criterion('age', 'lte', 18), { age: 18 })).toBe(true);
      // A non-numeric or absent answer never compares.
      expect(matches(criterion('age', 'gt', 18), { age: '21' })).toBe(false);
      expect(matches(criterion('age', 'gt', 18), {})).toBe(false);
      expect(matches(criterion('age', 'gt', 18), { age: Number.NaN })).toBe(false);
    });

    it('treats undefined, null and empty string as empty for isEmpty and isNotEmpty', () => {
      for (const answer of [undefined, null, '']) {
        expect(matches(criterion('name', 'isEmpty'), { name: answer })).toBe(true);
        expect(matches(criterion('name', 'isNotEmpty'), { name: answer })).toBe(false);
      }
      expect(matches(criterion('name', 'isEmpty'), {})).toBe(true);
      expect(matches(criterion('name', 'isNotEmpty'), { name: 'Ada' })).toBe(true);
      // 0 and false are answers, not emptiness.
      expect(matches(criterion('age', 'isEmpty'), { age: 0 })).toBe(false);
      expect(matches(criterion('agree', 'isEmpty'), { agree: false })).toBe(false);
    });

    it('requires a real boolean for isTrue and isFalse', () => {
      expect(matches(criterion('agree', 'isTrue'), { agree: true })).toBe(true);
      expect(matches(criterion('agree', 'isFalse'), { agree: false })).toBe(true);
      expect(matches(criterion('agree', 'isTrue'), { agree: 'true' })).toBe(false);
      expect(matches(criterion('agree', 'isTrue'), {})).toBe(false);
      expect(matches(criterion('agree', 'isFalse'), {})).toBe(false);
    });
  });

  describe('choosing a branch (rules 21, 23)', () => {
    const business = criterion('plan', 'equals', 'pro');
    const named = criterion('name', 'equals', 'Ada');

    it('evaluates rows in authored order and takes the first match', () => {
      const node = condition('x', [business, named]);
      // Both match; the FIRST authored one wins, like an if/else-if chain.
      expect(firstMatchingRow(node, schema, { plan: 'pro', name: 'Ada' })?.id).toBe(business.id);
      // Reversing the authored order reverses the winner.
      expect(
        firstMatchingRow(condition('x', [named, business]), schema, {
          plan: 'pro',
          name: 'Ada',
        })?.id,
      ).toBe(named.id);
    });

    it("follows the edge whose sourceHandle is the matching criterion's id", () => {
      const node = condition('x', [business, named]);
      const edges = [
        edge('e1', 'x', 's1', business.id),
        edge('e2', 'x', 's2', named.id),
        edge('e3', 'x', 's3'),
      ];
      expect(
        conditionEdge({ condition: node, nodeId: 'x', edges, schema, data: { plan: 'pro' } })?.id,
      ).toBe('e1');
      expect(
        conditionEdge({ condition: node, nodeId: 'x', edges, schema, data: { name: 'Ada' } })?.id,
      ).toBe('e2');
    });

    it('takes the edge with no sourceHandle — the default path — when nothing matches', () => {
      const node = condition('x', [business]);
      const edges = [edge('e1', 'x', 's1', business.id), edge('e3', 'x', 's3')];
      expect(
        conditionEdge({ condition: node, nodeId: 'x', edges, schema, data: { plan: 'basic' } })?.id,
      ).toBe('e3');
    });

    it('falls back to the default when a matching criterion is connected to nothing', () => {
      // First match wins, so the rows after it were never in play — the Else path is the answer.
      const node = condition('x', [business, named]);
      const edges = [edge('e2', 'x', 's2', named.id), edge('e3', 'x', 's3')];
      expect(
        conditionEdge({
          condition: node,
          nodeId: 'x',
          edges,
          schema,
          data: { plan: 'pro', name: 'Ada' },
        })?.id,
      ).toBe('e3');
    });

    it('returns undefined rather than throwing when a Condition has no default', () => {
      // flowProblems refuses this, but a hand-edited document never passed that gate.
      const node = condition('x', [business]);
      expect(
        conditionEdge({
          condition: node,
          nodeId: 'x',
          edges: [edge('e1', 'x', 's1', business.id)],
          schema,
          data: { plan: 'basic' },
        }),
      ).toBeUndefined();
    });

    it('takes the Else path for a Condition with no rows (rule 23)', () => {
      const node = condition('x', []);
      expect(firstMatchingRow(node, schema, {})).toBeUndefined();
      expect(
        conditionEdge({
          condition: node,
          nodeId: 'x',
          edges: [edge('e3', 'x', 's3')],
          schema,
          data: {},
        })?.id,
      ).toBe('e3');
    });

    it('only considers edges leaving this Condition', () => {
      const node = condition('x', [business]);
      const edges = [edge('other', 'y', 's9'), edge('e3', 'x', 's3')];
      expect(conditionEdge({ condition: node, nodeId: 'x', edges, schema, data: {} })?.id).toBe(
        'e3',
      );
    });
  });

  describe('a criterion that cannot be evaluated never matches (rule 22)', () => {
    it('does not match when the field is dangling', () => {
      expect(criterionFieldOf('ghost', schema)).toBeUndefined();
      expect(matches(criterion('ghost', 'equals', 'x'), { ghost: 'x' })).toBe(false);
      // A property of a type no operator set covers is dangling for this purpose too.
      expect(criterionFieldOf('things', schema)).toBeUndefined();
    });

    it('does not match when the value is of the wrong type for the field', () => {
      expect(matches(criterion('age', 'equals', '21'), { age: 21 })).toBe(false);
      expect(matches(criterion('name', 'equals', 21), { name: 21 })).toBe(false);
    });

    it('does not match when a value-taking operator has no value', () => {
      expect(matches(criterion('name', 'equals'), { name: 'Ada' })).toBe(false);
      expect(matches(criterion('age', 'gt'), { age: 21 })).toBe(false);
    });

    it('refuses a field resolved for a different key, rather than comparing the wrong answer', () => {
      expect(
        matchesClause(criterion('name', 'equals', 'Ada'), fieldFor('age'), { name: 'Ada' }),
      ).toBe(false);
    });

    it('sends the user down the default path rather than throwing', () => {
      const dangling = criterion('ghost', 'equals', 'x');
      const node = condition('x', [dangling]);
      const edges = [edge('e1', 'x', 's1', dangling.id), edge('e3', 'x', 's3')];
      expect(
        conditionEdge({ condition: node, nodeId: 'x', edges, schema, data: { ghost: 'x' } })?.id,
      ).toBe('e3');
    });

    it('is total: no answer shape throws', () => {
      for (const data of [undefined, {}, { name: null }, { name: [] }, { age: 'x' }]) {
        expect(() =>
          matches(criterion('name', 'equals', 'Ada'), data as Record<string, unknown> | undefined),
        ).not.toThrow();
      }
    });
  });

  describe('criterionFieldOf', () => {
    it('resolves a top-level property by key, naming it by title else key', () => {
      expect(criterionFieldOf('name', schema)).toMatchObject({
        key: 'name',
        label: 'Full name',
        kind: 'text',
      });
      expect(criterionFieldOf('age', schema)).toMatchObject({
        key: 'age',
        label: 'age',
        kind: 'number',
      });
    });

    it('carries the options of a choice field', () => {
      expect(criterionFieldOf('plan', schema)?.kind).toBe('choice');
      expect(criterionFieldOf('plan', schema)?.options?.map(({ value }) => value)).toEqual([
        'basic',
        'pro',
      ]);
    });

    it('never resolves an inherited name as a property', () => {
      expect(criterionFieldOf('toString', schema)).toBeUndefined();
    });

    it('still evaluates a choice value the author has since removed from the options', () => {
      // Authoring refuses this; fill time must not, or a notEquals against a deleted option would break.
      expect(matches(criterion('plan', 'notEquals', 'gone'), { plan: 'pro' })).toBe(true);
    });
  });
});
