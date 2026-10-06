import { describe, expect, it } from 'vitest';
import { conditionDecided, matchesClause } from '../src/renderers/default/funnel/clause-match';
import { fieldKindOf } from '../src/renderers/default/funnel/clause-vocabulary';
import { formHasError, mayOpen, pathErrors } from '../src/renderers/default/funnel/funnel-errors';
import { showsSummaryPage, startNodeOf } from '../src/renderers/default/funnel/funnel-graph';
import {
  nextStep,
  startFormId,
  visitedAfterPathChange,
  type FunnelContext,
} from '../src/renderers/default/funnel/funnel-position';
import {
  listedFormIds,
  upcomingStepRange,
} from '../src/renderers/default/funnel/funnel-projection';
import { condition, control, edge, form, funnel, row } from './funnel-fixtures';

const SCHEMA = {
  type: 'object',
  required: ['kind'],
  properties: {
    kind: {
      type: 'string',
      oneOf: [
        { const: 'person', title: 'Person' },
        { const: 'biz', title: 'Business' },
      ],
    },
    name: { type: 'string' },
    age: { type: 'integer' },
  },
};

const isBiz = row('r1', 'Business', [
  { id: 'k1', field: 'kind', operator: 'equals', value: 'biz' },
]);

/** a → c{ r1: b, default: p }; b → d; p → d. */
const branching = funnel(
  [
    form('a', 'Applicant', [control('kind')]),
    form('b', 'Business'),
    form('p', 'Person', [control('name')]),
    form('d', 'Done'),
  ],
  [
    edge('e1', 'a', 'c'),
    edge('e2', 'c', 'b', 'r1'),
    edge('e3', 'c', 'p'),
    edge('e4', 'b', 'd'),
    edge('e5', 'p', 'd'),
  ],
  [condition('c', [isBiz])],
);

const ctx = (data: Record<string, unknown> = {}, root = branching): FunnelContext => ({
  funnel: root,
  schema: SCHEMA,
  data,
});

describe('Funnel graph (doc 274 rules 1-3)', () => {
  it('starts at options.start, else the first node nothing leads into', () => {
    expect(startNodeOf(branching)).toBe('a');
    const withStart = {
      ...branching,
      options: { ...(branching['options'] as object), start: 'p' },
    };
    expect(startNodeOf(withStart)).toBe('p');
    const dangling = { ...branching, options: { ...(branching['options'] as object), start: 'x' } };
    expect(startNodeOf(dangling)).toBe('a');
  });

  it('shows the summary page unless showSummaryPage is false', () => {
    expect(showsSummaryPage(branching)).toBe(true);
    expect(showsSummaryPage({ ...branching, options: { showSummaryPage: false } })).toBe(false);
    expect(showsSummaryPage({ ...branching, options: { showSummaryPage: 'no' } })).toBe(true);
  });
});

describe('clause matching (rules 4-7)', () => {
  it('resolves field kinds from the schema alone', () => {
    expect(fieldKindOf(SCHEMA.properties.kind)).toBe('choice');
    expect(fieldKindOf(SCHEMA.properties.name)).toBe('text');
    expect(fieldKindOf(SCHEMA.properties.age)).toBe('number');
    expect(fieldKindOf({ type: 'boolean' })).toBe('boolean');
    expect(fieldKindOf({ type: 'object' })).toBeUndefined();
  });

  it('never matches an unevaluable clause, and compares by operator otherwise', () => {
    const text = { key: 'name', label: 'Name', kind: 'text' as const };
    expect(
      matchesClause({ id: 'x', field: 'name', operator: 'startsWith', value: 'al' }, text, {
        name: 'Alex',
      }),
    ).toBe(true);
    expect(
      matchesClause({ id: 'x', field: 'name', operator: 'gt', value: 1 }, text, { name: 'a' }),
    ).toBe(false);
    expect(matchesClause({ id: 'x', field: 'name', operator: 'equals' }, text, { name: 'a' })).toBe(
      false,
    );
    expect(matchesClause({ id: 'x', field: 'gone', operator: 'isEmpty' }, undefined, {})).toBe(
      false,
    );
    expect(matchesClause({ id: 'x', field: 'name', operator: 'isEmpty' }, text, { name: '' })).toBe(
      true,
    );
  });

  it('decides a Condition once its required field is answered', () => {
    const c = condition('c', [isBiz]);
    expect(conditionDecided(c, SCHEMA, {})).toBe(false);
    expect(conditionDecided(c, SCHEMA, { kind: 'person' })).toBe(true);
    expect(conditionDecided(condition('c', []), SCHEMA, {})).toBe(true);
  });
});

describe('routing (rules 8-10)', () => {
  it('starts on the first Form and follows a Condition by the answers', () => {
    expect(startFormId(ctx())).toBe('a');
    expect(nextStep(ctx({ kind: 'biz' }), 'a')).toEqual({ kind: 'form', formId: 'b' });
    expect(nextStep(ctx({ kind: 'person' }), 'a')).toEqual({ kind: 'form', formId: 'p' });
    // Unanswered: the default path.
    expect(nextStep(ctx({}), 'a')).toEqual({ kind: 'form', formId: 'p' });
  });

  it('ends at the summary page, or at the end when it is off', () => {
    expect(nextStep(ctx(), 'd')).toEqual({ kind: 'summary' });
    const off = {
      ...branching,
      options: { ...(branching['options'] as object), showSummaryPage: false },
    };
    expect(nextStep(ctx({}, off), 'd')).toEqual({ kind: 'end' });
  });

  it('starts through a Condition when the start is one, and stops on a cycle', () => {
    const viaCondition = funnel(
      [form('x'), form('y')],
      [edge('e1', 'c', 'y', 'r1'), edge('e2', 'c', 'x')],
      [condition('c', [isBiz])],
    );
    const started = {
      ...viaCondition,
      options: { ...(viaCondition['options'] as object), start: 'c' },
    };
    expect(startFormId(ctx({ kind: 'biz' }, started))).toBe('y');
    const loop = funnel(
      [form('x')],
      [edge('e1', 'x', 'c'), edge('e2', 'c', 'x')],
      [condition('c', [])],
    );
    const off = { ...loop, options: { ...(loop['options'] as object), showSummaryPage: false } };
    expect(nextStep(ctx({}, off), 'x')).toEqual({ kind: 'end' });
  });

  it('has no start Form for a Funnel without Forms', () => {
    expect(startFormId(ctx({}, funnel([], [], [condition('c', [])])))).toBeUndefined();
  });
});

describe('projection (rules 11-13)', () => {
  it('stops at an undecided Condition and hints at what may follow', () => {
    expect(listedFormIds(ctx())).toEqual(['a']);
    expect(upcomingStepRange(ctx())).toEqual({ min: 2, max: 2 });
    expect(listedFormIds(ctx({ kind: 'biz' }))).toEqual(['a', 'b', 'd']);
    expect(upcomingStepRange(ctx({ kind: 'biz' }))).toBeUndefined();
  });

  it('follows a route already taken, and always lists the current Form', () => {
    expect(listedFormIds(ctx(), 'a', new Set(['a', 'p']))).toEqual(['a', 'p', 'd']);
    expect(listedFormIds(ctx(), 'b')).toEqual(['a', 'b']);
  });

  it('forgets visits after the point where the path changed', () => {
    const visited = new Set(['a', 'p', 'd']);
    const kept = visitedAfterPathChange(['a', 'p', 'd'], ['a', 'b', 'd'], visited, 'a');
    expect([...kept]).toEqual(['a']);
    expect(visitedAfterPathChange(['a'], ['a'], visited, 'a')).toBe(visited);
  });
});

describe('errors (rules 19-22)', () => {
  const required = { instancePath: '', keyword: 'required', params: { missingProperty: 'kind' } };
  const tooLong = { instancePath: '/name', keyword: 'maxLength', params: {} };
  const forms = branching['elements'] as Record<string, unknown>[];

  it('attributes errors to the Form whose Controls bind the key', () => {
    expect(formHasError(forms[0]!, [required])).toBe(true);
    expect(formHasError(forms[0]!, [tooLong])).toBe(false);
    expect(formHasError(forms[2]!, [tooLong])).toBe(true);
    expect(formHasError(forms[3]!, [required, tooLong])).toBe(false);
  });

  it('blocks Submit on path errors and unowned errors, never on off-path ones', () => {
    const onPath = pathErrors(branching, ['a', 'p', 'd'], [tooLong]);
    expect([...onPath.erroredForms]).toEqual(['p']);
    expect(onPath.firstError).toBe('p');
    expect(onPath.submitBlocked).toBe(true);
    expect(pathErrors(branching, ['a', 'b', 'd'], [tooLong]).submitBlocked).toBe(false);
    const unowned = pathErrors(branching, ['a'], [{ instancePath: '', keyword: 'minProperties' }]);
    expect(unowned).toMatchObject({ submitBlocked: true, firstError: undefined });
  });

  it('opens a Form ahead only when nothing between owns an error', () => {
    const errs = pathErrors(branching, ['a', 'p', 'd'], [tooLong]);
    expect(mayOpen(errs, 'a', 'p')).toBe(true);
    expect(mayOpen(errs, 'a', 'd')).toBe(false);
    expect(mayOpen(errs, 'd', 'a')).toBe(true);
  });
});
