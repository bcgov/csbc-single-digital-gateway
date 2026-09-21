import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormStudio } from '../src/studio';
import { useXyflowJsdom } from './xyflow-jsdom';

// Doc 210 rules 16-23 — the + on an unconnected Condition output offers a new node OR an existing one.

useXyflowJsdom();

const schema: JsonSchema = {
  type: 'object',
  properties: {
    province: { type: 'string', oneOf: [{ const: 'bc', title: 'BC' }] },
    notes: { type: 'string' },
  },
};

const el = (element: object) => element as UISchemaElement;

const control = (key: string, label: string) => ({
  type: 'Control',
  scope: `#/properties/${key}`,
  label,
});

const stage = (id: string, label: string, controls: object[] = []) =>
  el({
    type: 'Stage',
    label,
    options: { id },
    elements: [
      { type: 'Form', label: `Form ${id}`, options: { id: `f-${id}` }, elements: controls },
    ],
  });

const condition = (id: string, rows: object[] = [], label = 'Route') =>
  el({ type: 'Condition', label, options: { id, rows } });

const row = (id: string) => ({
  id,
  label: `Row ${id}`,
  match: 'all',
  clauses: [{ id: `cl-${id}`, field: 'province', operator: 'equals', value: 'bc' }],
});

const flowOf = (elements: object[], edges: object[] = []) =>
  el({ type: 'Flow', elements, options: { edges, startId: 's1' } });

/** s1 → c1, c1's Else → s2 → s3. c1's row `x` is unconnected, so its + is on screen. */
const BRANCHED = flowOf(
  [
    stage('s1', 'Applicant', [control('province', 'Province')]),
    condition('c1', [row('x')]),
    stage('s2', 'Review', [control('notes', 'Notes')]),
    stage('s3', 'Decision'),
  ],
  [
    { id: 'e1', source: 's1', target: 'c1' },
    { id: 'e2', source: 'c1', target: 's2' },
    { id: 'e3', source: 's2', target: 's3' },
  ],
);

/** s1 → c1 and nothing else: every candidate for c1's row would close a cycle or be c1 itself. */
const DEAD_END = flowOf(
  [stage('s1', 'Applicant', [control('province', 'Province')]), condition('c1', [row('x')])],
  [{ id: 'e1', source: 's1', target: 'c1' }],
);

function required<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`missing ${what}`);
  return value;
}

const centre = () =>
  required(document.querySelector<HTMLElement>('[data-slot="form-studio-center-panel"]'), 'centre');
const rows = () => [
  ...centre().querySelectorAll<HTMLElement>('[data-slot="condition-criterion-row"]'),
];
const stageCount = () => centre().querySelectorAll('[data-slot="stage-card"]').length;
const edgeCount = () => document.querySelectorAll('[data-testid^="rf__edge-"]').length;

const renderStudio = (uischema: UISchemaElement) =>
  render(<FormStudio schema={schema} uischema={uischema} />);

/** The + inside the first criterion row, once xyflow has measured its node. */
const openOutputMenu = async () => {
  const first = required((await waitFor(() => rows()))[0], 'criterion row');
  const trigger = await within(first).findByRole('button', { name: 'Add a node' });
  fireEvent.click(trigger);
  await screen.findByRole('menuitem', { name: 'New stage' });
  return screen.getAllByRole('menuitem').map((item) => item.textContent);
};

describe('the output + menu (rules 16-17, 22)', () => {
  it('offers a new node and every existing node the rules permit', async () => {
    renderStudio(BRANCHED);
    const items = await openOutputMenu();
    expect(items).toEqual(['New stage', 'New condition', 'Review', 'Decision']);
  });

  it('omits the Condition itself and anything upstream of it (rules 18-19)', async () => {
    renderStudio(BRANCHED);
    const items = await openOutputMenu();
    // Applicant is upstream — an edge back to it would close a cycle; Route is the Condition itself.
    expect(items).not.toContain('Applicant');
    expect(items).not.toContain('Route');
  });

  it('shows the two new-node items alone when no candidate is legal (rule 20)', async () => {
    renderStudio(DEAD_END);
    const items = await openOutputMenu();
    expect(items).toEqual(['New stage', 'New condition']);
  });
});

describe('choosing an existing node (rule 21)', () => {
  it('connects the branch to it, adding an edge but no node, and retires the row’s +', async () => {
    renderStudio(BRANCHED);
    await waitFor(() => expect(edgeCount()).toBe(3));
    await openOutputMenu();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Decision' }));

    await waitFor(() => expect(edgeCount()).toBe(4));
    expect(stageCount()).toBe(3);
    // The output is wired now, so the card stops offering to wire it (doc 199 rule 20).
    await waitFor(() =>
      expect(
        within(required(rows()[0], 'row')).queryByRole('button', { name: 'Add a node' }),
      ).toBeNull(),
    );
  });
});

describe('choosing a new node from the output + (rules 9, 17)', () => {
  it('appends a Stage wired by the criterion, as before', async () => {
    renderStudio(BRANCHED);
    await openOutputMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'New stage' }));

    await waitFor(() => expect(stageCount()).toBe(4));
    await waitFor(() => expect(edgeCount()).toBe(4));
  });

  it('appends a Condition AND its Else Stage from the same menu (rule 9)', async () => {
    renderStudio(BRANCHED);
    await openOutputMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'New condition' }));

    // The Condition, plus the Stage on its Else output: two edges, one new Stage card.
    await waitFor(() => expect(stageCount()).toBe(4));
    await waitFor(() => expect(edgeCount()).toBe(5));
  });
});
