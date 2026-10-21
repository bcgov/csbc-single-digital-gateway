import { describe, expect, it } from 'vitest';
import {
  answersOf,
  pruneAnswers,
  remapChoiceAnswers,
  renameAnswer,
  renameItemAnswer,
  withAnswers,
} from '../src/studio/answers/answer-edits';
import { applyColumnEdit } from '../src/studio/column-edits';
import {
  contentChanged,
  documentContentOf,
  type DocumentContent,
} from '../src/studio/document-types';
import { removeElement } from '../src/studio/element-remove';
import { renamePropertyKey } from '../src/studio/inspector/property-rename';
import { saveOptions } from '../src/studio/options/save-options';

// Doc 281 rules 1-3, 16-19: answers live in `content.data` and follow the form.

const content = (data?: Record<string, unknown>): DocumentContent => ({
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Name' },
      colour: {
        type: 'string',
        title: 'Colour',
        oneOf: [
          { const: 'red', title: 'Red' },
          { const: 'blue', title: 'Blue' },
        ],
      },
      tags: {
        type: 'array',
        title: 'Tags',
        items: {
          type: 'string',
          oneOf: [
            { const: 'a', title: 'A' },
            { const: 'b', title: 'B' },
          ],
        },
      },
      rows: {
        type: 'array',
        title: 'Rows',
        items: {
          type: 'object',
          properties: { first: { type: 'string' }, last: { type: 'string' } },
        },
      },
    },
  },
  variants: {
    default: {
      id: 'F',
      type: 'Form',
      elements: [
        { id: 'n', type: 'Control', scope: '#/properties/name' },
        { id: 'c', type: 'Control', scope: '#/properties/colour' },
        { id: 't', type: 'Control', scope: '#/properties/tags' },
        { id: 'r', type: 'Control', scope: '#/properties/rows' },
      ],
    },
  },
  ...(data === undefined ? {} : { data }),
});

describe('answers in the content (doc 281 rules 1-3)', () => {
  it('keeps a plain-object data through documentContentOf, dropping anything else', () => {
    expect(documentContentOf(content({ name: 'Ada' }))?.data).toEqual({ name: 'Ada' });
    expect(documentContentOf({ ...content(), data: ['x'] })).not.toHaveProperty('data');
    expect(documentContentOf({ ...content(), data: 'x' })).not.toHaveProperty('data');
  });

  it('counts an answer change as a change, and {} as no answers', () => {
    expect(contentChanged(content({ name: 'Ada' }), content({ name: 'Bea' }))).toBe(true);
    expect(contentChanged(content({}), content())).toBe(false);
    expect(contentChanged(content({ name: 'Ada' }), content({ name: 'Ada' }))).toBe(false);
  });

  it('reads absent answers as {}', () => {
    expect(answersOf(content())).toEqual({});
    expect(answersOf(content({ name: 'Ada' }))).toEqual({ name: 'Ada' });
  });

  it('writes answers, returning the SAME content when they are equal and removing an empty object', () => {
    const c = content({ name: 'Ada', colour: 'red' });
    expect(withAnswers(c, { colour: 'red', name: 'Ada' })).toBe(c);
    expect(withAnswers(c, { name: 'Bea' }).data).toEqual({ name: 'Bea' });
    expect(withAnswers(c, {})).not.toHaveProperty('data');
    const bare = content();
    expect(withAnswers(bare, {})).toBe(bare);
  });
});

describe('answers follow the form (doc 281 rules 16-19)', () => {
  it('moves a renamed key, and a renamed item key in every row', () => {
    expect(renameAnswer(content({ name: 'Ada' }), 'name', 'given').data).toEqual({ given: 'Ada' });
    const rows = content({ rows: [{ first: 'A', last: 'B' }, { last: 'C' }] });
    expect(renameItemAnswer(rows, 'rows', 'first', 'given').data).toEqual({
      rows: [{ given: 'A', last: 'B' }, { last: 'C' }],
    });
    const none = content();
    expect(renameAnswer(none, 'name', 'given')).toBe(none);
  });

  it('prunes answers whose property left the schema, and row keys that left the items', () => {
    const c = content({ name: 'Ada', gone: 1, rows: [{ first: 'A', stale: 'x' }] });
    expect(pruneAnswers(c).data).toEqual({ name: 'Ada', rows: [{ first: 'A' }] });
    const clean = content({ name: 'Ada' });
    expect(pruneAnswers(clean)).toBe(clean);
  });

  it('remaps choice answers through renames and clears values no longer offered', () => {
    const c = content({ colour: 'red', tags: ['a', 'b'] });
    const single = remapChoiceAnswers(c, { key: 'colour' }, new Map([['red', 'crimson']]), [
      'crimson',
      'blue',
    ]);
    expect(single.data).toEqual({ colour: 'crimson', tags: ['a', 'b'] });
    const dropped = remapChoiceAnswers(c, { key: 'tags' }, new Map(), ['a']);
    expect(dropped.data).toEqual({ colour: 'red', tags: ['a'] });
    // None left: absent, never [] or ''.
    const emptied = remapChoiceAnswers(c, { key: 'tags' }, new Map(), []);
    expect(emptied.data).toEqual({ colour: 'red' });
    const cleared = remapChoiceAnswers(c, { key: 'colour' }, new Map(), ['blue']);
    expect(cleared.data).toEqual({ tags: ['a', 'b'] });
  });

  it('renamePropertyKey moves the answer with the property', () => {
    const next = renamePropertyKey(content({ name: 'Ada' }), 'name', 'given');
    expect(next.data).toEqual({ given: 'Ada' });
  });

  it('renamePropertyKey on a record item key moves it in every row', () => {
    const next = renamePropertyKey(content({ rows: [{ first: 'A' }] }), 'first', 'given', 'rows');
    expect(next.data).toEqual({ rows: [{ given: 'A' }] });
  });

  it('removeElement drops the answer of the property it deletes', () => {
    const next = removeElement(content({ name: 'Ada', colour: 'red' }), 'n');
    expect(next.data).toEqual({ colour: 'red' });
  });

  it('saveOptions remaps the answers of a renamed option and clears a removed one', () => {
    const c = content({ colour: 'red' });
    const renamed = saveOptions(
      c,
      { propertyKey: 'colour', multiple: false } as never,
      [
        { const: 'crimson', title: 'Red' },
        { const: 'blue', title: 'Blue' },
      ],
      new Map([['red', 'crimson']]),
    );
    expect(renamed.data).toEqual({ colour: 'crimson' });
    const removed = saveOptions(
      c,
      { propertyKey: 'colour', multiple: false } as never,
      [{ const: 'blue', title: 'Blue' }],
      new Map(),
    );
    expect(removed).not.toHaveProperty('data');
  });

  it('a column re-key moves the key in every row; removing a column drops it', () => {
    const c = content({ rows: [{ first: 'A', last: 'B' }] });
    expect(applyColumnEdit(c, 'rows', { kind: 'rekey', key: 'first', to: 'given' }).data).toEqual({
      rows: [{ given: 'A', last: 'B' }],
    });
    expect(applyColumnEdit(c, 'rows', { kind: 'remove', key: 'last' }).data).toEqual({
      rows: [{ first: 'A' }],
    });
  });

  it('keeps answers untouched by an edit that does not concern them', () => {
    const c = content({ name: 'Ada', rows: [{ first: 'A' }] });
    expect(renamePropertyKey(c, 'colour', 'hue').data).toBe(c.data);
  });
});
