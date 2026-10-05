import { describe, expect, it } from 'vitest';
import type { DocumentContent, Uischema } from '../src/studio/document-types';
import { ruleSources } from '../src/studio/rules/rule-sources';
import { control, edge, form, funnel } from './funnel-fixtures';

const PROPERTIES = {
  a: { type: 'string', title: 'A' },
  b: { type: 'number', title: 'B' },
  c: { type: 'boolean', title: 'C' },
  m: { type: 'array', title: 'M', items: { oneOf: [{ const: 'x', title: 'X' }] } },
  r: { type: 'object', required: ['root'], title: 'R' },
  up: { type: 'string', oneOf: [{ const: 'n', title: 'North' }], title: 'Up' },
};
const content = (root: Uischema): DocumentContent => ({
  schema: { type: 'object', properties: PROPERTIES },
  variants: { default: root },
});
const keys = (c: DocumentContent, id: string) => ruleSources(c, id).map((f) => f.key);

describe('ruleSources (doc 256 rule 4)', () => {
  const layout = { id: 'v', type: 'VerticalLayout', elements: [control('b'), control('c')] };
  const page = content(
    form('F', 'F', [
      control('a'),
      layout,
      control('m'),
      control('r'),
      { id: 'h', type: 'Heading' },
    ]),
  );

  it('offers the Controls before the element in its Form, in document order', () => {
    expect(keys(page, 'h')).toEqual(['a', 'b', 'c', 'm']);
    expect(keys(page, 'c-a')).toEqual([]);
    expect(keys(page, 'c-m')).toEqual(['a', 'b', 'c']);
  });

  it('excludes the element itself and anything inside it', () => {
    expect(keys(page, 'v')).toEqual(['a']);
    expect(keys(page, 'c-c')).toEqual(['a', 'b']);
  });

  it('adds every Control in Forms upstream in a Funnel', () => {
    const flow = content(
      funnel(
        [
          form('P1', 'P1', [control('up')]),
          form('P2', 'P2', [control('a'), { id: 'h2', type: 'Heading' }]),
          form('X', 'X', [control('b')]),
        ],
        [edge('e1', 'P1', 'P2')],
      ),
    );
    expect(keys(flow, 'h2')).toEqual(['up', 'a']);
    expect(ruleSources(flow, 'h2')[0]).toMatchObject({ kind: 'choice', label: 'Up' });
  });

  it('types multi-choice fields as multi and skips rich text', () => {
    const fields = ruleSources(page, 'h');
    expect(fields.find((f) => f.key === 'm')).toEqual({
      key: 'm',
      label: 'M',
      kind: 'multi',
      options: [{ value: 'x', label: 'X' }],
    });
    expect(fields.some((f) => f.key === 'r')).toBe(false);
  });
});
