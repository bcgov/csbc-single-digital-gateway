import type { UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import {
  canConnect,
  connectGesture,
  disconnectGesture,
} from '../src/renderers/xyflow/flow-gestures';

// Doc 196 rules 1, 5-7 — pure xyflow callback → FlowGesture translation (renderers/xyflow/flow-gestures).
// The move gesture is retired by doc 198 rules 4-5: positions are derived, so a drag cannot persist.

const el = (element: object) => element as UISchemaElement;
const stage = (id?: string) =>
  el({ type: 'Stage', elements: [], ...(id === undefined ? {} : { options: { id } }) });
const flow = (stages: UISchemaElement[], pairs: [string, string][] = []) =>
  el({
    type: 'Flow',
    elements: stages,
    options: { edges: pairs.map(([source, target], i) => ({ id: `e${i}`, source, target })) },
  });

describe('canConnect (rule 5)', () => {
  const chain = flow([stage('a'), stage('b'), stage('c')], [['a', 'b']]);

  it('accepts a new edge between two authored Stages that closes no cycle, including a branch', () => {
    expect(canConnect(chain, 'b', 'c')).toBe(true);
    expect(canConnect(chain, 'a', 'c')).toBe(true);
    expect(canConnect(flow([stage('a'), stage('b')]), 'b', 'a')).toBe(true);
  });

  it('refuses a self-loop, a repeated (source, target) pair and a missing end', () => {
    expect(canConnect(chain, 'a', 'a')).toBe(false);
    expect(canConnect(chain, 'a', 'b')).toBe(false);
    expect(canConnect(chain, null, 'b')).toBe(false);
    expect(canConnect(chain, 'a', '')).toBe(false);
    expect(canConnect(chain, 'a', 'ghost')).toBe(false);
  });

  it('refuses an end whose Stage has no authored id', () => {
    const placeholders = flow([stage('a'), stage(), stage('a')]);
    expect(canConnect(placeholders, 'a', '__stage-1')).toBe(false);
    expect(canConnect(placeholders, '__stage-2', 'a')).toBe(false);
  });

  it('refuses an edge that would create a cycle', () => {
    const path = flow(
      [stage('a'), stage('b'), stage('c')],
      [
        ['a', 'b'],
        ['b', 'c'],
      ],
    );
    expect(canConnect(path, 'c', 'a')).toBe(false);
    expect(canConnect(path, 'b', 'a')).toBe(false);
  });
});

describe('connectGesture (rule 6)', () => {
  it("builds { type: 'connect', flowId, source, target } from an xyflow Connection", () => {
    expect(connectGesture('el-1', { source: 'a', target: 'b' })).toEqual({
      type: 'connect',
      flowId: 'el-1',
      source: 'a',
      target: 'b',
    });
  });

  it('returns undefined for a connection with a null source or target', () => {
    expect(connectGesture('el-1', { source: null, target: 'b' })).toBeUndefined();
    expect(connectGesture('el-1', { source: 'a', target: undefined })).toBeUndefined();
    expect(connectGesture('el-1', { source: '', target: 'b' })).toBeUndefined();
  });
});

describe('disconnectGesture (rule 7)', () => {
  it("builds { type: 'disconnect', flowId, edgeIds } from the edges about to be deleted", () => {
    expect(disconnectGesture('el-1', [{ id: 'e1' }, { id: 'e2' }])).toEqual({
      type: 'disconnect',
      flowId: 'el-1',
      edgeIds: ['e1', 'e2'],
    });
  });

  it('returns undefined when no edges are being deleted (nodes are never deleted)', () => {
    expect(disconnectGesture('el-1', [])).toBeUndefined();
  });
});
