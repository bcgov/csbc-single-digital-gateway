import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { choiceOptions, isChoiceControl } from '../src/renderers/ui/choice-control';

// Doc 188 rules 1-3 — what counts as a oneOf (const/title) choice schema, and the options it yields.

// Hand-authored JSON nothing validates — deliberately wrong shapes are cast once.
const odd = (schema: unknown) => schema as JsonSchema;

describe('choiceOptions (rules 1-2)', () => {
  it('maps a string oneOf to value/label options, labelled by title', () => {
    const schema: JsonSchema = {
      type: 'string',
      oneOf: [
        { const: 'bc', title: 'British Columbia' },
        { const: 'ab', title: 'Alberta' },
      ],
    };
    expect(choiceOptions(schema)).toEqual([
      { value: 'bc', label: 'British Columbia' },
      { value: 'ab', label: 'Alberta' },
    ]);
  });

  it('maps a number oneOf, keeping the consts as numbers', () => {
    const schema: JsonSchema = {
      type: 'number',
      oneOf: [
        { const: 1, title: 'One' },
        { const: 2.5, title: 'Two and a half' },
      ],
    };
    expect(choiceOptions(schema)).toEqual([
      { value: 1, label: 'One' },
      { value: 2.5, label: 'Two and a half' },
    ]);
  });

  it('labels an option by its const when the title is missing, empty or not a string', () => {
    const schema = odd({
      type: 'string',
      oneOf: [{ const: 'a' }, { const: 'b', title: '' }, { const: 'c', title: 7 }],
    });
    expect(choiceOptions(schema)).toEqual([
      { value: 'a', label: 'a' },
      { value: 'b', label: 'b' },
      { value: 'c', label: 'c' },
    ]);
    expect(choiceOptions({ type: 'number', oneOf: [{ const: 0 }] })).toEqual([
      { value: 0, label: '0' },
    ]);
  });

  it('drops a repeated const, keeping the first', () => {
    const schema: JsonSchema = {
      type: 'string',
      oneOf: [{ const: 'a', title: 'First' }, { const: 'a', title: 'Second' }, { const: 'b' }],
    };
    expect(choiceOptions(schema)).toEqual([
      { value: 'a', label: 'First' },
      { value: 'b', label: 'b' },
    ]);
  });

  it.each([
    ['no type', { oneOf: [{ const: 'a' }] }],
    ['an integer type', { type: 'integer', oneOf: [{ const: 1 }] }],
    ['a boolean type', { type: 'boolean', oneOf: [{ const: true }] }],
    ['a type array', { type: ['string', 'null'], oneOf: [{ const: 'a' }] }],
    ['no oneOf', { type: 'string' }],
    ['an empty oneOf', { type: 'string', oneOf: [] }],
    ['a non-array oneOf', { type: 'string', oneOf: { const: 'a' } }],
    ['a non-object entry', { type: 'string', oneOf: [{ const: 'a' }, 'b'] }],
    ['a null entry', { type: 'string', oneOf: [null] }],
    ['an entry without const', { type: 'string', oneOf: [{ const: 'a' }, { title: 'B' }] }],
    [
      'a number const in a string schema',
      { type: 'string', oneOf: [{ const: 'a' }, { const: 1 }] },
    ],
    [
      'a string const in a number schema',
      { type: 'number', oneOf: [{ const: 1 }, { const: '2' }] },
    ],
    ['a non-finite const', { type: 'number', oneOf: [{ const: Number.POSITIVE_INFINITY }] }],
  ])('is undefined for %s', (_name, schema) => {
    expect(choiceOptions(odd(schema))).toBeUndefined();
  });
});

const control = (key: string) =>
  ({ type: 'Control', scope: `#/properties/${key}` }) as UISchemaElement;

describe('isChoiceControl (rule 3)', () => {
  const rootSchema: JsonSchema = {
    type: 'object',
    properties: {
      plan: { type: 'string', oneOf: [{ const: 'basic' }] },
      seats: { type: 'number', oneOf: [{ const: 1 }] },
      text: { type: 'string' },
      none: { type: 'string', oneOf: [] },
    },
  };
  const context = { rootSchema, config: {} };

  it('matches a Control bound to a string or number choice schema', () => {
    expect(isChoiceControl(control('plan'), rootSchema, context)).toBe(true);
    expect(isChoiceControl(control('seats'), rootSchema, context)).toBe(true);
  });

  it('does not match a plain string, an empty oneOf or a non-Control element', () => {
    expect(isChoiceControl(control('text'), rootSchema, context)).toBe(false);
    expect(isChoiceControl(control('none'), rootSchema, context)).toBe(false);
    expect(isChoiceControl({ type: 'Heading' } as UISchemaElement, rootSchema, context)).toBe(
      false,
    );
  });
});
