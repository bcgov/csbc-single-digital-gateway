import { describe, expect, it } from 'vitest';
import { upstreamFields } from '../src/studio/upstream-fields';
import { condition, control, edge, form, funnel, row } from './funnel-fixtures';

const schema = {
  properties: {
    age: { type: 'integer', title: 'Age' },
    resident: { type: 'boolean' },
    region: { type: 'string', oneOf: [{ const: 'n', title: 'North' }, { const: 's' }] },
    size: { type: 'string', enum: ['S', 'M'] },
    name: { type: 'string', title: 'Name' },
    tags: { type: 'array' },
  },
};

describe('upstreamFields', () => {
  const variant = funnel(
    [
      form('a', 'A', [
        control('age'),
        { type: 'VerticalLayout', elements: [control('resident', 'Resident?')] },
      ]),
      form('b', 'B', [
        control('region'),
        control('size'),
        control('age', 'Again'),
        control('tags'),
        control('gone'),
      ]),
      form('after', 'After', [control('name')]),
    ],
    [edge('e1', 'a', 'b'), edge('e2', 'b', 'c1'), edge('e3', 'c1', 'after')],
    [condition('c1', [row('r1')])],
  );

  it('collects typed fields from every Form upstream, at any depth, first Control per key winning', () => {
    expect(upstreamFields(schema, variant, 'c1')).toEqual([
      { key: 'age', label: 'Age', kind: 'number' },
      { key: 'resident', label: 'Resident?', kind: 'boolean' },
      {
        key: 'region',
        label: 'region',
        kind: 'choice',
        options: [
          { value: 'n', label: 'North' },
          { value: 's', label: 's' },
        ],
      },
      {
        key: 'size',
        label: 'size',
        kind: 'choice',
        options: [
          { value: 'S', label: 'S' },
          { value: 'M', label: 'M' },
        ],
      },
    ]);
  });

  it('never offers fields from the node itself or downstream of it', () => {
    expect(upstreamFields(schema, variant, 'c1').map((f) => f.key)).not.toContain('name');
    expect(upstreamFields(schema, variant, 'a')).toEqual([]);
  });
});
