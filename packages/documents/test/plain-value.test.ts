import { describe, expect, it } from 'vitest';
import { plainValue } from '../src/renderers/plain/plain-value';
import { richText } from './rich-text-fixtures';

// Doc 282 rule 7: what a plain field shows — the same words the field showed, never the stored const.

const control = (options: Record<string, unknown> = {}) => ({
  type: 'Control',
  scope: '#/properties/x',
  options,
});
const text = (value: unknown) => plainValue({ type: 'string' }, control(), value);

describe('plainValue (doc 282 rule 7)', () => {
  it('shows a string, and treats an empty one as unanswered', () => {
    expect(text('Ada')).toEqual({ kind: 'text', text: 'Ada' });
    expect(text('')).toBeUndefined();
    expect(text(undefined)).toBeUndefined();
    expect(text(null)).toBeUndefined();
  });

  it('formats a number as the field did — an integer without fraction digits', () => {
    expect(plainValue({ type: 'number' }, control(), 1234.5)).toEqual({
      kind: 'text',
      text: new Intl.NumberFormat().format(1234.5),
    });
    expect(plainValue({ type: 'integer' }, control(), 42)).toEqual({ kind: 'text', text: '42' });
    expect(plainValue({ type: 'number' }, control(), undefined)).toBeUndefined();
  });

  it('reads a boolean as Yes / No, and absent as unanswered (never No)', () => {
    expect(plainValue({ type: 'boolean' }, control(), true)).toEqual({ kind: 'text', text: 'Yes' });
    expect(plainValue({ type: 'boolean' }, control(), false)).toEqual({ kind: 'text', text: 'No' });
    expect(plainValue({ type: 'boolean' }, control(), undefined)).toBeUndefined();
  });

  it('shows a single choice by its title, and a const the schema no longer lists raw', () => {
    const schema = {
      type: 'string',
      oneOf: [
        { const: 'n', title: 'North' },
        { const: 'i', title: 'Interior' },
      ],
    };
    expect(plainValue(schema, control(), 'i')).toEqual({ kind: 'text', text: 'Interior' });
    expect(plainValue(schema, control(), 'gone')).toEqual({ kind: 'text', text: 'gone' });
    expect(plainValue(schema, control(), undefined)).toBeUndefined();
  });

  it('lists a multiple choice in authoring order, then unknown values raw', () => {
    const schema = {
      type: 'array',
      items: {
        type: 'string',
        oneOf: [
          { const: 'a', title: 'Apple' },
          { const: 'b', title: 'Banana' },
          { const: 'c', title: 'Cherry' },
        ],
      },
    };
    expect(plainValue(schema, control(), ['c', 'x', 'a'])).toEqual({
      kind: 'list',
      items: ['Apple', 'Cherry', 'x'],
    });
    expect(plainValue(schema, control(), [])).toBeUndefined();
  });

  it('shows rich text as its state, and a state with no text as unanswered', () => {
    const schema = { type: 'object', required: ['root'] };
    expect(plainValue(schema, control(), richText('Hello'))).toEqual({
      kind: 'rich',
      state: richText('Hello'),
    });
    expect(plainValue(schema, control(), richText('   '))).toBeUndefined();
  });

  it('never drops stored data of an unexpected type — it is shown raw', () => {
    expect(text(12)).toEqual({ kind: 'text', text: '12' });
    expect(text({ a: 1 })).toEqual({ kind: 'text', text: '{"a":1}' });
  });
});
