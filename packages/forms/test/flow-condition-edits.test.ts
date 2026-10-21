import { describe, expect, it } from 'vitest';
import { createElementIds } from '../src/studio/layout/element-ids';
import type { TreeElement } from '../src/studio/layout/element-tree';
import { addRow, moveRow, removeRow, setMode, setRow } from '../src/studio/layout/condition-edits';
import { removeElement } from '../src/studio/layout/remove-element';
import {
  base,
  child,
  clausesIn,
  condition,
  control,
  edgesIn,
  flow,
  row,
  rowsIn,
  schema,
  sequence,
  stage,
} from './condition-edit-fixtures';

// Doc 199 rules 27, 46, 48-49, 51 — pure ROW edits. Every changed element is a new object carrying its studio
// id; a refused edit returns the SAME document object. The clause edits are in `flow-clause-edits.test.ts`.

const TEXT_CLAUSE = { id: 'cl1', field: 'k1', operator: 'equals', value: 'a' };

describe('addRow (rule 46)', () => {
  it('appends a row born complete: label, match, and one clause on the first upstream field', () => {
    const ids = createElementIds();
    const root = base();
    const next = addRow(
      { schema, uischema: root },
      ids.idOf(child(root, 1)),
      ids,
      sequence('x', 'c'),
    );
    expect(rowsIn(child(next.uischema, 1))).toEqual([
      {
        id: 'c',
        label: 'Condition 1',
        match: 'all',
        clauses: [{ id: 'x', field: 'k1', operator: 'equals', value: '' }],
      },
    ]);
  });

  it('numbers the label one past the highest already there (rule 46)', () => {
    const ids = createElementIds();
    const root = base([row('r1', TEXT_CLAUSE, { label: 'Condition 3' })]);
    const next = addRow(
      { schema, uischema: root },
      ids.idOf(child(root, 1)),
      ids,
      sequence('x', 'y'),
    );
    expect(rowsIn(child(next.uischema, 1))[1]?.['label']).toBe('Condition 4');
  });

  it('gives the row an id unique within the node, regenerating while taken', () => {
    const ids = createElementIds();
    const root = base([row('y', TEXT_CLAUSE)]);
    const next = addRow(
      { schema, uischema: root },
      ids.idOf(child(root, 1)),
      ids,
      sequence('cl', 'y', 'z'),
    );
    expect(rowsIn(child(next.uischema, 1)).map(({ id }) => id)).toEqual(['y', 'z']);
  });

  it("uses the field's first choice option as the value for a choice field", () => {
    const ids = createElementIds();
    const root = flow(
      [stage('a', [control('k4')]), condition('c')],
      [{ id: 'e0', source: 'a', target: 'c' }],
    );
    const next = addRow(
      { schema, uischema: root },
      ids.idOf(child(root, 1)),
      ids,
      sequence('x', 'r'),
    );
    expect(clausesIn(child(next.uischema, 1))).toEqual([
      { id: 'x', field: 'k4', operator: 'equals', value: 'bc' },
    ]);
  });

  it('refuses (same document) when the Condition has no upstream fields', () => {
    const ids = createElementIds();
    // No edge reaches the Condition, so nothing has been answered before it.
    const root = flow([stage('a', [control('k1')]), condition('c')]);
    const document = { schema, uischema: root };
    expect(addRow(document, ids.idOf(child(root, 1)), ids, sequence('x'))).toBe(document);
  });

  it('refuses for an unknown id or an element that is not a Condition', () => {
    const ids = createElementIds();
    const root = base();
    const document = { schema, uischema: root };
    expect(addRow(document, 'el-999', ids, sequence('x'))).toBe(document);
    expect(addRow(document, ids.idOf(child(root, 0)), ids, sequence('x'))).toBe(document);
  });

  it('adds no edge — the new output starts unconnected', () => {
    const ids = createElementIds();
    const root = base();
    const next = addRow(
      { schema, uischema: root },
      ids.idOf(child(root, 1)),
      ids,
      sequence('x', 'r'),
    );
    expect(edgesIn(next.uischema)).toEqual([{ id: 'e0', source: 'a', target: 'c' }]);
  });
});

describe('removeRow (rules 27, 48)', () => {
  const withTwo = () =>
    base(
      [row('x', TEXT_CLAUSE), row('y', { id: 'cl2', field: 'k2', operator: 'gt', value: 2 })],
      [
        { id: 'e1', source: 'c', target: 'b', sourceHandle: 'x' },
        { id: 'e2', source: 'c', target: 'b', sourceHandle: 'y' },
        { id: 'e3', source: 'c', target: 'b' },
      ],
    );

  it('drops the row and every edge whose (source, sourceHandle) names it', () => {
    const ids = createElementIds();
    const root = withTwo();
    const next = removeRow({ schema, uischema: root }, ids.idOf(child(root, 1)), 'x', ids);
    expect(rowsIn(child(next.uischema, 1)).map(({ id }) => id)).toEqual(['y']);
    expect(edgesIn(next.uischema).map(({ id }) => id)).toEqual(['e0', 'e2', 'e3']);
  });

  it("leaves the Else edge and the other rows' edges untouched", () => {
    const ids = createElementIds();
    const root = withTwo();
    const next = removeRow({ schema, uischema: root }, ids.idOf(child(root, 1)), 'y', ids);
    // e3 carries no handle: it is the Else path.
    expect(edgesIn(next.uischema).map(({ id }) => id)).toEqual(['e0', 'e1', 'e3']);
  });

  it('returns the same document for an unknown row id', () => {
    const ids = createElementIds();
    const root = withTwo();
    const document = { schema, uischema: root };
    expect(removeRow(document, ids.idOf(child(root, 1)), 'nope', ids)).toBe(document);
  });
});

describe('setRow (rule 48)', () => {
  it('patches the label and the match without touching the clauses', () => {
    const ids = createElementIds();
    const root = base([row('x', TEXT_CLAUSE)]);
    const next = setRow(
      { schema, uischema: root },
      ids.idOf(child(root, 1)),
      'x',
      { label: 'Business', match: 'any' },
      ids,
    );
    expect(rowsIn(child(next.uischema, 1))).toEqual([
      { id: 'x', label: 'Business', match: 'any', clauses: [TEXT_CLAUSE] },
    ]);
  });

  it('returns the same document for an unknown row or a non-Condition', () => {
    const ids = createElementIds();
    const root = base([row('x', TEXT_CLAUSE)]);
    const document = { schema, uischema: root };
    expect(setRow(document, ids.idOf(child(root, 1)), 'nope', { label: 'x' }, ids)).toBe(document);
    expect(setRow(document, ids.idOf(child(root, 0)), 'x', { label: 'x' }, ids)).toBe(document);
  });
});

describe('moveRow (rule 49)', () => {
  const three = () =>
    base(
      [
        row('x', TEXT_CLAUSE),
        row('y', { id: 'cl2', field: 'k2', operator: 'gt', value: 2 }),
        row('z', { id: 'cl3', field: 'k1', operator: 'contains', value: 'q' }),
      ],
      [{ id: 'e1', source: 'c', target: 'b', sourceHandle: 'z' }],
    );

  it('reorders the rows, which is the evaluation order', () => {
    const ids = createElementIds();
    const root = three();
    const next = moveRow({ schema, uischema: root }, ids.idOf(child(root, 1)), 'z', 0, ids);
    expect(rowsIn(child(next.uischema, 1)).map(({ id }) => id)).toEqual(['z', 'x', 'y']);
  });

  it('rewrites NO edge — a row keeps its id, so its branch follows it', () => {
    const ids = createElementIds();
    const root = three();
    const next = moveRow({ schema, uischema: root }, ids.idOf(child(root, 1)), 'z', 0, ids);
    expect(edgesIn(next.uischema)).toEqual([
      { id: 'e0', source: 'a', target: 'c' },
      { id: 'e1', source: 'c', target: 'b', sourceHandle: 'z' },
    ]);
  });

  it('clamps an index past the end rather than refusing: an overshot drag means "last"', () => {
    const ids = createElementIds();
    const root = three();
    const next = moveRow({ schema, uischema: root }, ids.idOf(child(root, 1)), 'x', 99, ids);
    expect(rowsIn(child(next.uischema, 1)).map(({ id }) => id)).toEqual(['y', 'z', 'x']);
  });

  it('returns the same document for an unknown row, or a move that changes nothing', () => {
    const ids = createElementIds();
    const root = three();
    const document = { schema, uischema: root };
    const conditionId = ids.idOf(child(root, 1));
    expect(moveRow(document, conditionId, 'nope', 0, ids)).toBe(document);
    expect(moveRow(document, conditionId, 'x', 0, ids)).toBe(document);
  });
});

describe('setMode (rule 51)', () => {
  it('stores the mode beside the rows, changing none of them', () => {
    const ids = createElementIds();
    const root = base([row('x', TEXT_CLAUSE)]);
    const next = setMode({ schema, uischema: root }, ids.idOf(child(root, 1)), 'switch', ids);
    expect(child(next.uischema, 1).options?.['mode']).toBe('switch');
    // Switching is lossless — which is exactly why the toggle is gated rather than converting anything.
    expect(rowsIn(child(next.uischema, 1))).toEqual(rowsIn(child(root, 1)));
  });
});

describe('removing a Condition (rule 27)', () => {
  it('removes every edge touching it, in both directions', () => {
    const ids = createElementIds();
    const root = base(
      [row('x', TEXT_CLAUSE)],
      [
        { id: 'e1', source: 'c', target: 'b', sourceHandle: 'x' },
        { id: 'e2', source: 'c', target: 'b' },
      ],
    );
    const next = removeElement({ schema, uischema: root }, ids.idOf(child(root, 1)), ids);
    expect((next.uischema as TreeElement).elements?.map((element) => element.type)).toEqual([
      'Stage',
      'Stage',
    ]);
    // e0 entered the Condition; e1 and e2 left it.
    expect(edgesIn(next.uischema)).toEqual([]);
  });

  it('drops schema properties no remaining Control uses, like removing a Stage does', () => {
    const ids = createElementIds();
    const root = base();
    const next = removeElement({ schema, uischema: root }, ids.idOf(child(root, 0)), ids);
    expect(Object.keys(next.schema.properties ?? {})).toEqual(['k4']);
  });
});
