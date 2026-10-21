import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormStudio } from '../src/studio';
import { useXyflowJsdom } from './xyflow-jsdom';

// Doc 196 rules 7-8 — selecting an edge and deleting it from the keyboard, and typing inside `.nokey` never deleting it.
// Found in hand verification: with the edges passed as derived props and no onEdgesChange, xyflow's "select" change
// was never applied, so a clicked edge never became selected and Delete had nothing to delete.

useXyflowJsdom();

const schema: JsonSchema = { type: 'object', properties: {} };
const FLOW = {
  type: 'Flow',
  options: { edges: [{ id: 'e1', source: 's1', target: 's2' }] },
  elements: [
    { type: 'Stage', label: 'A', id: 's1', elements: [] },
    { type: 'Stage', label: 'B', id: 's2', elements: [] },
  ],
} as UISchemaElement;

function required<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`missing ${what}`);
  return value;
}

const edge = () => document.querySelector<SVGGElement>('[data-testid="rf__edge-e1"]');
const settle = () => new Promise((done) => setTimeout(done, 30));
const press = (target: Element, key: string) => {
  fireEvent.keyDown(target, { key, code: key });
  fireEvent.keyUp(target, { key, code: key });
};

async function selectEdge() {
  render(<FormStudio schema={schema} uischema={FLOW} />);
  await waitFor(() => expect(edge()).not.toBeNull());
  const current = required(edge(), 'edge');
  fireEvent.click(current.querySelector('.react-flow__edge-interaction') ?? current);
  await waitFor(() => expect(edge()).toHaveClass('selected'));
}

describe('deleting an edge from the keyboard (rules 7-8)', () => {
  it('selects a clicked edge', async () => {
    await selectEdge();
    expect(required(edge(), 'edge')).toHaveClass('selectable', 'selected');
  });

  it('removes the selected edge from the document with Delete, and it stays removed', async () => {
    await selectEdge();
    press(document.body, 'Delete');
    await waitFor(() => expect(edge()).toBeNull());
    // onBeforeDelete resolves false, so xyflow never drops the edge itself: it is gone because the uischema lost it.
    await settle();
    expect(edge()).toBeNull();
    expect(document.querySelectorAll('[data-slot="stage-card"]')).toHaveLength(2);
  });

  it('removes the selected edge with Backspace', async () => {
    await selectEdge();
    press(document.body, 'Backspace');
    await waitFor(() => expect(edge()).toBeNull());
  });

  it('keeps the selected edge when Backspace comes from inside a .nokey element (the code panel)', async () => {
    await selectEdge();
    const typing = document.createElement('div');
    typing.className = 'nokey';
    const inner = document.createElement('div');
    typing.append(inner);
    document.body.append(typing);
    try {
      press(inner, 'Backspace');
      await settle();
      expect(edge()).not.toBeNull();
      expect(edge()).toHaveClass('selected');
    } finally {
      typing.remove();
    }
  });
});
