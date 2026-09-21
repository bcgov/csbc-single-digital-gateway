import type { UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { connectionProblem } from '../src/renderers/xyflow/flow-gestures';
import { repointEdge } from '../src/studio/layout/edge-edits';
import { condition, edge, flow, row, stage } from './condition-edit-fixtures';

// Doc 209 rules 7-13 — re-pointing an edge. Pure.

const clause = { id: 'cl1', field: 'k1', operator: 'equals', value: 'a' };

/**
 * a → c(ondition) → b, with the condition's row r1 wired to b and its Else to d. Row r2 is deliberately
 * UNWIRED: rule 11 gives each branch one destination, so moving an edge onto a branch needs a free one.
 */
const base = (): UISchemaElement =>
  flow(
    [stage('a'), condition('c', [row('r1', clause), row('r2', clause)]), stage('b'), stage('d')],
    [edge('e0', 'a', 'c'), { ...edge('e1', 'c', 'b'), sourceHandle: 'r1' }, edge('e2', 'c', 'd')],
  );

const edgesOf = (uischema: UISchemaElement) =>
  (uischema.options?.['edges'] ?? []) as Record<string, unknown>[];
const edgeOf = (uischema: UISchemaElement, id: string) =>
  edgesOf(uischema).find((entry) => entry['id'] === id);

describe('repointEdge — the happy paths (rules 9, 5)', () => {
  it('moves the TARGET', () => {
    const { uischema, problem } = repointEdge(base(), 'e1', { target: 'd' });
    expect(problem).toBeUndefined();
    expect(edgeOf(uischema, 'e1')).toMatchObject({ source: 'c', target: 'd', sourceHandle: 'r1' });
  });

  it('moves the SOURCE', () => {
    const { uischema } = repointEdge(base(), 'e2', { source: 'a' });
    expect(edgeOf(uischema, 'e2')).toMatchObject({ source: 'a', target: 'd' });
  });

  it('moves which BRANCH it leaves by', () => {
    // The useful half: today the only way to do this is to delete the edge and draw a new one.
    // e2 is the Else edge; r2 has no edge of its own yet.
    const { uischema, problem } = repointEdge(base(), 'e2', { sourceHandle: 'r2' });
    expect(problem).toBeUndefined();
    expect(edgeOf(uischema, 'e2')).toMatchObject({ source: 'c', target: 'd', sourceHandle: 'r2' });
  });

  it('leaves every other edge untouched', () => {
    const { uischema } = repointEdge(base(), 'e1', { target: 'd' });
    expect(edgeOf(uischema, 'e0')).toMatchObject({ source: 'a', target: 'c' });
    expect(edgesOf(uischema)).toHaveLength(3);
  });

  it('returns the SAME uischema when nothing changes (rule 9)', () => {
    const root = base();
    expect(repointEdge(root, 'e1', { target: 'b' }).uischema).toBe(root);
    expect(repointEdge(root, 'e1', {}).uischema).toBe(root);
  });

  it('returns the SAME uischema for an edge that is not there', () => {
    const root = base();
    expect(repointEdge(root, 'nope', { target: 'd' }).uischema).toBe(root);
  });
});

describe('repointEdge drops a branch the new source cannot honour (rule 8)', () => {
  it('clears sourceHandle when the source becomes a Stage', () => {
    // A Stage has no branches, so keeping it would name a row that does not exist.
    const { uischema } = repointEdge(base(), 'e1', { source: 'a' });
    expect(edgeOf(uischema, 'e1')).toMatchObject({ source: 'a', target: 'b' });
    expect('sourceHandle' in (edgeOf(uischema, 'e1') ?? {})).toBe(false);
  });

  it('keeps sourceHandle when the source is still the same Condition', () => {
    const { uischema } = repointEdge(base(), 'e1', { target: 'd' });
    expect(edgeOf(uischema, 'e1')).toMatchObject({ sourceHandle: 'r1' });
  });
});

describe('repointEdge refuses, with a reason (rules 10-13)', () => {
  const refused = (edgeId: string, patch: object) => repointEdge(base(), edgeId, patch);

  it('refuses a SECOND edge off a branch that already leads somewhere (rule 11)', () => {
    // Row r1 already leads to b. One answer cannot go to two stages at once.
    const { uischema, problem } = refused('e2', { sourceHandle: 'r1' });
    expect(problem).toBeTruthy();
    expect(edgeOf(uischema, 'e2')).toMatchObject({ source: 'c', target: 'd' });
    expect('sourceHandle' in (edgeOf(uischema, 'e2') ?? {})).toBe(false);
  });

  it('refuses a CYCLE (rule 12)', () => {
    // c → a closes a → c → a. The edge being moved is excluded from the graph it is checked against (rule 10),
    // so this has to be a cycle among the OTHER edges — `e0` re-pointed to b → a would not be one.
    const { problem } = refused('e2', { target: 'a' });
    expect(problem).toBeTruthy();
  });

  it('refuses an edge to ITSELF (rule 13)', () => {
    expect(refused('e1', { target: 'c' }).problem).toBeTruthy();
  });

  it('leaves the document untouched on every refusal', () => {
    const root = base();
    for (const patch of [{ sourceHandle: 'r1' }, { target: 'c' }])
      expect(repointEdge(root, 'e2', patch).uischema).toBe(root);
  });
});

describe('connectionProblem replaces the boolean (rule 14)', () => {
  it('reports NOTHING for a connection that is allowed', () => {
    expect(connectionProblem(base(), 'a', 'd')).toBeUndefined();
  });

  it('reports a REASON, not just false, for each refusal', () => {
    // A boolean carried no reason, which is why the port changed shape.
    expect(typeof connectionProblem(base(), 'c', 'b', 'r1')).toBe('string');
    expect(typeof connectionProblem(base(), 'a', 'a')).toBe('string');
  });

  it('gives a DIFFERENT reason for a duplicate and for a self-edge', () => {
    expect(connectionProblem(base(), 'c', 'b', 'r1')).not.toBe(connectionProblem(base(), 'a', 'a'));
  });
});
