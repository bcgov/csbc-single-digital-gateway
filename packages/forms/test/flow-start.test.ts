import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createAjv, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { startStageId } from '../src/renderers/xyflow/flow-elements';
import {
  flowProblems,
  unknownStartMessage,
  unreachableNodeIds,
} from '../src/renderers/xyflow/flow-graph';
import { UISCHEMA_METASCHEMA } from '../src/studio/code/metaschema/uischema-metaschema';
import { documentFor } from '../src/studio/document/document-source';
import { FLOW_TEMPLATE_UISCHEMA } from '../src/studio/document/flow-sample';
import { createElementIds } from '../src/studio/layout/element-ids';
import { insertStage } from '../src/studio/layout/flow-edits';
import { removeElement } from '../src/studio/layout/remove-element';

const ajv = createAjv();
const schema: JsonSchema = { type: 'object', properties: {} };

// Doc 203 — the Flow's authored entry point (`Flow.options.startId`), the resolver both the canvas and the runner
// read, and the reachability it makes possible. The pure half; the canvas marker and the inspector picker are in
// flow-start-ui.test.tsx.

const stage = (id?: unknown, extra: object = {}) =>
  ({
    type: 'Stage',
    elements: [],
    ...(id === undefined ? {} : { id }),
    ...extra,
    // Doc 219: `id` is typed `string` on the element, and this helper deliberately passes bad values.
  }) as unknown as UISchemaElement;

const criterion = (id: string) => ({ id, field: 'k1', operator: 'equals', value: 'x' });
const condition = (id: string, criteria: string[] = []) =>
  ({
    type: 'Condition',
    id,
    options: { criteria: criteria.map(criterion) },
  }) as UISchemaElement;

/** A Flow taking its WHOLE options bag, so `startId` can be authored beside `edges`. */
const flow = (elements: readonly UISchemaElement[], options?: object) =>
  ({
    type: 'Flow',
    elements,
    ...(options === undefined ? {} : { options }),
  }) as UISchemaElement;

const edge = (id: string, source: string, target: string) => ({ id, source, target });

const abc = [stage('a'), stage('b'), stage('c')];

const flowOf = (options: object) => ({ type: 'Flow', elements: [], options });
const emptyFlowDoc = () =>
  ({ type: 'Flow', elements: [], options: { edges: [] } }) as UISchemaElement;
const startIdOf = (uischema: UISchemaElement) => uischema.options?.['startId'];

/** Deterministic ids, so an assertion can name the Stage that was just inserted. */
const counter = () => {
  let n = 0;
  return () => {
    n += 1;
    return `n${n}`;
  };
};

describe('Flow start stage (doc 203)', () => {
  describe('startStageId — the one resolver (rules 1-3)', () => {
    it('returns the authored startId when it names a drawn Stage', () => {
      expect(startStageId(flow(abc, { startId: 'b' }))).toBe('b');
      expect(startStageId(flow(abc, { startId: 'c', edges: [edge('e1', 'a', 'b')] }))).toBe('c');
    });

    it('falls back to the first drawn Stage in elements order when startId is absent', () => {
      // Elements order, NOT graph order: 'c' is first in the array even though 'a' leads to it.
      const stages = [stage('c'), stage('a'), stage('b')];
      expect(startStageId(flow(stages))).toBe('c');
      expect(startStageId(flow(stages, { edges: [edge('e1', 'a', 'c')] }))).toBe('c');
      expect(startStageId(flow(abc, {}))).toBe('a');
    });

    it('falls back when startId names a Condition', () => {
      // Rule 3: a Condition branches on answers given before it, so it can never be first.
      expect(startStageId(flow([condition('x'), stage('a')], { startId: 'x' }))).toBe('a');
    });

    it('falls back when startId names no node, or a placeholder id', () => {
      expect(startStageId(flow(abc, { startId: 'ghost' }))).toBe('a');
      expect(startStageId(flow(abc, { startId: '' }))).toBe('a');
      expect(startStageId(flow(abc, { startId: 7 }))).toBe('a');
      // A placeholder id is not addressable by any edge, so it can never be the start either.
      expect(startStageId(flow([stage(), stage('b')], { startId: '__stage-0' }))).toBe('b');
    });

    it('returns undefined for a Flow with no addressable Stage', () => {
      expect(startStageId(flow([]))).toBeUndefined();
      expect(startStageId(flow([condition('x')]))).toBeUndefined();
      expect(startStageId(flow([stage(), stage('')]))).toBeUndefined();
    });

    it('is pure and exported from flow-elements, so renderers/default may read it', () => {
      expect(typeof startStageId).toBe('function');
      const source = readFileSync(
        resolve(import.meta.dirname, '../src/renderers/xyflow/flow-elements.ts'),
        'utf8',
      );
      expect(source).not.toMatch(/from ['"](@xyflow\/react|react|react-dom)['"/]/);
    });
  });

  describe('unreachableNodeIds (rules 4-6)', () => {
    it('lists Stages with no path from the start, in elements order', () => {
      expect(unreachableNodeIds(flow(abc, { edges: [edge('e1', 'a', 'b')] }))).toEqual(['c']);
      expect(unreachableNodeIds(flow(abc))).toEqual(['b', 'c']);
    });

    it('never lists the start itself', () => {
      expect(unreachableNodeIds(flow(abc))).not.toContain('a');
      // Including when the start is authored rather than derived.
      expect(unreachableNodeIds(flow(abc, { startId: 'c' }))).toEqual(['a', 'b']);
    });

    it('lists every Stage when the Flow has no start', () => {
      expect(unreachableNodeIds(flow([stage(), stage()]))).toEqual(['__stage-0', '__stage-1']);
      expect(unreachableNodeIds(flow([]))).toEqual([]);
    });

    it('ignores edges the sanitiser drops, so a dropped edge never makes a Stage look reachable', () => {
      // An unknown target and a self-loop are both dropped by flowEdges.
      const edges = [edge('e1', 'a', 'ghost'), edge('e2', 'b', 'b')];
      expect(unreachableNodeIds(flow(abc, { edges }))).toEqual(['b', 'c']);
    });

    it('lists a stranded Condition too (rule 6, widened 2026-09-17)', () => {
      // A Condition ON the path is reachable like any other node...
      const wired = flow([stage('a'), condition('x')], { edges: [edge('e1', 'a', 'x')] });
      expect(unreachableNodeIds(wired)).toEqual([]);
      // ...and one with nothing leading to it is stranded, which is the node the author has to find. Read as a
      // symptom of the Stage behind it, a Condition dangling with no Stage behind it had nothing to point at.
      expect(unreachableNodeIds(flow([stage('a'), condition('x')]))).toEqual(['x']);
    });

    it('follows a path that runs through a Condition', () => {
      const root = flow([stage('a'), condition('x'), stage('b')], {
        edges: [edge('e1', 'a', 'x'), edge('e2', 'x', 'b')],
      });
      expect(unreachableNodeIds(root)).toEqual([]);
    });
  });

  describe('flowProblems (rules 12-13)', () => {
    it('reports a startId naming no drawn Stage at /options/startId', () => {
      expect(flowProblems(flow(abc, { startId: 'ghost' }))).toContainEqual({
        path: '/options/startId',
        message: unknownStartMessage('ghost'),
      });
      // The message names the fallback, so the author knows the flow still runs.
      expect(unknownStartMessage('ghost')).toContain('first stage');
    });

    it('reports a startId naming a Condition', () => {
      expect(flowProblems(flow([condition('x'), stage('a')], { startId: 'x' }))).toContainEqual({
        path: '/options/startId',
        message: unknownStartMessage('x'),
      });
    });

    it('reports nothing when startId is absent, or names a real Stage', () => {
      expect(flowProblems(flow(abc))).toEqual([]);
      expect(flowProblems(flow(abc, { startId: 'b' }))).toEqual([]);
      expect(flowProblems(flow(abc, { startId: '' }))).toEqual([]);
    });

    it('does not report an unreachable Stage (rule 10)', () => {
      // Every Stage but 'a' is unreachable here, and the document still applies: mid-wiring, every new
      // Stage is unreachable until it is connected.
      const root = flow(abc, { startId: 'a' });
      expect(unreachableNodeIds(root)).toEqual(['b', 'c']);
      expect(flowProblems(root)).toEqual([]);
    });
  });

  describe('metaschema (rule 11)', () => {
    const ok = (value: unknown) => ajv.validate(UISCHEMA_METASCHEMA, value) === true;

    it('accepts a Flow whose options carry a non-empty string startId', () => {
      expect(ok(flowOf({ startId: 's1' }))).toBe(true);
      expect(ok(flowOf({ startId: 's1', edges: [] }))).toBe(true);
    });

    it('accepts a Flow with no startId, so documents predating this still apply', () => {
      expect(ok({ type: 'Flow', elements: [] })).toBe(true);
      expect(ok(flowOf({ edges: [] }))).toBe(true);
    });

    it('rejects an empty or non-string startId', () => {
      expect(ok(flowOf({ startId: '' }))).toBe(false);
      expect(ok(flowOf({ startId: 7 }))).toBe(false);
      expect(ok(flowOf({ startId: null }))).toBe(false);
    });

    it('describes startId, so completion documents it', () => {
      expect(JSON.stringify(UISCHEMA_METASCHEMA)).toContain('the Stage the flow starts at');
    });
  });

  describe('keeping it honest (rules 19-22)', () => {
    it('stamps startId when insertNode adds a Flow’s first Stage', () => {
      const ids = createElementIds();
      const { uischema, inserted } = insertStage(emptyFlowDoc(), null, ids, counter());
      expect(inserted).toBeDefined();
      expect(startIdOf(uischema)).toBe(inserted?.id);
      // And the resolver agrees with the stamp.
      expect(startStageId(uischema)).toBe(startIdOf(uischema));
    });

    it('leaves startId alone when insertNode adds a later Stage', () => {
      const ids = createElementIds();
      const newId = counter();
      const first = insertStage(emptyFlowDoc(), null, ids, newId);
      const stamped = startIdOf(first.uischema);
      const second = insertStage(first.uischema, null, ids, newId);
      expect(startIdOf(second.uischema)).toBe(stamped);
      expect(second.inserted?.id).not.toBe(stamped);
    });

    it('clears startId when removeElement removes the start Stage', () => {
      const ids = createElementIds();
      const a = stage('a');
      const uischema = flow([a, stage('b')], { startId: 'a', edges: [] });
      const next = removeElement({ schema, uischema }, ids.idOf(a), ids);
      expect(startIdOf(next.uischema)).toBeUndefined();
      // Removed, never set to undefined — an explicit key would defeat the fallback.
      expect(Object.hasOwn(next.uischema.options ?? {}, 'startId')).toBe(false);
    });

    it('leaves startId when removeElement removes a different Stage', () => {
      const ids = createElementIds();
      const b = stage('b');
      const uischema = flow([stage('a'), b], { startId: 'a', edges: [] });
      const next = removeElement({ schema, uischema }, ids.idOf(b), ids);
      expect(startIdOf(next.uischema)).toBe('a');
    });

    it('promotes no other Stage when the start is removed — the resolver falls back instead', () => {
      const ids = createElementIds();
      const a = stage('a');
      const uischema = flow([a, stage('b')], { startId: 'a', edges: [] });
      const next = removeElement({ schema, uischema }, ids.idOf(a), ids);
      expect(startIdOf(next.uischema)).toBeUndefined();
      // Nothing was authored in its place; the flow simply begins at what is now first.
      expect(startStageId(next.uischema)).toBe('b');
    });

    it('names a start in FLOW_TEMPLATE_UISCHEMA and in a new multi-stage document', () => {
      const authored = startIdOf(FLOW_TEMPLATE_UISCHEMA);
      expect(typeof authored).toBe('string');
      // The template's authored start is a real Stage of it, so the resolver returns exactly that.
      expect(startStageId(FLOW_TEMPLATE_UISCHEMA)).toBe(authored);
      // A new multi-stage document opens with one Stage, and that Stage is its start (rule 19).
      const fresh = documentFor('new-multi-stage').uischema;
      expect(startIdOf(fresh)).toBe(startStageId(fresh));
      expect(typeof startIdOf(fresh)).toBe('string');
    });
  });
});
