import { describe, expect, it } from 'vitest';
import {
  choiceOptions,
  chosenOptions,
  isMultiChoice,
  isSingleChoice,
  multiChoiceOptions,
  storedChoices,
} from '../src/renderers/ui/choice-options';

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

describe('multi-choice options (doc 245 rules 3-6)', () => {
  const schema = {
    type: 'array',
    uniqueItems: true,
    items: {
      oneOf: [
        { const: 'a', title: 'A', description: 'First' },
        { const: 'b', title: 'B' },
        { const: 'c' },
      ],
    },
  };

  it('reads items.oneOf with the single-choice entry rules', () => {
    expect(multiChoiceOptions(schema)).toEqual([
      { value: 'a', label: 'A', description: 'First' },
      { value: 'b', label: 'B' },
      { value: 'c', label: 'c' },
    ]);
    expect(
      multiChoiceOptions({ ...schema, items: { type: 'string', oneOf: [{ const: 'a' }] } }),
    ).toEqual([{ value: 'a', label: 'a' }]);
  });

  it('does not need uniqueItems', () => {
    const { uniqueItems: _u, ...loose } = schema;
    expect(isMultiChoice(loose)).toBe(true);
  });

  it('is no multiple choice for a non-array, missing or bad items, or a non-string items type', () => {
    const bad = [
      { type: 'string', oneOf: [{ const: 'a' }] },
      { type: 'array' },
      { type: 'array', items: [{ const: 'a' }] },
      { type: 'array', items: { oneOf: [] } },
      { type: 'array', items: { oneOf: [{ const: 1 }] } },
      { type: 'array', items: { type: 'number', oneOf: [{ const: 'a' }] } },
      null,
    ];
    for (const s of bad) {
      expect(multiChoiceOptions(s)).toBeUndefined();
      expect(isMultiChoice(s)).toBe(false);
    }
    // The two choice shapes are disjoint (rule 1).
    expect(isSingleChoice(schema)).toBe(false);
  });

  it('chooses the options in the data, in authoring order, ignoring unknown consts', () => {
    const options = multiChoiceOptions(schema)!;
    expect(chosenOptions(options, ['c', 'gold', 'a']).map((o) => o.value)).toEqual(['a', 'c']);
    expect(chosenOptions(options, 'a')).toEqual([]);
    expect(chosenOptions(options, undefined)).toEqual([]);
  });

  it('stores picks in authoring order, and undefined — never [] — for none', () => {
    const options = multiChoiceOptions(schema)!;
    expect(storedChoices(options, ['c', 'a'])).toEqual(['a', 'c']);
    expect(storedChoices(options, ['gold', 'b'])).toEqual(['b']);
    expect(storedChoices(options, [])).toBeUndefined();
  });
});
