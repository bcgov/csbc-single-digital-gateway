import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers-default';
import * as xyflow from '../src/renderers-xyflow';
import { DEFAULT_HANDLE, drawnNodes } from '../src/renderers/xyflow/flow-elements';
import {
  CONDITION_NODE_TYPE,
  STAGE_NODE_TYPE,
  toFlowEdges,
  toFlowNodes,
} from '../src/renderers/xyflow/flow-nodes';
import { useXyflowJsdom } from './xyflow-jsdom';

// Doc 199 rules 16-23 — drawing a Condition: a second node type, one source handle per output, and
// the card that lists the criteria.

useXyflowJsdom();

const schema: JsonSchema = { type: 'object', properties: {} };
const el = (element: object) => element as UISchemaElement;

const criterion = (id: string, patch: object = {}) => ({
  id,
  field: 'k1',
  operator: 'equals',
  value: 'x',
  ...patch,
});
const stage = (id: string, label = id.toUpperCase()) =>
  el({ type: 'Stage', label, options: { id }, elements: [] });
const condition = (id: string, criteria: object[] = [], label?: string) =>
  el({
    type: 'Condition',
    ...(label === undefined ? {} : { label }),
    options: { id, criteria },
  });
const flow = (elements: object[], edges: object[] = []) =>
  el({ type: 'Flow', elements, options: { edges } });

const renderFlow = (uischema: UISchemaElement) =>
  render(
    <div style={{ width: '800px', height: '600px' }}>
      <JsonForms
        schema={schema}
        uischema={uischema}
        data={{}}
        renderers={[...xyflow.layoutRenderers]}
        cells={[]}
      />
    </div>,
  );

const nodeOf = (container: HTMLElement, id: string) => {
  const node = container.querySelector<HTMLElement>(`.react-flow__node[data-id="${id}"]`);
  if (!node) throw new Error(`missing node ${id}`);
  return node;
};
const handlesOf = (node: HTMLElement) => [...node.querySelectorAll('.react-flow__handle')];

describe('drawnNodes (rule 16)', () => {
  it('returns Stages and Conditions together, in elements order, each with its kind', () => {
    const root = flow([stage('a'), condition('c'), stage('b')]);
    expect(drawnNodes(root).map(({ id, kind }) => [id, kind])).toEqual([
      ['a', 'stage'],
      ['c', 'condition'],
      ['b', 'stage'],
    ]);
  });

  it('gives a Condition a placeholder id when it has no authored one, like a Stage', () => {
    const root = flow([stage('a'), el({ type: 'Condition', options: { criteria: [] } })]);
    expect(drawnNodes(root).map(({ id, authored }) => [id, authored])).toEqual([
      ['a', true],
      ['__stage-1', false],
    ]);
  });

  it('draws one node per Flow child, with the right xyflow type', () => {
    const nodes = toFlowNodes(flow([stage('a'), condition('c')]));
    expect(nodes.map(({ id, type }) => [id, type])).toEqual([
      ['a', STAGE_NODE_TYPE],
      ['c', CONDITION_NODE_TYPE],
    ]);
  });

  it('ranks a Condition in the vertical layout exactly as a Stage (doc 198 rules 1-2)', () => {
    const root = flow(
      [stage('a'), condition('c'), stage('b')],
      [
        { id: 'e1', source: 'a', target: 'c' },
        { id: 'e2', source: 'c', target: 'b' },
      ],
    );
    expect(toFlowNodes(root).map(({ id, position }) => [id, position.y])).toEqual([
      ['a', 0],
      ['c', 240],
      ['b', 480],
    ]);
  });

  it('never marks a Condition as a leaf (rule 14)', () => {
    const nodes = toFlowNodes(flow([stage('a'), condition('c')]));
    expect(nodes.find(({ id }) => id === 'a')?.data).toMatchObject({ isLeaf: true });
    expect(nodes.find(({ id }) => id === 'c')?.data).not.toHaveProperty('isLeaf');
  });
});

describe('the Condition node (rules 17-18)', () => {
  it('registers CONDITION_NODE_TYPE in the module-level NODE_TYPES constant', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../src/renderers/xyflow/flow-renderer.tsx'),
      'utf8',
    );
    expect(source).toMatch(/^const NODE_TYPES: NodeTypes = \{/m);
    expect(source).toContain('[CONDITION_NODE_TYPE]: ConditionNode');
  });

  it('renders one target handle on top', () => {
    const { container } = renderFlow(flow([condition('c', [criterion('x')])]));
    const targets = handlesOf(nodeOf(container, 'c')).filter((handle) =>
      handle.classList.contains('target'),
    );
    expect(targets).toHaveLength(1);
    expect(targets[0]).toHaveClass('react-flow__handle-top');
  });

  it('renders one bottom source handle per criterion, each with the criterion id', () => {
    const { container } = renderFlow(
      flow([condition('c', [criterion('x'), criterion('y', { field: 'k2' })])]),
    );
    const sources = handlesOf(nodeOf(container, 'c')).filter((handle) =>
      handle.classList.contains('source'),
    );
    // Two criteria plus the default.
    expect(sources).toHaveLength(3);
    for (const handle of sources) expect(handle).toHaveClass('react-flow__handle-bottom');
    expect(sources.map((handle) => handle.getAttribute('data-handleid'))).toEqual([
      'x',
      'y',
      DEFAULT_HANDLE,
    ]);
  });

  it('renders a bottom source handle for the default path, last and marked', () => {
    const { container } = renderFlow(flow([condition('c', [criterion('x')])]));
    const node = nodeOf(container, 'c');
    const outputs = handlesOf(node).filter((handle) => handle.classList.contains('source'));
    expect(outputs.at(-1)).toHaveAttribute('data-handleid', DEFAULT_HANDLE);
    expect(outputs.at(-1)).toHaveAttribute('data-output', 'default');
    expect(outputs[0]).toHaveAttribute('data-output', 'criterion');
  });

  it('gives a Condition with no criteria just the default output', () => {
    const { container } = renderFlow(flow([condition('c')]));
    const sources = handlesOf(nodeOf(container, 'c')).filter((handle) =>
      handle.classList.contains('source'),
    );
    expect(sources).toHaveLength(1);
    expect(sources[0]).toHaveAttribute('data-handleid', DEFAULT_HANDLE);
  });

  it('translates an absent sourceHandle into the default handle so an edge attaches to it', () => {
    const root = flow(
      [condition('c', [criterion('x')]), stage('b')],
      [
        { id: 'e1', source: 'c', target: 'b', sourceHandle: 'x' },
        { id: 'e2', source: 'c', target: 'b' },
      ],
    );
    expect(toFlowEdges(root).map(({ id, sourceHandle }) => [id, sourceHandle])).toEqual([
      ['e1', 'x'],
      ['e2', DEFAULT_HANDLE],
    ]);
  });

  it('wraps the dispatched Condition in a pointer-events-auto element (doc 195 rule 15b)', () => {
    const { container } = renderFlow(flow([condition('c', [criterion('x')])]));
    const wrapper = nodeOf(container, 'c').querySelector(':scope > [data-slot="condition-node"]');
    expect(wrapper).toHaveClass('pointer-events-auto');
    expect(wrapper?.querySelector('[data-slot="condition-card"]')).not.toBeNull();
  });
});

describe('the Condition card (rule 19)', () => {
  it('shows the label, a row per criterion and the default row', () => {
    const { container } = renderFlow(
      flow([condition('c', [criterion('x'), criterion('y')], 'Route by province')]),
    );
    const card = nodeOf(container, 'c');
    expect(card.querySelector('[data-slot="condition-label"]')).toHaveTextContent(
      'Route by province',
    );
    expect(card.querySelectorAll('[data-slot="condition-criterion-row"]')).toHaveLength(2);
    expect(card.querySelector('[data-slot="condition-default-row"]')).toHaveTextContent(
      'Otherwise',
    );
  });

  it('falls back to "Condition" when the node has no label', () => {
    const { container } = renderFlow(flow([condition('c')]));
    expect(nodeOf(container, 'c').querySelector('[data-slot="condition-label"]')).toHaveTextContent(
      /^Condition$/,
    );
  });

  it('reads each row as <field> <operator> <value>', () => {
    const { container } = renderFlow(
      flow([condition('c', [criterion('x', { field: 'k9', operator: 'gt', value: 3 })])]),
    );
    expect(
      nodeOf(container, 'c').querySelector('[data-slot="condition-criterion-row"]'),
    ).toHaveTextContent('k9 gt 3');
  });

  it('omits the value from a row whose operator needs none', () => {
    const { container } = renderFlow(
      flow([condition('c', [{ id: 'x', field: 'k1', operator: 'isEmpty' }])]),
    );
    expect(
      nodeOf(container, 'c').querySelector('[data-slot="condition-criterion-row"]'),
    ).toHaveTextContent(/^k1 isEmpty$/);
  });

  it('shows the default row even with no criteria at all', () => {
    const { container } = renderFlow(flow([condition('c')]));
    const card = nodeOf(container, 'c');
    expect(card.querySelectorAll('[data-slot="condition-criterion-row"]')).toHaveLength(0);
    expect(card.querySelector('[data-slot="condition-default-row"]')).not.toBeNull();
  });

  it('skips an entry that is not a criterion rather than drawing a broken row', () => {
    // `null` is deliberately in this list - criteriaOf must tolerate it - so the array is widened
    // rather than typed as object[].
    const entries: unknown[] = [criterion('x'), { field: 'k1' }, null, criterion('x')];
    const { container } = renderFlow(flow([condition('c', entries as object[])]));
    // No id, not a record, and a repeated id are all skipped by criteriaOf.
    expect(
      nodeOf(container, 'c').querySelectorAll('[data-slot="condition-criterion-row"]'),
    ).toHaveLength(1);
  });
});

describe('placement (rules 21-23)', () => {
  it('renders a placement error for a Condition outside a Flow', () => {
    renderFlow(condition('c', [criterion('x')]));
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('A Condition can only be placed in a Flow.');
    expect(alert).toHaveAttribute('data-slot', 'condition-placement-error');
  });

  it('accepts a Condition as a Flow child without the stray-element alert', async () => {
    const { container } = renderFlow(flow([stage('a'), condition('c')]));
    await waitFor(() => expect(container.querySelectorAll('.react-flow__node')).toHaveLength(2));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('still flags a genuinely stray child, naming both node kinds (rule 22)', () => {
    renderFlow(flow([condition('c'), { type: 'Heading', text: 'Stray' }]));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Only Stages and Conditions can be placed in a Flow.',
    );
  });

  it('leaves renderers/default untouched: no Condition entry, and the Flow still refuses (rule 23)', () => {
    expect(defaults.layoutRenderers).toHaveLength(6);
    const matching = defaults.layoutRenderers.filter(
      (entry) =>
        entry.tester({ type: 'Condition' }, schema, { rootSchema: schema, config: {} }) > 0,
    );
    expect(matching).toEqual([]);
  });
});
