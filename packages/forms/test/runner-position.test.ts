import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import {
  firstPositionIn,
  isFinalStep,
  isNavigableStage,
  nextStageId,
  nextStep,
  stageFormsOf,
  startPosition,
  visitedWith,
  type RunnerFlow,
} from '../src/runner/runner-position';
import type { ConditionRow, Operator } from '../src/types/elements';

// Doc 202 rules 13-18, 25 — where the runner is, and where it goes next.

const schema: JsonSchema = {
  type: 'object',
  properties: { plan: { type: 'string' }, agree: { type: 'boolean' } },
};

const el = (element: object) => element as UISchemaElement;
const form = (id?: string) =>
  el({ type: 'Form', elements: [], ...(id === undefined ? {} : { id }) });
const stage = (id: string, forms: object[] = [form(`${id}-f1`)]) =>
  el({ type: 'Stage', elements: forms, id });
/** One row holding one clause — `id` is the row id, so it is what an edge's `sourceHandle` names. */
const row = (id: string, field: string, operator: Operator, value?: unknown): ConditionRow =>
  ({
    id,
    label: `Condition ${id}`,
    match: 'all',
    clauses: [{ id: `${id}-1`, field, operator, ...(value === undefined ? {} : { value }) }],
  }) as ConditionRow;
const condition = (id: string, rows: ConditionRow[] = []) =>
  el({ type: 'Condition', id, options: { rows } });
const flow = (elements: object[], options?: object) =>
  el({ type: 'Flow', elements, ...(options === undefined ? {} : { options }) });
const edge = (id: string, source: string, target: string, sourceHandle?: string) => ({
  id,
  source,
  target,
  ...(sourceHandle === undefined ? {} : { sourceHandle }),
});

const context = (
  flowEl: UISchemaElement,
  data: Record<string, unknown> | undefined = {},
): RunnerFlow => ({ flow: flowEl, schema, data });

describe('runner position and traversal (doc 202 rules 13-18)', () => {
  describe('the starting position (rule 18)', () => {
    it('starts at the Stage named by Flow.options.startId, on its first Form', () => {
      const root = flow([stage('a'), stage('b')], { startId: 'b' });
      expect(startPosition(root)).toEqual({ stageId: 'b', formId: 'b-f1' });
    });

    it('falls back to the first Stage in elements order when startId is absent', () => {
      expect(startPosition(flow([stage('a'), stage('b')]))).toEqual({
        stageId: 'a',
        formId: 'a-f1',
      });
    });

    it('falls back when startId names no drawn Stage, so a dangling start never dead-ends', () => {
      expect(startPosition(flow([stage('a')], { startId: 'ghost' }))).toEqual({
        stageId: 'a',
        formId: 'a-f1',
      });
      // A Condition can never be the start either (doc 203 rule 3).
      expect(startPosition(flow([condition('x'), stage('a')], { startId: 'x' }))).toEqual({
        stageId: 'a',
        formId: 'a-f1',
      });
    });

    it('is undefined when the Flow has no usable Stage, or the start holds no Forms', () => {
      expect(startPosition(flow([]))).toBeUndefined();
      expect(startPosition(flow([condition('x')]))).toBeUndefined();
      expect(startPosition(flow([stage('a', [])]))).toBeUndefined();
    });
  });

  describe("a Stage's Forms", () => {
    it('lists Forms in elements order, by authored id', () => {
      const root = stage('a', [form('f1'), form('f2')]);
      expect(stageFormsOf(root).map(({ id }) => id)).toEqual(['f1', 'f2']);
      expect(stageFormsOf(root).every(({ authored }) => authored)).toBe(true);
    });

    it('gives an unaddressed Form a placeholder id, so a pre-doc-197 Form stays reachable', () => {
      // Unlike a placeholder STAGE id (rule 13), a Form id is addressed by nothing but the runner.
      const forms = stageFormsOf(stage('a', [form(), form('f2')]));
      expect(forms[0]?.authored).toBe(false);
      expect(forms[0]?.id).toMatch(/^__form-/);
      expect(firstPositionIn(flow([stage('a', [form(), form('f2')])]), 'a')?.formId).toBe(
        forms[0]?.id,
      );
    });

    it('keeps duplicate authored ids distinct, so two Forms are never one position', () => {
      const ids = stageFormsOf(stage('a', [form('dup'), form('dup')])).map(({ id }) => id);
      expect(new Set(ids).size).toBe(2);
    });

    it('ignores a non-Form child', () => {
      expect(
        stageFormsOf(stage('a', [form('f1'), el({ type: 'Grid', elements: [] })])),
      ).toHaveLength(1);
    });
  });

  describe('advancing within a Stage (rule 14)', () => {
    it('moves to the next Form of the current Stage', () => {
      const root = flow([stage('a', [form('f1'), form('f2')])]);
      expect(nextStep(context(root), { stageId: 'a', formId: 'f1' })).toEqual({
        kind: 'position',
        position: { stageId: 'a', formId: 'f2' },
      });
    });

    it('advances to the next Stage from the last Form, landing on its first Form', () => {
      const root = flow([stage('a', [form('f1'), form('f2')]), stage('b', [form('g1')])], {
        edges: [edge('e1', 'a', 'b')],
      });
      expect(nextStep(context(root), { stageId: 'a', formId: 'f2' })).toEqual({
        kind: 'position',
        position: { stageId: 'b', formId: 'g1' },
      });
    });
  });

  describe('resolving the next Stage (rules 15-17)', () => {
    it('walks the sanitised flowEdges, never the raw options.edges', () => {
      // A self-loop and an unknown end are dropped by the sanitiser, so neither leads anywhere.
      const root = flow([stage('a'), stage('b')], {
        edges: [edge('bad', 'a', 'a'), edge('gone', 'a', 'ghost')],
      });
      expect(nextStageId(context(root), 'a')).toBeUndefined();
    });

    it('evaluates a Condition target and follows the chosen edge', () => {
      const pro = row('c1', 'plan', 'equals', 'pro');
      const root = flow([stage('a'), condition('x', [pro]), stage('b'), stage('c')], {
        edges: [edge('e1', 'a', 'x'), edge('e2', 'x', 'b', 'c1'), edge('e3', 'x', 'c')],
      });
      expect(nextStageId(context(root, { plan: 'pro' }), 'a')).toBe('b');
      expect(nextStageId(context(root, { plan: 'basic' }), 'a')).toBe('c');
    });

    it('chains through consecutive Conditions until a Stage is reached', () => {
      const root = flow([stage('a'), condition('x'), condition('y'), stage('b')], {
        edges: [edge('e1', 'a', 'x'), edge('e2', 'x', 'y'), edge('e3', 'y', 'b')],
      });
      expect(nextStageId(context(root), 'a')).toBe('b');
    });

    it('reports the end of the flow when the current Stage has no outgoing edge (rule 16)', () => {
      // `review: false` — with the review page on (its default), the last Form leads there, not to the end.
      const root = flow([stage('a'), stage('b')], {
        edges: [edge('e1', 'b', 'a')],
        review: false,
      });
      expect(nextStageId(context(root), 'a')).toBeUndefined();
      expect(nextStep(context(root), { stageId: 'a', formId: 'a-f1' })).toEqual({ kind: 'end' });
      expect(isFinalStep(context(root), { stageId: 'a', formId: 'a-f1' })).toBe(true);
    });

    it('keeps a visited set and stops on a repeat, even though the apply gate refuses cycles (rule 17)', () => {
      // A hand-edited document reaches the runner without passing that gate. The protection matters when the
      // cycle runs through nodes the walk cannot LAND on — here a Condition — which would otherwise loop forever.
      const looping = flow([stage('a'), condition('x')], {
        edges: [edge('e1', 'a', 'x'), edge('e2', 'x', 'a')],
      });
      expect(nextStageId(context(looping), 'a')).toBeUndefined();
    });

    it('still advances one step between two Stages that cycle — that is a move, not a loop', () => {
      const pair = flow([stage('a'), stage('b')], {
        edges: [edge('e1', 'a', 'b'), edge('e2', 'b', 'a')],
      });
      expect(nextStageId(context(pair), 'a')).toBe('b');
      expect(nextStageId(context(pair), 'b')).toBe('a');
    });

    it('never navigates to a Stage with a placeholder id, which no edge can address (rule 13)', () => {
      const root = flow([stage('a'), el({ type: 'Stage', elements: [form('g1')] })]);
      expect(isNavigableStage(root, 'a')).toBe(true);
      expect(isNavigableStage(root, '__stage-1')).toBe(false);
      expect(firstPositionIn(root, '__stage-1')).toBeUndefined();
    });

    it('takes the first edge in order from a hand-edited fan-out, rather than throwing', () => {
      const root = flow([stage('a'), stage('b'), stage('c')], {
        edges: [edge('e1', 'a', 'b'), edge('e2', 'a', 'c')],
      });
      expect(nextStageId(context(root), 'a')).toBe('b');
    });
  });

  describe('a position the document no longer holds', () => {
    it('falls through to the stage walk rather than erroring', () => {
      const root = flow([stage('a', [form('f1')]), stage('b', [form('g1')])], {
        edges: [edge('e1', 'a', 'b')],
        review: false,
      });
      // The Form id is stale, but the Stage still leads somewhere.
      expect(nextStep(context(root), { stageId: 'a', formId: 'gone' })).toEqual({
        kind: 'position',
        position: { stageId: 'b', formId: 'g1' },
      });
      // Neither resolves: the user lands on Submit rather than nowhere.
      expect(nextStep(context(root), { stageId: 'gone', formId: 'gone' })).toEqual({ kind: 'end' });
    });
  });

  describe('visited stages (rule 25)', () => {
    it('records each Stage as it is reached', () => {
      const visited = visitedWith(visitedWith(new Set<string>(), 'a'), 'b');
      expect([...visited].toSorted()).toEqual(['a', 'b']);
    });

    it('keeps a Stage visited after going back to an earlier one', () => {
      const visited = visitedWith(visitedWith(new Set<string>(), 'a'), 'b');
      expect(visitedWith(visited, 'a')).toBe(visited);
    });

    it('returns the same set identity for a no-op, so a Back/Next round trip causes no re-render', () => {
      const visited = visitedWith(new Set<string>(), 'a');
      expect(visitedWith(visited, 'a')).toBe(visited);
      expect(visitedWith(visited, undefined)).toBe(visited);
    });
  });
});
