import { describe, expect, it } from 'vitest';
import { choiceOptions, isSingleChoice } from '../src/renderers/ui/choice-options';

describe('choice options (doc 244 rules 3-5)', () => {
  it('reads each entry: const as value, title as label, a non-empty description', () => {
    expect(
      choiceOptions({
        type: 'string',
        oneOf: [
          { const: 'north', title: 'North', description: 'Up top' },
          { const: 'coast', title: 'Coast' },
        ],
      }),
    ).toEqual([
      { value: 'north', label: 'North', description: 'Up top' },
      { value: 'coast', label: 'Coast' },
    ]);
  });

  it('falls back to the const for a missing or empty title, and drops an empty description', () => {
    const options = choiceOptions({
      type: 'string',
      oneOf: [{ const: 'a' }, { const: 'b', title: '', description: '' }, { const: 'c', title: 3 }],
    });
    expect(options?.map((o) => o.label)).toEqual(['a', 'b', 'c']);
    expect(options?.[1]).not.toHaveProperty('description');
  });

  it('keeps the first entry of a repeated const', () => {
    expect(
      choiceOptions({
        type: 'string',
        oneOf: [
          { const: 'a', title: 'First' },
          { const: 'a', title: 'Second' },
        ],
      }),
    ).toEqual([{ value: 'a', label: 'First' }]);
  });

  it('is no choice for an empty oneOf, a bad entry, a non-string const or a non-string type', () => {
    const bad = [
      { type: 'string', oneOf: [] },
      { type: 'string', oneOf: 'a' },
      { type: 'string', oneOf: [{ const: 'a' }, 'b'] },
      { type: 'string', oneOf: [{ const: 1 }] },
      { type: 'string', oneOf: [{ title: 'No const' }] },
      { type: 'number', oneOf: [{ const: 'a' }] },
      { type: 'string' },
      null,
      'string',
    ];
    for (const schema of bad) {
      expect(choiceOptions(schema)).toBeUndefined();
      expect(isSingleChoice(schema)).toBe(false);
    }
    expect(isSingleChoice({ type: 'string', oneOf: [{ const: 'a' }] })).toBe(true);
  });
});
