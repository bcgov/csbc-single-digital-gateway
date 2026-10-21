import { describe, expect, it } from 'vitest';
import { ensureContentStart, ensureStart, startOf, withStart } from '../src/studio/funnel-model';
import { condition, edge, form, funnel, row } from './funnel-fixtures';

describe('ensureStart', () => {
  it("keeps a start that names one of the Funnel's nodes, returning the same object", () => {
    const variant = withStart(funnel([form('a'), form('b')], [edge('e1', 'a', 'b')]), 'b');
    expect(ensureStart(variant)).toBe(variant);
  });

  it('starts a Funnel with no start, or a dangling one, at its first node nothing leads into', () => {
    const variant = funnel(
      [form('a'), form('b')],
      [edge('e0', 'c1', 'a'), edge('e1', 'a', 'b')],
      [condition('c1', [row('r1')])],
    );

    expect(startOf(ensureStart(variant))).toBe('c1');
    expect(startOf(ensureStart(withStart(variant, 'gone')))).toBe('c1');
  });

  it('leaves anything but a Funnel alone', () => {
    const root = form('a');
    expect(ensureStart(root)).toBe(root);
  });
});

describe('ensureContentStart', () => {
  it('ensures every variant, returning the same content when nothing changed', () => {
    const content = { schema: {}, variants: { default: funnel([form('a')], []) } };
    const next = ensureContentStart(content);

    expect(startOf(next.variants.default)).toBe('a');
    expect(ensureContentStart(next)).toBe(next);
  });
});
