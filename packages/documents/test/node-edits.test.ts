import { describe, expect, it } from 'vitest';
import type { Uischema } from '../src/studio/document-types';
import { idOf } from '../src/studio/element-ids';
import { conditionsOf, edgesOf, startOf, withStart } from '../src/studio/funnel-model';
import { addAfter, addBefore, addBetween, newForm, removeNode } from '../src/studio/node-edits';
import {
  condition,
  edge,
  form,
  formIds,
  funnel,
  links,
  NANOID_8,
  onlyCondition,
  row,
} from './funnel-fixtures';

describe('newForm', () => {
  it('is an empty Form with a nanoid(8) id', () => {
    expect(newForm()).toEqual({ id: expect.stringMatching(NANOID_8), type: 'Form', elements: [] });
  });
});

describe('addAfter', () => {
  it('turns a Form root into a Funnel holding it, a new Form and the edge between them', () => {
    const next = addAfter(form('a'), { source: 'a' }, 'form');
    const added = formIds(next)[1]!;

    expect(next).toMatchObject({ id: expect.stringMatching(NANOID_8), type: 'Funnel' });
    expect(formIds(next)).toEqual(['a', added]);
    expect(links(next)).toEqual([`a>${added}`]);
    expect(conditionsOf(next)).toEqual([]);
    expect(startOf(next)).toBe('a');
  });

  it('adds a Condition with an unset first branch and a default, each leading to a new Form', () => {
    const next = addAfter(form('a'), { source: 'a' }, 'condition');
    const c = onlyCondition(next);
    const [first] = c.options.rows;
    const [, branchForm, defaultForm] = formIds(next);

    expect(c.options.rows).toEqual([
      { id: expect.stringMatching(NANOID_8), label: 'Condition 1', match: 'all', clauses: [] },
    ]);
    expect(links(next)).toEqual([
      `a>${c.id}`,
      `${c.id}[${first!.id}]>${branchForm}`,
      `${c.id}>${defaultForm}`,
    ]);
  });

  it('joins the node before a deleted Condition to its default Form', () => {
    const added = addAfter(form('a'), { source: 'a' }, 'condition');
    const defaultForm = formIds(added)[2]!;

    expect(links(removeNode(added, onlyCondition(added).id))).toEqual([`a>${defaultForm}`]);
  });

  it("adds after a Condition's free default output, with no sourceHandle key", () => {
    const start = funnel(
      [form('a'), form('b')],
      [edge('e1', 'a', 'c1'), edge('e2', 'c1', 'b', 'r1')],
      [condition('c1', [row('r1')])],
    );
    const next = addAfter(start, { source: 'c1' }, 'form');
    const added = formIds(next).find((id) => id !== 'a' && id !== 'b')!;

    expect(edgesOf(next).at(-1)).toEqual({
      id: expect.stringMatching(NANOID_8),
      source: 'c1',
      target: added,
    });
    expect('sourceHandle' in edgesOf(next).at(-1)!).toBe(false);
  });

  it('refuses an output that is already connected, or an unknown source', () => {
    const start = funnel([form('a'), form('b')], [edge('e1', 'a', 'b')]);

    expect(addAfter(start, { source: 'a' }, 'form')).toBe(start);
    expect(addAfter(start, { source: 'zzz' }, 'form')).toBe(start);
  });
});

describe('addBetween', () => {
  it('splits an edge with a Form: the edge keeps its id and output, the Form continues to the old target', () => {
    const start = funnel(
      [form('a'), form('b')],
      [edge('e1', 'c1', 'b', 'r1'), edge('e0', 'a', 'c1')],
      [condition('c1', [row('r1')])],
    );
    const next = addBetween(start, 'e1', 'form');
    const added = formIds(next).find((id) => id !== 'a' && id !== 'b')!;

    expect(edgesOf(next)[0]).toEqual(edge('e1', 'c1', added, 'r1'));
    expect(links(next)).toContain(`${added}>b`);
  });

  it('splits an edge with a Condition whose DEFAULT output continues to the old target', () => {
    const next = addBetween(
      funnel([form('a'), form('b')], [edge('e1', 'a', 'b')]),
      'e1',
      'condition',
    );
    const c = onlyCondition(next);

    expect(edgesOf(next)[0]).toEqual(edge('e1', 'a', c.id));
    expect(links(next)).toContain(`${c.id}>b`);
    expect(links(next)).toContain(`${c.id}[${c.options.rows[0]!.id}]>${formIds(next)[1]}`);
  });

  it('leaves the uischema alone for an unknown edge', () => {
    const start = funnel([form('a'), form('b')], [edge('e1', 'a', 'b')]);
    expect(addBetween(start, 'nope', 'form')).toBe(start);
  });
});

describe('removeNode', () => {
  it('empties the variant when its only Form is deleted', () => {
    expect(removeNode(form('a'), 'a')).toEqual({});
  });

  it('bridges a removed Form, keeping the branch it was reached by', () => {
    const start = funnel(
      [form('a'), form('b'), form('c')],
      [
        edge('e0', 'a', 'c1'),
        edge('e1', 'c1', 'b', 'r1'),
        edge('e2', 'b', 'c'),
        edge('e3', 'c1', 'a2'),
      ],
      [condition('c1', [row('r1')])],
    );

    expect(links(removeNode(start, 'b'))).toEqual(['a>c1', 'c1>a2', 'c1[r1]>c']);
  });

  it("bridges a removed Condition's inputs to its default target, and deletes its branch Forms with it", () => {
    const start = funnel(
      [form('a'), form('b'), form('x')],
      [edge('e0', 'a', 'c1'), edge('e1', 'c1', 'x', 'r1'), edge('e2', 'c1', 'b')],
      [condition('c1', [row('r1')])],
    );
    const next = removeNode(start, 'c1');

    expect(conditionsOf(next)).toEqual([]);
    expect(formIds(next)).toEqual(['a', 'b']);
    expect(links(next)).toEqual(['a>b']);
  });

  it("deletes everything only a branch reaches — its chain and any Condition nested in it — keeping the default's path", () => {
    const start = funnel(
      [form('a'), form('x'), form('y'), form('z'), form('b'), form('m')],
      [
        edge('e0', 'a', 'c1'),
        edge('e1', 'c1', 'x', 'r1'),
        edge('e2', 'x', 'y'),
        edge('e3', 'y', 'c2'),
        edge('e4', 'c2', 'z', 'r2'),
        edge('e5', 'c2', 'm'),
        edge('e6', 'c1', 'b'),
      ],
      [condition('c1', [row('r1')]), condition('c2', [row('r2')])],
    );
    const next = removeNode(start, 'c1');

    expect(conditionsOf(next)).toEqual([]);
    expect(formIds(next)).toEqual(['a', 'b']);
    expect(links(next)).toEqual(['a>b']);
  });

  it('keeps a branch node that something outside the branches also leads to', () => {
    const start = funnel(
      [form('a'), form('x'), form('b'), form('shared')],
      [
        edge('e0', 'a', 'c1'),
        edge('e1', 'c1', 'x', 'r1'),
        edge('e2', 'x', 'shared'),
        edge('e3', 'c1', 'b'),
        edge('e4', 'b', 'shared'),
      ],
      [condition('c1', [row('r1')])],
    );
    const next = removeNode(start, 'c1');

    expect(formIds(next)).toEqual(['a', 'b', 'shared']);
    expect(links(next)).toEqual(['b>shared', 'a>b']);
  });

  it('removes a Condition with no default target without bridging anything', () => {
    const start = funnel(
      [form('a'), form('x')],
      [edge('e0', 'a', 'c1'), edge('e1', 'c1', 'x', 'r1')],
      [condition('c1', [row('r1')])],
    );

    expect(links(removeNode(start, 'c1'))).toEqual([]);
  });

  it('unwraps a Funnel left with one Form and no Conditions, but not one that still has a Condition', () => {
    expect(removeNode(funnel([form('a'), form('b')], [edge('e1', 'a', 'b')]), 'a')).toEqual(
      form('b'),
    );
    const withCondition = funnel(
      [form('a'), form('b')],
      [edge('e0', 'a', 'c1')],
      [condition('c1', [row('r1')])],
    );
    expect(removeNode(withCondition, 'b')['type']).toBe('Funnel');
  });

  it('leaves the uischema alone for an unknown node', () => {
    const start = funnel([form('a'), form('b')], [edge('e1', 'a', 'b')]);
    expect(removeNode(start, 'zzz')).toBe(start);
    expect(idOf(removeNode(form('a'), 'b'))).toBe('a');
  });

  it('moves the start onward when the start Form is deleted', () => {
    const start = withStart(
      funnel([form('a'), form('b'), form('c')], [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')]),
      'a',
    );
    expect(startOf(removeNode(start, 'a'))).toBe('b');
  });

  it("moves the start to a deleted start Condition's default target, never to a branch Form left unconnected", () => {
    const start = withStart(
      funnel(
        [form('x'), form('b'), form('c')],
        [edge('e1', 'c1', 'x', 'r1'), edge('e2', 'c1', 'b'), edge('e3', 'b', 'c')],
        [condition('c1', [row('r1')])],
      ),
      'c1',
    );
    expect(startOf(removeNode(start, 'c1'))).toBe('b');
  });

  it('keeps the start when another node is deleted, and drops it when the start leads nowhere', () => {
    const chain = withStart(
      funnel([form('a'), form('b'), form('c')], [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')]),
      'a',
    );
    expect(startOf(removeNode(chain, 'b'))).toBe('a');
    const loose = withStart(funnel([form('a'), form('b'), form('c')], [edge('e1', 'b', 'c')]), 'a');
    expect('start' in (removeNode(loose, 'a')['options'] as object)).toBe(false);
  });
});

/** c1 heads the Funnel and nothing leads into it. */
const headless = () =>
  withStart(funnel([form('x')], [edge('e1', 'c1', 'x')], [condition('c1', [row('r1')])]), 'c1');

describe('addBefore', () => {
  it('adds a Form leading into the node, and makes it the start when the node was', () => {
    const next = addBefore(headless(), 'c1');
    const added = idOf((next['elements'] as Uischema[]).at(-1)!)!;

    expect(edgesOf(next).map((e) => `${e.source}>${e.target}`)).toEqual(['c1>x', `${added}>c1`]);
    expect(startOf(next)).toBe(added);
  });

  it('keeps a start that names another node', () => {
    const variant = withStart(headless(), 'x');
    expect(startOf(addBefore(variant, 'c1'))).toBe('x');
  });

  it('changes nothing for an unknown node or a Form root', () => {
    const variant = headless();
    expect(addBefore(variant, 'gone')).toBe(variant);
    const root = form('a');
    expect(addBefore(root, 'a')).toBe(root);
  });
});
