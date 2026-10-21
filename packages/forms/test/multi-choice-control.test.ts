import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { choiceOptions } from '../src/renderers/ui/choice-control';
import { isMultiChoiceControl, multiChoiceOptions } from '../src/renderers/ui/multi-choice-control';

// Doc 205 rules 1-4 — the multi-choice classifier and its options mapping. Tested directly, not through
// <JsonForms>: JSONForms' Ajv throws "schema is invalid" for an invalid keyword before any renderer runs.

const schema = (value: object) => value as JsonSchema;
const control = { type: 'Control', scope: '#/properties/a' } as UISchemaElement;
const testerContext = { rootSchema: {} as JsonSchema, config: {} };

/** `{ type: 'array', items: { oneOf } }` with whatever extra `items` keys a case needs. */
const multi = (entries: unknown, items: object = {}) =>
  schema({ type: 'array', uniqueItems: true, items: { ...items, oneOf: entries } });

describe('multiChoiceOptions (rules 1-3)', () => {
  it('reads items.oneOf into options, labelled by title', () => {
    expect(
      multiChoiceOptions(
        multi([
          { const: 'foo', title: 'My Foo' },
          { const: 'bar', title: 'My Bar' },
        ]),
      ),
    ).toEqual([
      { value: 'foo', label: 'My Foo' },
      { value: 'bar', label: 'My Bar' },
    ]);
  });

  it('falls back to String(const) when a title is absent or not a non-empty string', () => {
    expect(multiChoiceOptions(multi([{ const: 'foo' }, { const: 'bar', title: '' }]))).toEqual([
      { value: 'foo', label: 'foo' },
      { value: 'bar', label: 'bar' },
    ]);
    expect(multiChoiceOptions(multi([{ const: 7, title: 42 }]))).toEqual([
      { value: 7, label: '7' },
    ]);
  });

  it('carries a description only when it is a non-empty string (rule 3)', () => {
    expect(
      multiChoiceOptions(
        multi([
          { const: 'foo', title: 'My Foo', description: 'Step-free entry' },
          { const: 'bar', title: 'My Bar', description: '' },
          { const: 'baz', title: 'My Baz', description: 7 },
        ]),
      ),
    ).toEqual([
      { value: 'foo', label: 'My Foo', description: 'Step-free entry' },
      // An ABSENT key, never `description: undefined` — `exactOptionalPropertyTypes`.
      { value: 'bar', label: 'My Bar' },
      { value: 'baz', label: 'My Baz' },
    ]);
  });

  it('keeps the first entry of a repeated const', () => {
    expect(
      multiChoiceOptions(
        multi([
          { const: 'foo', title: 'First' },
          { const: 'foo', title: 'Second' },
        ]),
      ),
    ).toEqual([{ value: 'foo', label: 'First' }]);
  });

  it('accepts string, number and whole-integer consts, refusing a mixed list', () => {
    expect(multiChoiceOptions(multi([{ const: 1 }, { const: 2.5 }]))).toEqual([
      { value: 1, label: '1' },
      { value: 2.5, label: '2.5' },
    ]);
    expect(multiChoiceOptions(multi([{ const: 1 }, { const: 'two' }]))).toBeUndefined();
  });

  it('accepts an absent items.type, and one that AGREES with the consts (rule 1)', () => {
    expect(multiChoiceOptions(multi([{ const: 'foo' }]))).toEqual([{ value: 'foo', label: 'foo' }]);
    // The old builder emits `items: { type: 'string', oneOf }` — it must keep working.
    expect(multiChoiceOptions(multi([{ const: 'foo' }], { type: 'string' }))).toEqual([
      { value: 'foo', label: 'foo' },
    ]);
    expect(multiChoiceOptions(multi([{ const: 2 }], { type: 'integer' }))).toEqual([
      { value: 2, label: '2' },
    ]);
  });

  it('refuses an items.type that CONTRADICTS the consts rather than guessing (rule 1)', () => {
    expect(multiChoiceOptions(multi([{ const: 1 }], { type: 'string' }))).toBeUndefined();
    expect(multiChoiceOptions(multi([{ const: 'foo' }], { type: 'number' }))).toBeUndefined();
    // An integer items.type over a fractional const offers a value its own schema rejects.
    expect(multiChoiceOptions(multi([{ const: 1.5 }], { type: 'integer' }))).toBeUndefined();
    expect(multiChoiceOptions(multi([{ const: 'foo' }], { type: 'object' }))).toBeUndefined();
  });

  it('refuses a non-array type, an empty oneOf, absent items and a bad entry', () => {
    expect(multiChoiceOptions(schema({ type: 'string', oneOf: [{ const: 'a' }] }))).toBeUndefined();
    expect(multiChoiceOptions(multi([]))).toBeUndefined();
    expect(multiChoiceOptions(multi('nope'))).toBeUndefined();
    expect(multiChoiceOptions(schema({ type: 'array' }))).toBeUndefined();
    expect(multiChoiceOptions(schema({ type: 'array', items: [] }))).toBeUndefined();
    expect(multiChoiceOptions(multi([{ const: 'a' }, 'b']))).toBeUndefined();
    expect(multiChoiceOptions(multi([{ title: 'No const' }]))).toBeUndefined();
    expect(multiChoiceOptions(undefined)).toBeUndefined();
  });

  it('does not require uniqueItems — neither control can produce a duplicate', () => {
    expect(
      multiChoiceOptions(schema({ type: 'array', items: { oneOf: [{ const: 'a' }] } })),
    ).toEqual([{ value: 'a', label: 'a' }]);
  });
});

describe('choiceOptions stays array-blind (rule 4)', () => {
  it('returns undefined for a multi-choice schema', () => {
    // Widening it would make the rank-3 Combobox claim an array schema and write a SCALAR into it.
    expect(choiceOptions(multi([{ const: 'foo', title: 'My Foo' }]))).toBeUndefined();
  });

  it('still reads a single-choice schema, now carrying descriptions too (rule 3)', () => {
    expect(
      choiceOptions(
        schema({
          type: 'string',
          oneOf: [{ const: 'foo', title: 'My Foo', description: 'Help' }],
        }),
      ),
    ).toEqual([{ value: 'foo', label: 'My Foo', description: 'Help' }]);
  });
});

describe('isMultiChoiceControl (rule 4)', () => {
  it('matches a Control over a multi-choice schema', () => {
    expect(isMultiChoiceControl(control, multi([{ const: 'foo' }]), testerContext)).toBe(true);
  });

  it('does not match a single-choice, string, number, boolean or non-Control', () => {
    for (const property of [
      { type: 'string', oneOf: [{ const: 'a' }] },
      { type: 'string' },
      { type: 'number' },
      { type: 'boolean' },
      { type: 'array' },
    ]) {
      expect(isMultiChoiceControl(control, schema(property), testerContext), property.type).toBe(
        false,
      );
    }
    expect(
      isMultiChoiceControl(
        { type: 'Heading' } as UISchemaElement,
        multi([{ const: 'a' }]),
        testerContext,
      ),
    ).toBe(false);
  });
});
