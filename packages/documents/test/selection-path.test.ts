import { describe, expect, it } from 'vitest';
import type { Uischema } from '../src/studio/document-types';
import { selectionPath } from '../src/studio/selection-path';
import { condition, edge, form, funnel, row } from './funnel-fixtures';

const root = { id: 'fun', label: 'Funnel', kind: 'funnel' };
const formAt = (id: string, label = id) => ({ id, label, kind: 'form' });
const conditionAt = (id: string, label: string) => ({ id, label, kind: 'condition' });

/** `uischema` starting at `start`. */
const startingAt = (uischema: Uischema, start: string): Uischema => ({
  ...uischema,
  options: { ...(uischema['options'] as object), start },
});

/** A → Eligible? → (r1) X → Y ; (default) B. */
const branching = () =>
  startingAt(
    funnel(
      [form('A'), form('X'), { id: 'Y', type: 'Form', elements: [] }, form('B')],
      [
        edge('e0', 'A', 'c1'),
        edge('e1', 'c1', 'X', 'r1'),
        edge('e2', 'X', 'Y'),
        edge('e3', 'c1', 'B'),
      ],
      [condition('c1', [row('r1')], 'Eligible?')],
    ),
    'A',
  );

describe('selectionPath', () => {
  it('is the Funnel then every node on the route from the start, Conditions included', () => {
    expect(selectionPath(branching(), 'Y')).toEqual([
      root,
      formAt('A'),
      conditionAt('c1', 'Eligible? (r1)'),
      formAt('X'),
      formAt('Y', 'Untitled form'),
    ]);
    expect(selectionPath(branching(), 'B')).toEqual([
      root,
      formAt('A'),
      conditionAt('c1', 'Eligible? (Default)'),
      formAt('B'),
    ]);
  });

  it('is the Funnel then the start alone when the start is selected', () => {
    expect(selectionPath(branching(), 'A')).toEqual([root, formAt('A')]);
  });

  it('names the branch a Condition is left by: its row label, or Default for the default path', () => {
    const uischema = startingAt(
      funnel(
        [form('A'), form('B')],
        [edge('e0', 'A', 'c1'), edge('e1', 'c1', 'B', 'r1')],
        [condition('c1', [row('r1', 'Adults')], 'Age check')],
      ),
      'A',
    );

    expect(selectionPath(uischema, 'B')?.[2]).toEqual(conditionAt('c1', 'Age check (Adults)'));
    expect(selectionPath(branching(), 'B')?.[2]).toEqual(conditionAt('c1', 'Eligible? (Default)'));
  });

  it("uses the Funnel's own label, and Untitled condition for a Condition without one", () => {
    const uischema = {
      ...funnel(
        [form('A'), form('B')],
        [edge('e0', 'A', 'c1'), edge('e1', 'c1', 'B')],
        [condition('c1', [])],
      ),
      label: 'Apply',
    };

    expect(selectionPath(uischema, 'B')).toEqual([
      { ...root, label: 'Apply' },
      formAt('A'),
      conditionAt('c1', 'Untitled condition (Default)'),
      formAt('B'),
    ]);
  });

  it('takes the shortest route where two lead to a Form', () => {
    const uischema = startingAt(
      funnel(
        [form('A'), form('L'), form('M'), form('Z')],
        [edge('e0', 'A', 'L'), edge('e1', 'L', 'M'), edge('e2', 'M', 'Z'), edge('e3', 'A', 'Z')],
      ),
      'A',
    );

    expect(selectionPath(uischema, 'Z')).toEqual([root, formAt('A'), formAt('Z')]);
  });

  it("routes a Form the start never reaches from its floating chain's head", () => {
    const uischema = startingAt(
      funnel([form('A'), form('F'), form('G')], [edge('e0', 'F', 'G')]),
      'A',
    );

    expect(selectionPath(uischema, 'G')).toEqual([root, formAt('F'), formAt('G')]);
  });

  it('is the Form alone when the Form is the root', () => {
    expect(selectionPath(form('A', 'Terms'), 'A')).toEqual([formAt('A', 'Terms')]);
  });

  it('is null with nothing selected, or an id that names no Form', () => {
    expect(selectionPath(branching(), null)).toBeNull();
    expect(selectionPath(branching(), 'gone')).toBeNull();
    expect(selectionPath(branching(), 'c1')).toBeNull();
    expect(selectionPath(branching(), 'fun')).toBeNull();
    expect(selectionPath({}, 'A')).toBeNull();
  });
});
