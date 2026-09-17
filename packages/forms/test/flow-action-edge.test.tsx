import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ACTION_EDGE_TYPE, toFlowEdges } from '../src/renderers/xyflow/flow-nodes';
import { FormStudio } from '../src/studio';
import { useXyflowJsdom } from './xyflow-jsdom';

/** A node's x on the canvas, from the transform xyflow positions it with (rule 32b: it runs left to right). */
const nodeLeft = (node: HTMLElement) =>
  Number(/translate\((?<x>[-\d.]+)px,/.exec(node.style.transform)?.groups?.['x'] ?? 0);

/** Doc 184 rule 19: entering and leaving preview are two buttons now, so one matcher finds whichever shows. */
const PREVIEW_BUTTON = /^(Preview|Exit preview)$/;

// Doc 198 rules 9-10, 16 — ActionEdge: the square + at each edge midpoint that slides open to
// "+ Add" and splits the edge in two.

useXyflowJsdom();

const schema: JsonSchema = { type: 'object', properties: {} };
const el = (element: object) => element as UISchemaElement;

const stage = (id: string, label: string) =>
  el({
    type: 'Stage',
    label,
    options: { id },
    elements: [{ type: 'Form', label: `Form ${id}`, options: { id: `f-${id}` }, elements: [] }],
  });

const flowOf = (stages: object[], pairs: [string, string][]) =>
  el({
    type: 'Flow',
    options: { edges: pairs.map(([source, target], i) => ({ id: `e${i + 1}`, source, target })) },
    elements: stages,
  });

/** a → b, one edge to split. */
const CHAIN = flowOf([stage('a', 'A'), stage('b', 'B')], [['a', 'b']]);

function required<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`missing ${what}`);
  return value;
}

const centre = () =>
  required(document.querySelector<HTMLElement>('[data-slot="form-studio-center-panel"]'), 'centre');
const nodeOf = (id: string) =>
  required(document.querySelector<HTMLElement>(`.react-flow__node[data-id="${id}"]`), `node ${id}`);
const edgeIds = () =>
  [...document.querySelectorAll('[data-testid^="rf__edge-"]')].map((edge) =>
    edge.getAttribute('data-testid'),
  );
const edgeAdds = () => [...centre().querySelectorAll<HTMLElement>('[data-slot="flow-edge-add"]')];
const stageCount = () => centre().querySelectorAll('[data-slot="stage-card"]').length;
const trail = () => screen.getByRole('navigation', { name: 'Element path' });
const currentCrumb = () => trail().querySelector('[aria-current="page"]')?.textContent ?? null;

const renderStudio = (uischema: UISchemaElement = CHAIN) =>
  render(<FormStudio schema={schema} uischema={uischema} />);

/**
 * Doc 199 rule 24: the edge + no longer splits outright — it opens a Stage|Condition menu. Base UI portals
 * that menu OUT of the canvas, so its items are found on the whole document.
 */
const chooseNode = async (trigger: HTMLElement, item: 'Stage' | 'Condition') => {
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByRole('menuitem', { name: item }));
};

describe('ActionEdge rendering (rule 9)', () => {
  it('gives every sanitised edge the ActionEdge type, keeping the arrow at its target', () => {
    const edges = toFlowEdges(CHAIN);
    expect(edges).toHaveLength(1);
    expect(edges[0]?.type).toBe(ACTION_EDGE_TYPE);
    expect(edges[0]?.markerEnd).toEqual({ type: 'arrowclosed' });
  });

  it('keeps EDGE_TYPES a module-level constant so xyflow does not re-create edges each render', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../src/renderers/xyflow/flow-renderer.tsx'),
      'utf8',
    );
    // Same reason as NODE_TYPES: a fresh object each render makes xyflow warn and rebuild every edge.
    expect(source).toMatch(/^const EDGE_TYPES: EdgeTypes = \{/m);
  });

  it('renders one + per sanitised edge', async () => {
    renderStudio(
      flowOf(
        [stage('a', 'A'), stage('b', 'B'), stage('c', 'C')],
        [
          ['a', 'b'],
          ['b', 'c'],
        ],
      ),
    );
    await waitFor(() => expect(edgeAdds()).toHaveLength(2));
  });

  it('renders the + square at rest and widens it on hover and on keyboard focus', async () => {
    renderStudio();
    await waitFor(() => expect(edgeAdds()).toHaveLength(1));
    const add = required(edgeAdds()[0], 'edge +');
    // Square at rest; jsdom applies no CSS, so the responsive classes are what can be pinned here.
    expect(add).toHaveClass('h-6', 'w-6');
    expect(add).toHaveClass('hover:w-[4.25rem]', 'focus-visible:w-[4.25rem]');
  });

  it('hides the word "Add" until hover or focus', async () => {
    renderStudio();
    await waitFor(() => expect(edgeAdds()).toHaveLength(1));
    const label = required(within(required(edgeAdds()[0], 'edge +')).getByText('Add'), 'Add label');
    expect(label).toHaveClass('opacity-0');
    expect(label).toHaveClass('group-hover/add:opacity-100', 'group-focus-visible/add:opacity-100');
  });

  it('keeps the + out of the pane gestures (rule 15)', async () => {
    renderStudio();
    await waitFor(() => expect(edgeAdds()).toHaveLength(1));
    expect(required(edgeAdds()[0], 'edge +')).toHaveClass('nodrag', 'nopan', 'pointer-events-auto');
  });

  it('renders no + while previewing', async () => {
    renderStudio();
    await waitFor(() => expect(edgeAdds()).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: PREVIEW_BUTTON }));
    await waitFor(() => expect(centre().querySelector('.react-flow')).toBeNull());
    expect(edgeAdds()).toHaveLength(0);
  });
});

describe('insert-between splits the edge (rules 10, 16)', () => {
  it('inserts a Stage between the two the edge joins, preserving the upstream edge id', async () => {
    renderStudio();
    await waitFor(() => expect(edgeIds()).toEqual(['rf__edge-e1']));
    await chooseNode(required(edgeAdds()[0], 'edge +'), 'Stage');

    await waitFor(() => expect(stageCount()).toBe(3));
    await waitFor(() => expect(edgeIds()).toHaveLength(2));
    // The upstream half keeps its identity across the split; the downstream half is new.
    expect(edgeIds()).toContain('rf__edge-e1');
  });

  it('never orphans the downstream Stage — it keeps exactly one leaf', async () => {
    renderStudio();
    await waitFor(() => expect(edgeIds()).toEqual(['rf__edge-e1']));
    await chooseNode(required(edgeAdds()[0], 'edge +'), 'Stage');

    await waitFor(() => expect(stageCount()).toBe(3));
    // B is still downstream of the new Stage, so it is the only leaf.
    await waitFor(() =>
      expect(centre().querySelectorAll('[data-slot="flow-leaf-add"]')).toHaveLength(1),
    );
    expect(nodeOf('b').querySelector('[data-slot="flow-leaf-add"]')).not.toBeNull();
  });

  it('re-ranks the chain so the new Stage sits between the two', async () => {
    renderStudio();
    await waitFor(() => expect(edgeIds()).toEqual(['rf__edge-e1']));
    await chooseNode(required(edgeAdds()[0], 'edge +'), 'Stage');
    await waitFor(() => expect(stageCount()).toBe(3));

    // Positions are ELK's and arrive asynchronously (doc 198 rule 30): a stays first, and b is pushed past the
    // inserted Stage once the layout lands (rule 32b: the flow runs left to right).
    const leftOf = (id: string) => nodeLeft(nodeOf(id));
    const insertedLeft = () =>
      nodeLeft(
        required(
          [...document.querySelectorAll<HTMLElement>('.react-flow__node')].at(-1),
          'inserted',
        ),
      );
    await waitFor(() => expect(leftOf('b')).toBeGreaterThan(leftOf('a')));
    await waitFor(() => expect(insertedLeft()).toBeGreaterThan(leftOf('a')));
    expect(leftOf('b')).toBeGreaterThan(insertedLeft());
  });

  it('selects the inserted Stage (rule 16)', async () => {
    renderStudio();
    await waitFor(() => expect(edgeIds()).toEqual(['rf__edge-e1']));
    await chooseNode(required(edgeAdds()[0], 'edge +'), 'Stage');

    await waitFor(() => expect(currentCrumb()).toBe('Stage 1'));
  });

  it('shows no Flow problem after a split — it cannot create a cycle', async () => {
    renderStudio();
    await waitFor(() => expect(edgeIds()).toEqual(['rf__edge-e1']));
    await chooseNode(required(edgeAdds()[0], 'edge +'), 'Stage');

    await waitFor(() => expect(stageCount()).toBe(3));
    expect(centre().querySelector('[data-slot="flow-element-error"]')).toBeNull();
  });
});
