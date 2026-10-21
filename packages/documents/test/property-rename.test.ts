import { describe, expect, it } from 'vitest';
import type { DocumentContent, Uischema } from '../src/studio/document-types';
import { keyProblem, renamePropertyKey } from '../src/studio/inspector/property-rename';
import { conditionsOf } from '../src/studio/funnel-model';
import { condition, control, edge, form, funnel, row } from './funnel-fixtures';

const leaf = (key: string) => ({ scope: `#/properties/${key}`, schema: { const: true } });

/** A Funnel over three properties: `age` is bound twice, tested by a rule, a custom rule and a Condition. */
function content(): DocumentContent {
  const details = form('F2', 'Details', [
    { ...control('name'), rule: { effect: 'SHOW', condition: leaf('age') } },
    {
      id: 'v',
      type: 'VerticalLayout',
      elements: [{ ...control('age'), id: 'c-age-2' }],
      rule: {
        effect: 'HIDE',
        condition: {
          type: 'OR',
          conditions: [leaf('name'), { type: 'AND', conditions: [leaf('age')] }],
        },
      },
    },
  ]);
  const clauses = [
    { id: 'k1', field: 'age', operator: 'equals' as const, value: 18 },
    { id: 'k2', field: 'name', operator: 'equals' as const, value: 'age' },
  ];
  return {
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number', title: 'Age' },
        other: { type: 'string' },
      },
      required: ['name', 'age'],
    },
    variants: {
      default: funnel(
        [form('F1', 'Eligibility', [control('age')]), details],
        [edge('e1', 'F1', 'C'), edge('e2', 'C', 'F2', 'r1')],
        [condition('C', [row('r1', 'Adult', clauses)])],
      ),
      print: form('P', 'Print', [
        { ...control('age'), id: 'p-age' },
        { ...control('age'), id: 'p-deep', scope: '#/properties/age/x' },
      ]),
    },
  };
}

const scopes = (node: unknown): string[] => {
  if (typeof node !== 'object' || node === null) return [];
  const record = node as Record<string, unknown>;
  const own = typeof record['scope'] === 'string' ? [record['scope']] : [];
  return [...own, ...Object.values(record).flatMap(scopes)];
};

describe('renamePropertyKey (doc 257 rules 13-17)', () => {
  it('renames the property in place, keeping property order and its schema (rule 13a)', () => {
    const next = renamePropertyKey(content(), 'age', 'years');
    expect(Object.keys(next.schema['properties'] as object)).toEqual(['name', 'years', 'other']);
    expect((next.schema['properties'] as Record<string, unknown>)['years']).toEqual({
      type: 'number',
      title: 'Age',
    });
    expect(next.schema['properties']).not.toHaveProperty('age');
  });

  it('replaces the required entry in place (rule 13b)', () => {
    const next = renamePropertyKey(content(), 'age', 'years');
    expect(next.schema['required']).toEqual(['name', 'years']);
  });

  it('rewrites every Control scope, deeper scopes included, in every variant (rule 13c)', () => {
    const next = renamePropertyKey(content(), 'age', 'years');
    const all = Object.values(next.variants).flatMap(scopes);
    expect(all.some((s) => s === '#/properties/age' || s.startsWith('#/properties/age/'))).toBe(
      false,
    );
    expect(all).toContain('#/properties/years/x');
    expect(scopes(next.variants['print'])).toEqual(['#/properties/years', '#/properties/years/x']);
  });

  it('rewrites rule condition scopes on any element, nested conditions included, shape untouched (rule 13d)', () => {
    const next = renamePropertyKey(content(), 'age', 'years');
    const details = (next.variants['default']!['elements'] as Uischema[])[1]!;
    const [name, layout] = details['elements'] as Uischema[];
    expect(name!['rule']).toEqual({ effect: 'SHOW', condition: leaf('years') });
    expect(layout!['rule']).toEqual({
      effect: 'HIDE',
      condition: {
        type: 'OR',
        conditions: [leaf('name'), { type: 'AND', conditions: [leaf('years')] }],
      },
    });
  });

  it('rewrites Funnel Condition clause fields, never their values (rule 13e)', () => {
    const next = renamePropertyKey(content(), 'age', 'years');
    const [only] = conditionsOf(next.variants['default']!);
    expect(only!.options.rows[0]!.clauses).toEqual([
      { id: 'k1', field: 'years', operator: 'equals', value: 18 },
      { id: 'k2', field: 'name', operator: 'equals', value: 'age' },
    ]);
  });

  it('keeps the identity of everything that did not reference the key (rule 15)', () => {
    const before = content();
    const next = renamePropertyKey(before, 'other', 'misc');
    expect(next).not.toBe(before);
    expect(next.variants['default']).toBe(before.variants['default']);
    expect(next.variants['print']).toBe(before.variants['print']);
    expect(next.schema['required']).toBe(before.schema['required']);
  });

  it('returns the same content for an unchanged, unknown or invalid key (rule 15)', () => {
    const before = content();
    expect(renamePropertyKey(before, 'age', 'age')).toBe(before);
    expect(renamePropertyKey(before, 'missing', 'x')).toBe(before);
    expect(renamePropertyKey(before, 'age', 'name')).toBe(before);
    expect(renamePropertyKey(before, 'age', 'a/b')).toBe(before);
    expect(renamePropertyKey(before, 'age', '__proto__')).toBe(before);
  });
});

describe('keyProblem (doc 257 rule 10)', () => {
  it('accepts the nanoid alphabet and the unchanged key', () => {
    expect(keyProblem(content(), 'age', 'Years_2-x')).toBeUndefined();
    expect(keyProblem(content(), 'age', 'V1StGXR8')).toBeUndefined();
    expect(keyProblem(content(), 'age', 'age')).toBeUndefined();
  });

  it('refuses an empty key, a bad character, a used key and __proto__', () => {
    expect(keyProblem(content(), 'age', '')).toBe('A key is required.');
    expect(keyProblem(content(), 'age', 'first name')).toBe('Use letters, numbers, _ or -.');
    expect(keyProblem(content(), 'age', 'a/b')).toBe('Use letters, numbers, _ or -.');
    expect(keyProblem(content(), 'age', 'name')).toBe('name is already used.');
    expect(keyProblem(content(), 'age', '__proto__')).toBe('__proto__ is reserved.');
  });
});
