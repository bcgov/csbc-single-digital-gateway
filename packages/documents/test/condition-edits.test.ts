import { describe, expect, it } from 'vitest';
import { updateCondition } from '../src/studio/condition-edits';
import {
  condition,
  edge,
  form,
  formIds,
  funnel,
  links,
  onlyCondition,
  row,
} from './funnel-fixtures';

const start = () =>
  funnel(
    [form('a'), form('x'), form('b')],
    [edge('e0', 'a', 'c1'), edge('e1', 'c1', 'x', 'r1'), edge('e2', 'c1', 'b')],
    [condition('c1', [row('r1', 'Condition 1')], 'Old')],
  );

describe('updateCondition', () => {
  it('writes the rows and a trimmed label', () => {
    const rows = [row('r1', 'Adults', [{ id: 'k1', field: 'age', operator: 'gte', value: 18 }])];
    const next = updateCondition(start(), 'c1', { label: '  Eligible?  ', rows });

    expect(onlyCondition(next)).toEqual(condition('c1', rows, 'Eligible?'));
    expect(links(next)).toEqual(links(start()));
  });

  it('drops the label key when the label is blank', () => {
    expect(
      'label' in onlyCondition(updateCondition(start(), 'c1', { label: ' ', rows: [row('r1')] })),
    ).toBe(false);
  });

  it('gives a new row a new Form and a branch edge to it', () => {
    const next = updateCondition(start(), 'c1', { label: '', rows: [row('r1'), row('r2')] });
    const added = formIds(next)[3]!;

    expect(formIds(next)).toEqual(['a', 'x', 'b', added]);
    expect(links(next)).toEqual(['a>c1', 'c1[r1]>x', 'c1>b', `c1[r2]>${added}`]);
  });

  it("drops a removed row's edge but keeps its Form and the default path", () => {
    const next = updateCondition(start(), 'c1', { label: '', rows: [row('r2')] });

    expect(formIds(next)).toContain('x');
    expect(links(next)).not.toContain('c1[r1]>x');
    expect(links(next)).toContain('c1>b');
  });

  it('leaves the uischema alone for an unknown condition', () => {
    const before = start();
    expect(updateCondition(before, 'nope', { label: '', rows: [] })).toBe(before);
  });
});
