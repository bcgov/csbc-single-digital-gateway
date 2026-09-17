import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormStudio } from '../src/studio';
import { useXyflowJsdom } from './xyflow-jsdom';

/** Doc 184 rule 19: entering and leaving preview are two buttons now, so one matcher finds whichever shows. */
const PREVIEW_BUTTON = /^(Preview|Exit preview)$/;

// Doc 198 rules 6-8, 12-15 — the on-canvas add affordances: a dangling + under every leaf, an origin
// + for an empty Flow, and a "+ Add form" row on every Stage card.

useXyflowJsdom();

const schema: JsonSchema = { type: 'object', properties: {} };
const el = (element: object) => element as UISchemaElement;

const stage = (id: string, label: string, forms: string[] = ['Form']) =>
  el({
    type: 'Stage',
    label,
    options: { id },
    elements: forms.map((name) => ({
      type: 'Form',
      label: name,
      options: { id: `f-${name}` },
      elements: [],
    })),
  });

const flowOf = (stages: object[], pairs: [string, string][] = []) =>
  el({
    type: 'Flow',
    options: { edges: pairs.map(([source, target], i) => ({ id: `e${i}`, source, target })) },
    elements: stages,
  });

/** s1 → s2, so s2 is the only leaf. */
const FLOW = flowOf(
  [stage('s1', 'Applicant', ['Contact']), stage('s2', 'Review', ['Decision'])],
  [['s1', 's2']],
);

function required<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`missing ${what}`);
  return value;
}

const centre = () =>
  required(document.querySelector<HTMLElement>('[data-slot="form-studio-center-panel"]'), 'centre');
const nodeOf = (id: string) =>
  required(document.querySelector<HTMLElement>(`.react-flow__node[data-id="${id}"]`), `node ${id}`);
/**
 * TEST TRAP: xyflow keeps a node hidden until it has been measured, and test/xyflow-jsdom reports through an
 * ASYNCHRONOUS ResizeObserver, so a node's buttons are in the DOM but not yet in the accessibility tree. `getByRole`
 * honours that and finds nothing; `querySelector` does not, which is why the presence assertions pass either way.
 * Always reach a node's controls through this.
 */
const buttonIn = (stageId: string, name: string) =>
  within(nodeOf(stageId)).findByRole('button', { name });
/**
 * Doc 199 rule 24: a leaf or edge + no longer appends outright — it opens a Stage|Condition menu. Base UI
 * portals that menu OUT of the canvas, so its items are found on the whole document, never within the node.
 */
const chooseNode = async (trigger: HTMLElement, item: 'Stage' | 'Condition') => {
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByRole('menuitem', { name: item }));
};
const leafAdds = () => [...centre().querySelectorAll('[data-slot="flow-leaf-add"]')];
const stageCount = () => centre().querySelectorAll('[data-slot="stage-card"]').length;
const edgeCount = () => document.querySelectorAll('[data-testid^="rf__edge-"]').length;
const trail = () => screen.getByRole('navigation', { name: 'Element path' });
const currentCrumb = () => trail().querySelector('[aria-current="page"]')?.textContent ?? null;

const renderStudio = (uischema: UISchemaElement = FLOW) =>
  render(<FormStudio schema={schema} uischema={uischema} />);

describe('leaf add affordance (rules 6-8)', () => {
  it('renders a dangling + under the leaf Stage only, not under an upstream one', () => {
    renderStudio();
    expect(nodeOf('s2').querySelector('[data-slot="flow-leaf-add"]')).not.toBeNull();
    expect(nodeOf('s1').querySelector('[data-slot="flow-leaf-add"]')).toBeNull();
    expect(leafAdds()).toHaveLength(1);
  });

  it('renders a dangling + under EVERY leaf when the Flow branches', () => {
    renderStudio(
      flowOf(
        [stage('s1', 'Start'), stage('s2', 'Left'), stage('s3', 'Right')],
        [
          ['s1', 's2'],
          ['s1', 's3'],
        ],
      ),
    );
    expect(leafAdds()).toHaveLength(2);
    expect(nodeOf('s2').querySelector('[data-slot="flow-leaf-add"]')).not.toBeNull();
    expect(nodeOf('s3').querySelector('[data-slot="flow-leaf-add"]')).not.toBeNull();
    expect(nodeOf('s1').querySelector('[data-slot="flow-leaf-add"]')).toBeNull();
  });

  it('appends "Stage <n>" holding one "Form <m>" and an edge from the leaf, then selects it', async () => {
    renderStudio();
    await waitFor(() => expect(edgeCount()).toBe(1));
    await chooseNode(await buttonIn('s2', 'Add a node'), 'Stage');

    await waitFor(() => expect(stageCount()).toBe(3));
    await waitFor(() => expect(edgeCount()).toBe(2));
    expect(currentCrumb()).toBe('Stage 1');
    const added = required(
      [...centre().querySelectorAll('[data-slot="stage-card"]')].at(-1),
      'added card',
    );
    expect(added.querySelector('[data-slot="stage-label"]')).toHaveTextContent('Stage 1');
    expect(added.querySelector('[data-slot="stage-form-row"]')).toHaveTextContent('Form 1');
  });

  it('places the appended Stage one rank below the leaf, with no authored position', async () => {
    renderStudio();
    await chooseNode(await buttonIn('s2', 'Add a node'), 'Stage');
    await waitFor(() => expect(stageCount()).toBe(3));

    // Ranks are derived (rules 1-2): s1 = 0, s2 = 1, the new Stage = 2 → y = 2 × 240, x = 0.
    const added = required(
      [...document.querySelectorAll<HTMLElement>('.react-flow__node')].at(-1),
      'added node',
    );
    expect(added.style.transform).toMatch(/^translate\(0px,\s?480px\)$/);
  });

  it('moves the + to the new leaf, leaving the old leaf without one', async () => {
    renderStudio();
    await chooseNode(await buttonIn('s2', 'Add a node'), 'Stage');
    await waitFor(() => expect(stageCount()).toBe(3));
    await waitFor(() => expect(leafAdds()).toHaveLength(1));
    expect(nodeOf('s2').querySelector('[data-slot="flow-leaf-add"]')).toBeNull();
  });
});

describe('empty Flow origin affordance (rule 12)', () => {
  const EMPTY = el({ type: 'Flow', elements: [] });

  it('shows "Add a stage to get started." and an origin +', () => {
    renderStudio(EMPTY);
    const empty = required(centre().querySelector('[data-slot="flow-empty"]'), 'empty hint');
    expect(empty).toHaveTextContent('Add a stage to get started.');
    // The message must not send the author to the palette: it is unreachable from a Flow (rule 17).
    expect(empty).not.toHaveTextContent('palette');
    expect(within(centre()).getByRole('button', { name: 'Add a stage' })).toBeInTheDocument();
  });

  it('appends an unconnected first Stage, then drops the origin +', async () => {
    renderStudio(EMPTY);
    fireEvent.click(within(centre()).getByRole('button', { name: 'Add a stage' }));

    await waitFor(() => expect(stageCount()).toBe(1));
    expect(currentCrumb()).toBe('Stage 1');
    expect(centre().querySelector('[data-slot="flow-empty"]')).toBeNull();
    expect(edgeCount()).toBe(0);
    // The one Stage is now a leaf, so it carries the dangling + instead.
    expect(leafAdds()).toHaveLength(1);
  });
});

describe('Stage card "+ Add form" row (rule 13)', () => {
  it('renders the add-form row on every Stage card under an editor', () => {
    renderStudio();
    expect(centre().querySelectorAll('[data-slot="stage-add-form"]')).toHaveLength(2);
  });

  it('renders the add-form row on a Stage showing "No forms"', () => {
    renderStudio(flowOf([stage('s1', 'Empty stage', [])]));
    const card = required(centre().querySelector('[data-slot="stage-card"]'), 'card');
    expect(card.querySelector('[data-slot="stage-empty"]')).toHaveTextContent('No forms');
    expect(card.querySelector('[data-slot="stage-add-form"]')).not.toBeNull();
  });

  it('appends "Form <n>" to that Stage and drills into it', async () => {
    renderStudio();
    fireEvent.click(await buttonIn('s2', 'Add form'));

    await waitFor(() => expect(currentCrumb()).toBe('Form 1'));
    // Drilled in: the canvas shows the Form, not the Flow.
    expect(centre().querySelector('.react-flow')).toBeNull();
  });
});

describe('view-only and gesture safety (rules 14-15)', () => {
  it('gives the canvas + affordances the nodrag and nopan classes', async () => {
    renderStudio();
    expect(await buttonIn('s2', 'Add a node')).toHaveClass(
      'nodrag',
      'nopan',
      'pointer-events-auto',
    );
  });

  it('gives the add-form row the same nodrag row-control classes as Open and Delete', async () => {
    renderStudio();
    // The row sits inside a node, where the pane never pans — it matches the neighbouring row controls.
    expect(await buttonIn('s2', 'Add form')).toHaveClass('nodrag', 'pointer-events-auto');
  });

  it('renders no + affordance while previewing', async () => {
    renderStudio();
    fireEvent.click(screen.getByRole('button', { name: PREVIEW_BUTTON }));
    await waitFor(() => expect(centre().querySelector('.react-flow')).toBeNull());
    expect(centre().querySelector('[data-slot="flow-leaf-add"]')).toBeNull();
    expect(centre().querySelector('[data-slot="stage-add-form"]')).toBeNull();
  });
});
