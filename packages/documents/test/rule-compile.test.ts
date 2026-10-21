import type { Clause, Operator } from '@repo/forms';
import { describe, expect, it } from 'vitest';
import { OPERATORS_BY_KIND, type FieldKind } from '../src/studio/criteria';
import {
  compileRule,
  readRule,
  ruleScopes,
  type RuleDraft,
} from '../src/studio/rules/rule-compile';

let n = 0;
const newId = () => `k${(n += 1)}`;
const kinds = new Map<string, FieldKind>([
  ['name', 'text'],
  ['age', 'number'],
  ['region', 'choice'],
  ['topics', 'multi'],
  ['agree', 'boolean'],
]);
const clause = (field: string, operator: Operator, value?: Clause['value']): Clause => ({
  id: 'c',
  field,
  operator,
  ...(value !== undefined && { value }),
});
const draft = (clauses: Clause[], match: 'all' | 'any' = 'all'): RuleDraft => ({
  effect: 'SHOW',
  match,
  clauses,
});

describe('compileRule (doc 256 rules 1-2)', () => {
  it('compiles one clause to a single leaf with the effect', () => {
    expect(
      compileRule({ ...draft([clause('region', 'equals', 'north')]), effect: 'HIDE' }, kinds),
    ).toEqual({
      effect: 'HIDE',
      condition: {
        scope: '#/properties/region',
        schema: { const: 'north' },
        failWhenUndefined: true,
      },
    });
  });

  it('compiles several clauses to an AND or OR condition by match', () => {
    const two = [clause('region', 'equals', 'north'), clause('age', 'gte', 18)];
    expect(compileRule(draft(two), kinds).condition).toEqual({
      type: 'AND',
      conditions: [
        { scope: '#/properties/region', schema: { const: 'north' }, failWhenUndefined: true },
        { scope: '#/properties/age', schema: { minimum: 18 }, failWhenUndefined: true },
      ],
    });
    expect(compileRule(draft(two, 'any'), kinds).condition['type']).toBe('OR');
  });

  it('writes each operator as its documented schema, failWhenUndefined only on positive tests', () => {
    const leaf = (c: Clause) => compileRule(draft([c]), kinds).condition;
    expect(leaf(clause('region', 'notEquals', 'north'))).toEqual({
      scope: '#/properties/region',
      schema: { not: { const: 'north' } },
    });
    expect(leaf(clause('region', 'in', ['north', 'coast']))['schema']).toEqual({
      enum: ['north', 'coast'],
    });
    expect(leaf(clause('age', 'lt', 65))['schema']).toEqual({ exclusiveMaximum: 65 });
    expect(leaf(clause('topics', 'includes', 'a'))).toEqual({
      scope: '#/properties/topics',
      schema: { contains: { const: 'a' } },
      failWhenUndefined: true,
    });
    expect(leaf(clause('agree', 'isTrue'))['schema']).toEqual({ const: true });
    expect(leaf(clause('agree', 'isFalse'))).toEqual({
      scope: '#/properties/agree',
      schema: { not: { const: true } },
    });
    expect(leaf(clause('name', 'isEmpty'))['schema']).toEqual({ const: '' });
    expect(leaf(clause('age', 'isEmpty'))['schema']).toEqual({ not: {} });
    expect(leaf(clause('topics', 'isNotEmpty'))).toEqual({
      scope: '#/properties/topics',
      schema: { minItems: 1 },
      failWhenUndefined: true,
    });
  });

  it('escapes regex metacharacters in contains, starts with and ends with', () => {
    const leaf = (c: Clause) => compileRule(draft([c]), kinds).condition['schema'];
    expect(leaf(clause('name', 'contains', 'a.b'))).toEqual({ pattern: 'a\\.b' });
    expect(leaf(clause('name', 'startsWith', '(1)'))).toEqual({ pattern: '^\\(1\\)' });
    expect(leaf(clause('name', 'endsWith', '$5'))).toEqual({ pattern: '\\$5$' });
  });
});

describe('readRule (doc 256 rule 3)', () => {
  it('reads back every shape compileRule writes, round-tripping the draft', () => {
    const samples: Record<FieldKind, Clause['value'][]> = {
      text: ['Ann', 'a.b', '(x)', '^1$'],
      number: [18, 2.5],
      choice: ['north', ['north', 'coast']],
      multi: ['a'],
      boolean: [undefined],
    };
    const fieldOf: Record<FieldKind, string> = {
      text: 'name',
      number: 'age',
      choice: 'region',
      multi: 'topics',
      boolean: 'agree',
    };
    for (const kind of Object.keys(samples) as FieldKind[]) {
      for (const operator of OPERATORS_BY_KIND[kind]) {
        for (const value of samples[kind]) {
          const list = operator === 'in' || operator === 'notIn';
          if (list !== Array.isArray(value)) continue;
          const valueless = ['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse'].includes(operator);
          const c = clause(fieldOf[kind], operator, valueless ? undefined : value);
          const stored = compileRule(draft([c, clause('age', 'gt', 1)], 'any'), kinds);
          const read = readRule(JSON.parse(JSON.stringify(stored)), newId);
          expect(read.kind, `${kind} ${operator} ${JSON.stringify(value)}`).toBe('draft');
          if (read.kind !== 'draft') continue;
          expect(read.draft.match).toBe('any');
          expect({ ...read.draft.clauses[0], id: 'c' }, `${kind} ${operator}`).toEqual(c);
        }
      }
    }
  });

  it('reports a hand-written rule it cannot read as custom, and no rule as none', () => {
    expect(readRule(undefined, newId)).toEqual({ kind: 'none' });
    const custom = [
      { effect: 'SHOW', condition: { scope: '#/properties/a', expectedValue: 1 } },
      {
        effect: 'SHOW',
        condition: { scope: '#/properties/a', schema: { minimum: 1, maximum: 5 } },
      },
      {
        effect: 'SHOW',
        condition: { scope: '#/properties/a', schema: { pattern: 'a.b' }, failWhenUndefined: true },
      },
      {
        effect: 'SHOW',
        condition: {
          scope: '#/properties/a/properties/b',
          schema: { const: 1 },
          failWhenUndefined: true,
        },
      },
      {
        effect: 'FLASH',
        condition: { scope: '#/properties/a', schema: { const: 1 }, failWhenUndefined: true },
      },
      {
        effect: 'SHOW',
        condition: { type: 'AND', conditions: [{ type: 'OR', conditions: [] }, {}] },
      },
    ];
    for (const rule of custom)
      expect(readRule(rule, newId).kind, JSON.stringify(rule)).toBe('custom');
  });

  it('lists every scope a rule tests, custom rules included', () => {
    expect(
      ruleScopes({
        effect: 'SHOW',
        condition: {
          type: 'OR',
          conditions: [
            { scope: '#/properties/a' },
            { type: 'AND', conditions: [{ scope: '#/properties/b' }] },
          ],
        },
      }),
    ).toEqual(['a', 'b']);
  });
});
