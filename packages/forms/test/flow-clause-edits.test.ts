import { describe, expect, it } from 'vitest';
import { addClause, removeClause, setClause } from '../src/studio/layout/clause-edits';
import { createElementIds } from '../src/studio/layout/element-ids';
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

// Doc 199 rules 28, 36, 48 — pure CLAUSE edits inside a row. A clause edit never changes a row's id, so it can
// never move or detach a branch's edges.

const TEXT_CLAUSE = { id: 'cl1', field: 'k1', operator: 'equals', value: 'a' };
const CHOICE_CLAUSE = { id: 'cl1', field: 'k4', operator: 'equals', value: 'bc' };

describe('addClause (rule 48)', () => {
  it('appends another complete clause, built like the row’s first', () => {
    const ids = createElementIds();
    const root = base([row('x', TEXT_CLAUSE)]);
    const next = addClause(
      { schema, uischema: root },
      ids.idOf(child(root, 1)),
      'x',
      ids,
      sequence('cl2'),
    );
    expect(clausesIn(child(next.uischema, 1))).toEqual([
      TEXT_CLAUSE,
      { id: 'cl2', field: 'k1', operator: 'equals', value: '' },
    ]);
  });

  it('gives the clause an id unique within its ROW, regenerating while taken', () => {
    const ids = createElementIds();
    const root = base([row('x', TEXT_CLAUSE)]);
    const next = addClause(
      { schema, uischema: root },
      ids.idOf(child(root, 1)),
      'x',
      ids,
      sequence('cl1', 'cl2'),
    );
    expect(clausesIn(child(next.uischema, 1)).map(({ id }) => id)).toEqual(['cl1', 'cl2']);
  });

  it('leaves the row id and its edges alone', () => {
    const ids = createElementIds();
    const root = base(
      [row('x', TEXT_CLAUSE)],
      [{ id: 'e1', source: 'c', target: 'b', sourceHandle: 'x' }],
    );
    const next = addClause(
      { schema, uischema: root },
      ids.idOf(child(root, 1)),
      'x',
      ids,
      sequence('cl2'),
    );
    expect(rowsIn(child(next.uischema, 1))[0]?.['id']).toBe('x');
    expect(edgesIn(next.uischema).map(({ id }) => id)).toEqual(['e0', 'e1']);
  });

  it('returns the same document for an unknown row or a non-Condition', () => {
    const ids = createElementIds();
    const root = base([row('x', TEXT_CLAUSE)]);
    const document = { schema, uischema: root };
    expect(addClause(document, ids.idOf(child(root, 1)), 'nope', ids, sequence('c'))).toBe(
      document,
    );
    expect(addClause(document, ids.idOf(child(root, 0)), 'x', ids, sequence('c'))).toBe(document);
  });
});

describe('removeClause (rule 48)', () => {
  const withTwo = () =>
    base([
      row('x', TEXT_CLAUSE, {
        clauses: [TEXT_CLAUSE, { id: 'cl2', field: 'k2', operator: 'gt', value: 2 }],
      }),
    ]);

  it('drops the clause, leaving the row and its edges', () => {
    const ids = createElementIds();
    const root = withTwo();
    const next = removeClause(
      { schema, uischema: root },
      ids.idOf(child(root, 1)),
      'x',
      'cl2',
      ids,
    );
    expect(clausesIn(child(next.uischema, 1)).map(({ id }) => id)).toEqual(['cl1']);
    expect(rowsIn(child(next.uischema, 1))[0]?.['id']).toBe('x');
  });

  it('REFUSES to remove the last clause: a row with none could never be taken', () => {
    const ids = createElementIds();
    const root = base([row('x', TEXT_CLAUSE)]);
    const document = { schema, uischema: root };
    expect(removeClause(document, ids.idOf(child(root, 1)), 'x', 'cl1', ids)).toBe(document);
  });

  it('returns the same document for an unknown clause id', () => {
    const ids = createElementIds();
    const root = withTwo();
    const document = { schema, uischema: root };
    expect(removeClause(document, ids.idOf(child(root, 1)), 'x', 'nope', ids)).toBe(document);
  });
});

const withOne = () => base([row('x', TEXT_CLAUSE)]);
const patch = (root: ReturnType<typeof base>, changes: object, ids = createElementIds()) =>
  setClause({ schema, uischema: root }, ids.idOf(child(root, 1)), 'x', 'cl1', changes, ids);

describe('setClause (rules 28, 36)', () => {
  it('patches the operator, keeping field and value', () => {
    const next = patch(withOne(), { operator: 'contains' });
    expect(clausesIn(child(next.uischema, 1))).toEqual([
      { id: 'cl1', field: 'k1', operator: 'contains', value: 'a' },
    ]);
  });

  it('resets operator and value when the new field has a DIFFERENT kind', () => {
    const root = base([row('x', { id: 'cl1', field: 'k1', operator: 'contains', value: 'a' })]);
    const next = patch(root, { field: 'k2' });
    // 'contains' is meaningless for a number, so the operator falls back to that kind's first.
    expect(clausesIn(child(next.uischema, 1))).toEqual([
      { id: 'cl1', field: 'k2', operator: 'equals', value: 0 },
    ]);
  });

  it('restarts the value as a LIST when the operator crosses into in/notIn (rule 36)', () => {
    const ids = createElementIds();
    // A flow whose upstream Stage asks the CHOICE field, so `in` is an operator it offers.
    const root = flow(
      [stage('a', [control('k4')]), condition('c', [row('x', CHOICE_CLAUSE)])],
      [{ id: 'e0', source: 'a', target: 'c' }],
    );
    const next = setClause(
      { schema, uischema: root },
      ids.idOf(child(root, 1)),
      'x',
      'cl1',
      { operator: 'in' },
      ids,
    );
    // A scalar cannot survive the move: `in` takes a list, so the value restarts at the field's first option.
    expect(clausesIn(child(next.uischema, 1))).toEqual([
      { id: 'cl1', field: 'k4', operator: 'in', value: ['bc'] },
    ]);
  });

  it('restarts it back to a scalar on the way out of a list operator', () => {
    const ids = createElementIds();
    const root = flow(
      [
        stage('a', [control('k4')]),
        condition('c', [row('x', { ...CHOICE_CLAUSE, operator: 'in', value: ['bc'] })]),
      ],
      [{ id: 'e0', source: 'a', target: 'c' }],
    );
    const next = setClause(
      { schema, uischema: root },
      ids.idOf(child(root, 1)),
      'x',
      'cl1',
      { operator: 'equals' },
      ids,
    );
    expect(clausesIn(child(next.uischema, 1))).toEqual([
      { id: 'cl1', field: 'k4', operator: 'equals', value: 'bc' },
    ]);
  });

  it('keeps the clause AND row ids across every patch, so the branch stays attached', () => {
    const ids = createElementIds();
    const root = base(
      [row('x', TEXT_CLAUSE)],
      [{ id: 'e1', source: 'c', target: 'b', sourceHandle: 'x' }],
    );
    const next = setClause(
      { schema, uischema: root },
      ids.idOf(child(root, 1)),
      'x',
      'cl1',
      { field: 'k2' },
      ids,
    );
    expect(clausesIn(child(next.uischema, 1))[0]?.['id']).toBe('cl1');
    expect(rowsIn(child(next.uischema, 1))[0]?.['id']).toBe('x');
    expect(edgesIn(next.uischema).map(({ id }) => id)).toEqual(['e0', 'e1']);
  });

  it('refuses a patch that would make the clause invalid', () => {
    const ids = createElementIds();
    const root = withOne();
    const document = { schema, uischema: root };
    const conditionId = ids.idOf(child(root, 1));
    const set = (changes: object) => setClause(document, conditionId, 'x', 'cl1', changes, ids);
    // 'gt' is not a text operator, and a number is not a text value.
    expect(set({ operator: 'gt' })).toBe(document);
    expect(set({ value: 7 })).toBe(document);
    // A field that is not upstream cannot be named at all.
    expect(set({ field: 'k4' })).toBe(document);
  });

  it('returns the same document for an unknown clause, row, or a non-Condition', () => {
    const ids = createElementIds();
    const root = withOne();
    const document = { schema, uischema: root };
    expect(
      setClause(document, ids.idOf(child(root, 1)), 'x', 'nope', { operator: 'contains' }, ids),
    ).toBe(document);
    expect(
      setClause(document, ids.idOf(child(root, 1)), 'nope', 'cl1', { operator: 'contains' }, ids),
    ).toBe(document);
    expect(
      setClause(document, ids.idOf(child(root, 0)), 'x', 'cl1', { operator: 'contains' }, ids),
    ).toBe(document);
  });
});

describe('repairing an already-invalid clause (doc 206 rule 24b)', () => {
  /**
   * `setClause` refused ANY patch whose result still had problems — which is right for protecting a VALID
   * clause, and wrong for a broken one: it made a stranded clause un-editable, so the only repair was to
   * delete and re-create it. That also blocked doc 206 rule 24 (membership-checking multi-choice clauses)
   * from ever being turned on, because the markers it raises would have been unfixable.
   */
  /**
   * `base()` wires only k1 and k2 upstream, so a k4 clause there is DANGLING — invalid for a reason that
   * has nothing to do with its value, which would make every assertion below pass for the wrong reason.
   */
  const choiceFlow = (clause: object) =>
    flow(
      [stage('a', [control('k4')]), condition('c', [row('x', clause)]), stage('b')],
      [{ id: 'e0', source: 'a', target: 'c' }],
    );

  const strandedDoc = () => {
    const ids = createElementIds();
    // `zz` is not one of k4's consts, so this clause is already invalid — and k4 IS upstream.
    const root = choiceFlow({ id: 'cl1', field: 'k4', operator: 'equals', value: 'zz' });
    return { ids, root, conditionId: ids.idOf(child(root, 1)) };
  };

  // NOT named `patch`: a `patch` helper already exists in the upper scope of this file.
  const patched = (changes: object) => {
    const { ids, root, conditionId } = strandedDoc();
    const next = setClause({ schema, uischema: root }, conditionId, 'x', 'cl1', changes, ids);
    return clausesIn(child(next.uischema, 1))[0];
  };

  it('accepts an edit that REPAIRS it', () => {
    expect(patched({ value: 'bc' })).toMatchObject({ value: 'bc' });
  });

  it('accepts an edit that leaves it still broken, so the author can keep typing', () => {
    // Refusing here is what made the clause un-editable: an author fixing a value one keystroke at a
    // time passes through states that are still invalid.
    expect(patched({ value: 'b' })).toMatchObject({ value: 'b' });
  });

  it('accepts a move to another field from a broken clause', () => {
    expect(patched({ field: 'k1' })).toMatchObject({ field: 'k1' });
  });

  it('still REFUSES an edit that would break a clause that is currently valid', () => {
    const ids = createElementIds();
    const root = choiceFlow({ id: 'cl1', field: 'k4', operator: 'equals', value: 'bc' });
    const next = setClause(
      { schema, uischema: root },
      ids.idOf(child(root, 1)),
      'x',
      'cl1',
      { value: 'zz' },
      ids,
    );
    expect(clausesIn(child(next.uischema, 1))[0]).toMatchObject({ value: 'bc' });
  });
});
