import type { UISchemaElement } from '@jsonforms/core';
import ELK from 'elkjs/lib/elk.bundled.js';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ALGORITHM,
  elkGraph,
  heightOf,
  isLayoutAlgorithm,
  LAYOUT_ALGORITHMS,
  NODE_WIDTH,
  readElkLayout,
  type LayoutOptions,
} from '../src/renderers/xyflow/flow-elk';
import { FLOW_TEMPLATE_UISCHEMA } from '../src/studio/document/flow-sample';

// Doc 198 rules 30-33 — the graph ELK is given, and what the canvas reads back from it.

const stage = (id: string, forms = 0) =>
  ({
    type: 'Stage',
    options: { id },
    elements: Array.from({ length: forms }, () => ({ type: 'Form', elements: [] })),
  }) as UISchemaElement;
const condition = (id: string, criteria = 0) =>
  ({
    type: 'Condition',
    elements: [],
    options: {
      id,
      criteria: Array.from({ length: criteria }, (_, index) => ({
        id: `c${index}`,
        field: 'f',
        operator: 'isTrue',
      })),
    },
  }) as UISchemaElement;
const flow = (elements: UISchemaElement[], pairs: readonly (readonly [string, string])[] = []) =>
  ({
    type: 'Flow',
    elements,
    options: { edges: pairs.map(([source, target], i) => ({ id: `e${i}`, source, target })) },
  }) as UISchemaElement;

const VERTICAL: LayoutOptions = { algorithm: 'layered', direction: 'vertical' };
const layout = async (uischema: UISchemaElement, options: LayoutOptions = VERTICAL) =>
  readElkLayout(await new ELK().layout(elkGraph(uischema, options)));

describe('the graph ELK is given (rule 30)', () => {
  it('sizes a node from what it holds, so a taller card is not overlapped', () => {
    // A Stage grows by its Forms and a Condition by its criteria; the width is one card.
    expect(heightOf(stage('a', 3), 'stage')).toBeGreaterThan(heightOf(stage('a', 1), 'stage'));
    expect(heightOf(condition('c', 2), 'condition')).toBeGreaterThan(
      heightOf(condition('c', 1), 'condition'),
    );
    const graph = elkGraph(flow([stage('a', 1)]), VERTICAL);
    expect(graph.children?.[0]).toMatchObject({ id: 'a', width: NODE_WIDTH });
  });

  it('turns the flow with elk.direction, and carries the chosen algorithm (rules 31-32)', () => {
    expect(elkGraph(flow([stage('a')]), VERTICAL).layoutOptions).toMatchObject({
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.edgeRouting': 'ORTHOGONAL',
      // Rule 34: ELK's 10px defaults ran a passing edge along the side of a card.
      'elk.spacing.edgeNode': '40',
      'elk.layered.spacing.edgeNodeBetweenLayers': '40',
    });
    expect(
      elkGraph(flow([stage('a')]), { algorithm: 'mrtree', direction: 'horizontal' }).layoutOptions,
    ).toMatchObject({ 'elk.algorithm': 'mrtree', 'elk.direction': 'RIGHT' });
  });

  it('offers only algorithms it will accept, with Layered the default (rule 31)', () => {
    expect(LAYOUT_ALGORITHMS.map(({ id }) => id)).toContain(DEFAULT_ALGORITHM);
    expect(isLayoutAlgorithm('layered')).toBe(true);
    expect(isLayoutAlgorithm('nonsense')).toBe(false);
  });

  it('gives ELK only the SANITISED edges', () => {
    const graph = elkGraph(
      {
        type: 'Flow',
        elements: [stage('a'), stage('b')],
        options: {
          edges: [
            { id: 'keep', source: 'a', target: 'b' },
            { id: 'gone', source: 'a', target: 'missing' },
            { id: 'self', source: 'b', target: 'b' },
          ],
        },
      } as UISchemaElement,
      VERTICAL,
    );
    expect(graph.edges?.map((edge) => edge.id)).toEqual(['keep']);
  });
});

describe('what the canvas reads back (rules 30, 33)', () => {
  it('ranks a chain down the canvas, and across when horizontal (rule 32)', async () => {
    const chain = flow([stage('a'), stage('b')], [['a', 'b']]);
    const down = await layout(chain);
    expect(down.positions.get('b')?.y).toBeGreaterThan(down.positions.get('a')?.y ?? 0);

    const across = await layout(chain, { algorithm: 'layered', direction: 'horizontal' });
    expect(across.positions.get('b')?.x).toBeGreaterThan(across.positions.get('a')?.x ?? 0);
    expect(across.positions.get('b')?.y).toBe(across.positions.get('a')?.y);
  });

  it('routes an edge that passes a node clear of it (rule 33)', async () => {
    // c → b → end and c → end: the second edge passes the rank holding b.
    const { positions, routes } = await layout(
      flow(
        [condition('c'), stage('b'), stage('end')],
        [
          ['c', 'b'],
          ['b', 'end'],
          ['c', 'end'],
        ],
      ),
    );
    const card = positions.get('b');
    const height = heightOf(stage('b'), 'stage');
    for (const { x, y } of routes.get('e2') ?? []) {
      const insideColumn = x > (card?.x ?? 0) && x < (card?.x ?? 0) + NODE_WIDTH;
      const level = y > (card?.y ?? 0) && y < (card?.y ?? 0) + height;
      expect(insideColumn && level).toBe(false);
    }
  });

  it('places every node of the Multi-Stage Template, branches level and the merge below them', async () => {
    const { positions } = await layout(FLOW_TEMPLATE_UISCHEMA as unknown as UISchemaElement);
    const at = (id: string) => positions.get(id) ?? { x: 0, y: 0 };
    expect(positions.size).toBe(8);
    expect(at('Bn6vT1sA').y).toBeGreaterThan(at('Sx4nD9pW').y);
    // Business and Individual share a rank; Supporting information is below both.
    expect(at('Kt7mB2vR').y).toBe(at('Jd5yH8nF').y);
    expect(at('Zc5hJ8qL').y).toBeGreaterThan(at('Kt7mB2vR').y);
  });
});

describe('edges keep clear of the cards they pass (rule 34)', () => {
  it('leaves a gap between a passing edge and the card beside it', async () => {
    // c → b → end and c → end: the long edge passes the rank holding b.
    const { positions, routes } = await layout(
      flow(
        [condition('c'), stage('b'), stage('end')],
        [
          ['c', 'b'],
          ['b', 'end'],
          ['c', 'end'],
        ],
      ),
    );
    const card = positions.get('b') ?? { x: 0, y: 0 };
    const gaps = (routes.get('e2') ?? []).map(({ x }) =>
      Math.min(Math.abs(x - card.x), Math.abs(x - (card.x + NODE_WIDTH))),
    );
    // Every bend is at least the configured clearance away from the card's near edge.
    for (const gap of gaps) expect(gap).toBeGreaterThanOrEqual(24);
  });
});
