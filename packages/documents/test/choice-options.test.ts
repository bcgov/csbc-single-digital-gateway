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
      { type: 'array', items: { type: 'string', oneOf: [{ const: 1 }] } },
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

const withItems = (items: Record<string, unknown>) => multiChoiceOptions({ type: 'array', items });
const withOneOf = (oneOf: unknown[]) => multiChoiceOptions({ type: 'array', items: { oneOf } });

describe('numeric choices (doc 246)', () => {
  const entries = [
    { const: 1, title: 'One' },
    { const: 2.5, title: 'Two and a half' },
  ];

  it('reads number consts, and integer consts only when whole', () => {
    expect(choiceOptions({ type: 'number', oneOf: entries })).toEqual([
      { value: 1, label: 'One' },
      { value: 2.5, label: 'Two and a half' },
    ]);
    expect(choiceOptions({ type: 'integer', oneOf: entries })).toBeUndefined();
    expect(choiceOptions({ type: 'integer', oneOf: [{ const: 1 }, { const: 3 }] })).toEqual([
      { value: 1, label: '1' },
      { value: 3, label: '3' },
    ]);
  });

  it('refuses mixed lists, non-finite numbers and type unions (rules 1-2)', () => {
    expect(
      choiceOptions({ type: 'number', oneOf: [{ const: 1 }, { const: 'a' }] }),
    ).toBeUndefined();
    expect(
      choiceOptions({ type: 'string', oneOf: [{ const: 'a' }, { const: 1 }] }),
    ).toBeUndefined();
    expect(choiceOptions({ type: 'number', oneOf: [{ const: Infinity }] })).toBeUndefined();
    expect(choiceOptions({ type: 'number', oneOf: [{ const: Number.NaN }] })).toBeUndefined();
    expect(choiceOptions({ type: ['number', 'null'], oneOf: [{ const: 1 }] })).toBeUndefined();
  });

  it('uses a declared items.type as-is, refusing a contradicted one (rule 3)', () => {
    expect(
      withItems({ type: 'integer', oneOf: [{ const: 1 }, { const: 2 }] })?.map((o) => o.value),
    ).toEqual([1, 2]);
    expect(withItems({ type: 'integer', oneOf: [{ const: 1.5 }] })).toBeUndefined();
    expect(withItems({ type: 'string', oneOf: [{ const: 1 }] })).toBeUndefined();
    expect(withItems({ type: 'number', oneOf: [{ const: 'a' }] })).toBeUndefined();
    expect(withItems({ type: 'boolean', oneOf: [{ const: true }] })).toBeUndefined();
  });

  it('infers string or number from the first const when items.type is absent (rule 3)', () => {
    expect(withOneOf([{ const: 1 }, { const: 2.5 }])?.map((o) => o.value)).toEqual([1, 2.5]);
    expect(withOneOf([{ const: 'a' }])?.map((o) => o.value)).toEqual(['a']);
    expect(withOneOf([{ const: 1 }, { const: 'a' }])).toBeUndefined();
    expect(withOneOf([{ const: true }])).toBeUndefined();
  });

  it('matches by ===, never coercing "1" to 1 (rules 4-5)', () => {
    const options = choiceOptions({ type: 'number', oneOf: [{ const: 1 }] })!;
    expect(chosenOptions(options, ['1'])).toEqual([]);
    expect(chosenOptions(options, [1]).map((o) => o.value)).toEqual([1]);
    expect(storedChoices(options, [1])).toEqual([1]);
    expect(storedChoices(options, ['1'] as never)).toBeUndefined();
  });
});
