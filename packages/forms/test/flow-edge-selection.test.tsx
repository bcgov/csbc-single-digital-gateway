import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormStudio } from '../src/studio';
import { useXyflowJsdom } from './xyflow-jsdom';

// Doc 209 rules 1-8, 14-18 — selecting an edge, and re-pointing it from the inspector.

useXyflowJsdom();

const el = (element: object) => element as UISchemaElement;
const schema: JsonSchema = { type: 'object', properties: { province: { type: 'string' } } };

const stage = (id: string, label: string) =>
  el({
    type: 'Stage',
    label,
    options: { id },
    elements: [{ type: 'Form', label: `Form ${id}`, options: { id: `f-${id}` }, elements: [] }],
  });

/** s1 → s2, one plain edge — the simplest thing that can be selected. */
const CHAIN = el({
  type: 'Flow',
  options: { startId: 's1', edges: [{ id: 'e1', source: 's1', target: 's2' }] },
  elements: [stage('s1', 'Applicant'), stage('s2', 'Review')],
});

const renderStudio = (uischema: UISchemaElement, props: object = {}) =>
  render(<FormStudio schema={schema} uischema={uischema} {...props} />);

const inspector = () => {
  const node = document.querySelector<HTMLElement>('[data-studio-inspector]');
  if (!node) throw new Error('no inspector');
  return within(node);
};
const edgePanel = () => document.querySelector<HTMLElement>('[data-slot="edge-inspector"]');
/**
 * TEST TRAP: the edge panel names every node in its pickers, so a document-wide `findByText('Applicant')`
 * matches the canvas card AND an `<option>` once an edge is selected — and `findBy` then retries to a timeout
 * rather than failing. Canvas queries are scoped, exactly as the studio's other tests scope theirs.
 */
const onCanvas = () => {
  const node = document.querySelector<HTMLElement>('[data-slot="form-studio-center-panel"]');
  if (!node) throw new Error('no canvas');
  return within(node);
};
const selectEdge = async (id: string) => {
  const edge = await waitFor(() => {
    const found = document.querySelector<HTMLElement>(`.react-flow__edge[data-id="${id}"]`);
    if (!found) throw new Error(`missing edge ${id}`);
    return found;
  });
  fireEvent.click(edge);
};

describe('selecting an edge (rules 1-4)', () => {
  it('shows the EDGE panel in the inspector', async () => {
    renderStudio(CHAIN);
    await selectEdge('e1');
    await waitFor(() => expect(edgePanel()).toBeInTheDocument());
  });

  it('deselects any element, so at most one thing is selected (rule 1)', async () => {
    renderStudio(CHAIN);
    const card = await onCanvas().findByText('Applicant');
    fireEvent.pointerDown(card);
    fireEvent.pointerUp(document);
    expect(inspector().getByText('Applicant')).toBeInTheDocument();

    await selectEdge('e1');
    await waitFor(() => expect(edgePanel()).toBeInTheDocument());
    // The element panel is gone: the two selections are mutually exclusive.
    expect(inspector().queryByText('Stage')).toBeNull();
  });

  it('clears the edge selection when a node is selected again', async () => {
    renderStudio(CHAIN);
    await selectEdge('e1');
    await waitFor(() => expect(edgePanel()).toBeInTheDocument());

    const card = await onCanvas().findByText('Applicant');
    fireEvent.pointerDown(card);
    fireEvent.pointerUp(document);
    await waitFor(() => expect(edgePanel()).toBeNull());
  });

  it('clears the edge selection on Escape (rule 3)', async () => {
    renderStudio(CHAIN);
    await selectEdge('e1');
    await waitFor(() => expect(edgePanel()).toBeInTheDocument());
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(edgePanel()).toBeNull());
  });
});

describe('the edge panel (rules 5-8)', () => {
  it('offers Source and Target, naming what the edge connects', async () => {
    renderStudio(CHAIN);
    await selectEdge('e1');
    await waitFor(() => expect(edgePanel()).toBeInTheDocument());
    const panel = within(edgePanel()!);
    expect(panel.getByRole('combobox', { name: /^Source/ })).toHaveValue('s1');
    expect(panel.getByRole('combobox', { name: /^Target/ })).toHaveValue('s2');
  });

  it('offers NO branch picker when the source is a Stage (rule 5)', async () => {
    renderStudio(CHAIN);
    await selectEdge('e1');
    await waitFor(() => expect(edgePanel()).toBeInTheDocument());
    expect(within(edgePanel()!).queryByRole('combobox', { name: /branch/i })).toBeNull();
  });

  it('re-points the edge when Target changes', async () => {
    renderStudio(
      el({
        type: 'Flow',
        options: { startId: 's1', edges: [{ id: 'e1', source: 's1', target: 's2' }] },
        elements: [stage('s1', 'Applicant'), stage('s2', 'Review'), stage('s3', 'Done')],
      }),
    );
    await selectEdge('e1');
    await waitFor(() => expect(edgePanel()).toBeInTheDocument());
    const target = within(edgePanel()!).getByRole('combobox', { name: /^Target/ });
    fireEvent.change(target, { target: { value: 's3' } });
    await waitFor(() => expect(target).toHaveValue('s3'));
  });
});

describe('a refused edit says why (rules 14-18)', () => {
  it('reports the reason through onNotice, and leaves the edge alone', async () => {
    const notices: string[] = [];
    renderStudio(CHAIN, { onNotice: (message: string) => notices.push(message) });
    await selectEdge('e1');
    await waitFor(() => expect(edgePanel()).toBeInTheDocument());

    // s1 → s1 is an edge to itself (rule 13).
    const target = within(edgePanel()!).getByRole('combobox', { name: /^Target/ });
    fireEvent.change(target, { target: { value: 's1' } });

    await waitFor(() => expect(notices.length).toBe(1));
    expect(notices[0]).toBeTruthy();
    // Rule 15: the document is unchanged, so the picker snaps back.
    expect(target).toHaveValue('s2');
  });

  it('still refuses when the host passes NO onNotice (rule 18)', async () => {
    renderStudio(CHAIN);
    await selectEdge('e1');
    await waitFor(() => expect(edgePanel()).toBeInTheDocument());
    const target = within(edgePanel()!).getByRole('combobox', { name: /^Target/ });
    fireEvent.change(target, { target: { value: 's1' } });
    await waitFor(() => expect(target).toHaveValue('s2'));
  });
});
