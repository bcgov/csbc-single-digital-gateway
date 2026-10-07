import { describe, expect, it } from 'vitest';
import { isAnswered, pruneUnanswered } from '../src/renderers/plain/prune-unanswered';
import { richText } from './rich-text-fixtures';

// Doc 283 rules 2-12: what `unanswered: 'hide'` leaves of a Form.

const SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name' },
    age: { type: 'integer', title: 'Age' },
    ok: { type: 'boolean', title: 'OK' },
    bio: { type: 'object', title: 'Bio', required: ['root'] },
    rows: {
      type: 'array',
      title: 'Rows',
      items: { type: 'object', properties: { a: { type: 'string', title: 'A' } } },
    },
  },
};
const c = (key: string, extra: Record<string, unknown> = {}) => ({
  id: key,
  type: 'Control',
  scope: `#/properties/${key}`,
  ...extra,
});
const heading = (id: string) => ({ id, type: 'Heading', options: { text: id } });
const layout = (
  id: string,
  type: string,
  elements: unknown[],
  extra: Record<string, unknown> = {},
) => ({
  id,
  type,
  elements,
  ...extra,
});
const ids = (node: unknown): string[] => {
  const n = node as { id?: string; elements?: unknown[] } | undefined;
  return n === undefined ? [] : [n.id ?? '?', ...(n.elements ?? []).flatMap(ids)];
};

describe('isAnswered (doc 283 rule 2)', () => {
  it('answers a scalar by its plain value, an object array by its rows', () => {
    expect(isAnswered(c('name'), SCHEMA, { name: 'Ada' })).toBe(true);
    expect(isAnswered(c('name'), SCHEMA, { name: '' })).toBe(false);
    expect(isAnswered(c('ok'), SCHEMA, { ok: false })).toBe(true);
    expect(isAnswered(c('ok'), SCHEMA, {})).toBe(false);
    expect(isAnswered(c('bio'), SCHEMA, { bio: richText('  ') })).toBe(false);
    expect(isAnswered(c('rows'), SCHEMA, { rows: [{ a: 'x' }] })).toBe(true);
    expect(isAnswered(c('rows'), SCHEMA, { rows: [] })).toBe(false);
    // A scope that names no property is never answered.
    expect(isAnswered(c('gone'), SCHEMA, { gone: 'x' })).toBe(false);
  });
});

describe('pruneUnanswered (doc 283 rules 3-12)', () => {
  it('removes unanswered Controls, and containers left without an answer', () => {
    const form = layout('F', 'Form', [
      c('name'),
      c('age'),
      layout('V', 'VerticalLayout', [c('ok')]),
      layout('H', 'HorizontalLayout', [c('bio')]),
    ]);
    expect(ids(pruneUnanswered(form, SCHEMA, { name: 'Ada', ok: true }))).toEqual([
      'F',
      'name',
      'V',
      'ok',
    ]);
  });

  it('keeps display elements beside an answer, and drops them with an empty container', () => {
    const form = layout('F', 'Form', [
      layout('S1', 'Section', [heading('h1'), c('name')]),
      layout('S2', 'Section', [heading('h2'), { id: 'sep', type: 'Separator' }, c('age')]),
    ]);
    expect(ids(pruneUnanswered(form, SCHEMA, { name: 'Ada' }))).toEqual(['F', 'S1', 'h1', 'name']);
  });

  it('returns undefined when nothing in it is answered', () => {
    const form = layout('F', 'Form', [heading('h'), c('name')]);
    expect(pruneUnanswered(form, SCHEMA, {})).toBeUndefined();
  });

  it('keeps both Card slots while either holds an answer, and drops the Card when neither does', () => {
    const card = (id: string) =>
      layout(id, 'Card', [
        layout(`${id}-content`, 'VerticalLayout', [c('name')]),
        layout(`${id}-footer`, 'VerticalLayout', [c('age')]),
      ]);
    const form = layout('F', 'Form', [card('K1')]);
    // Only the footer answered: the content slot stays (empty) so the footer is still the second slot.
    expect(ids(pruneUnanswered(form, SCHEMA, { age: 3 }))).toEqual([
      'F',
      'K1',
      'K1-content',
      'K1-footer',
      'age',
    ]);
    expect(
      pruneUnanswered(layout('F', 'Form', [card('K2'), c('ok')]), SCHEMA, { ok: true }),
    ).toEqual(layout('F', 'Form', [c('ok')]));
  });

  it('removes an unanswered tab, and the Tabs when none is left', () => {
    const tabs = layout('T', 'Tabs', [
      layout('t1', 'VerticalLayout', [c('name')], { label: 'One' }),
      layout('t2', 'VerticalLayout', [c('age')], { label: 'Two' }),
    ]);
    expect(ids(pruneUnanswered(layout('F', 'Form', [tabs]), SCHEMA, { age: 1 }))).toEqual([
      'F',
      'T',
      't2',
      'age',
    ]);
    expect(
      ids(pruneUnanswered(layout('F', 'Form', [tabs, c('ok')]), SCHEMA, { ok: true })),
    ).toEqual(['F', 'ok']);
  });

  it("keeps a Grid child's placement, and a record's item form whole", () => {
    const record = c('rows', {
      options: { component: 'record' },
      elements: [
        layout('L', 'VerticalLayout', [
          { id: 'ia', type: 'Control', scope: '#/properties/rows/items/properties/a' },
        ]),
      ],
    });
    const grid = layout('G', 'Grid', [
      c('name', { options: { gridItem: { x: 1, y: 2 } } }),
      c('age', { options: { gridItem: { x: 0, y: 0 } } }),
    ]);
    const pruned = pruneUnanswered(layout('F', 'Form', [grid, record]), SCHEMA, {
      name: 'Ada',
      rows: [{}],
    }) as { elements: { elements: unknown[] }[] };
    expect(pruned.elements[0]!.elements).toEqual([
      c('name', { options: { gridItem: { x: 1, y: 2 } } }),
    ]);
    expect(pruned.elements[1]).toBe(record);
  });

  it('returns the SAME element when everything is answered', () => {
    const form = layout('F', 'Form', [c('name'), layout('V', 'VerticalLayout', [c('age')])]);
    expect(pruneUnanswered(form, SCHEMA, { name: 'Ada', age: 1 })).toBe(form);
  });
});
