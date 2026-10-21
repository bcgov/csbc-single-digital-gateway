import { describe, expect, it } from 'vitest';
import type { DocumentContent, Uischema } from '../src/studio/document-types';
import { ruleProblems } from '../src/studio/rules/rule-problems';
import { control, form } from './funnel-fixtures';

const on = (key: string) => ({
  effect: 'SHOW',
  condition: { scope: `#/properties/${key}`, schema: { const: 'x' }, failWhenUndefined: true },
});
const content = (elements: Uischema[]): DocumentContent => ({
  schema: { type: 'object', properties: { a: { type: 'string' }, b: { type: 'string' } } },
  variants: { default: form('F', 'F', elements) },
});

describe('ruleProblems (doc 256 rule 5)', () => {
  it('reports no problem when every tested field comes before, or there is no rule', () => {
    expect(
      ruleProblems(content([control('a'), { ...control('b'), rule: on('a') }]), 'c-b'),
    ).toEqual([]);
    expect(ruleProblems(content([control('a'), control('b')]), 'c-b')).toEqual([]);
  });

  it('reports a field below, inside, deleted or not upstream', () => {
    // Moved above its source: `a` now comes after `b`.
    expect(
      ruleProblems(content([{ ...control('b'), rule: on('a') }, control('a')]), 'c-b'),
    ).toEqual(['a']);
    // Its own field.
    expect(ruleProblems(content([{ ...control('a'), rule: on('a') }]), 'c-a')).toEqual(['a']);
    // A field inside the element.
    const layout = { id: 'v', type: 'VerticalLayout', rule: on('a'), elements: [control('a')] };
    expect(ruleProblems(content([layout]), 'v')).toEqual(['a']);
    // A deleted field.
    expect(ruleProblems(content([{ ...control('b'), rule: on('gone') }]), 'c-b')).toEqual(['gone']);
  });

  it('checks the scopes of a rule the editor cannot read the same way', () => {
    const custom = { effect: 'SHOW', condition: { scope: '#/properties/a', expectedValue: 'x' } };
    expect(ruleProblems(content([{ ...control('b'), rule: custom }, control('a')]), 'c-b')).toEqual(
      ['a'],
    );
  });
});
