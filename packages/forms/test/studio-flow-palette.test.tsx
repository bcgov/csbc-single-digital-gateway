import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DRAG_IN_ATTRIBUTE } from '../src/renderers/gridstack/grid-drag-in';
import { FormStudio } from '../src/studio';
import { useXyflowJsdom } from './xyflow-jsdom';

// Doc 198 rules 17-19 — the palette and the Flow canvas. A Flow is authored entirely on its canvas
// (rules 7-13), so the left panel and its toggle are gone while one is showing, and the Flow palette
// catalogue of doc 196 rule 17 is deleted outright. Adding Stages and Forms is covered by
// flow-add-affordances.test.tsx.

useXyflowJsdom();

const schema: JsonSchema = { type: 'object', properties: {} };
const el = (element: object) => element as UISchemaElement;

const FLOW = el({
  type: 'Flow',
  options: { edges: [{ id: 'e1', source: 's1', target: 's2' }] },
  elements: [
    {
      type: 'Stage',
      label: 'Applicant',
      id: 's1',
      elements: [{ type: 'Form', label: 'Contact', id: 'f1', elements: [] }],
    },
    {
      type: 'Stage',
      label: 'Review',
      id: 's2',
      elements: [{ type: 'Form', label: 'Decision', id: 'f2', elements: [] }],
    },
  ],
});

const FORM_ROOT = el({ type: 'Form', elements: [] });

const palette = () => document.querySelector<HTMLElement>('[data-studio-palette]');
const paletteIn = () => {
  const found = palette();
  if (!found) throw new Error('missing palette');
  return within(found);
};
// Groups are found by accessible name — a group with no matching item renders nothing. Reading an attribute instead
// would fall back to the group's whole text content.
const hasGroup = (name: string) => paletteIn().queryByRole('group', { name }) !== null;
const groupCount = () => paletteIn().queryAllByRole('group').length;
const toggleNames = () =>
  within(screen.getByRole('group', { name: 'Panels' }))
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label'));

const renderStudio = (uischema: UISchemaElement) =>
  render(<FormStudio schema={schema} uischema={uischema} />);

describe('the Flow canvas has no palette (rules 17-18)', () => {
  it('renders no palette at all while the Flow canvas is showing', () => {
    renderStudio(FLOW);
    expect(palette()).toBeNull();
  });

  it('drops the Left panel toggle, keeping Bottom and Right', () => {
    renderStudio(FLOW);
    expect(toggleNames()).toEqual(['Bottom panel', 'Right panel']);
    expect(screen.queryByRole('button', { name: 'Left panel' })).toBeNull();
  });

  it('keeps all three toggles for a Form root', () => {
    renderStudio(FORM_ROOT);
    expect(toggleNames()).toEqual(['Left panel', 'Bottom panel', 'Right panel']);
    expect(palette()).not.toBeNull();
  });

  it('restores the palette and its toggle when the author drills into a Form', async () => {
    renderStudio(FLOW);
    expect(palette()).toBeNull();

    fireEvent.click(await screen.findByRole('button', { name: 'Open Contact' }));

    await waitFor(() => expect(palette()).not.toBeNull());
    expect(toggleNames()).toEqual(['Left panel', 'Bottom panel', 'Right panel']);
    expect(screen.getByRole('button', { name: 'Left panel' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('one catalogue again (rule 19)', () => {
  it('shows Display, Layout and Fields — and no Flow group — for a Form', () => {
    renderStudio(FORM_ROOT);
    expect(groupCount()).toBe(3);
    for (const name of ['Display', 'Layout', 'Fields']) expect(hasGroup(name), name).toBe(true);
    expect(hasGroup('Flow')).toBe(false);
  });

  it('offers no Stage or Form template anywhere', () => {
    renderStudio(FORM_ROOT);
    expect(paletteIn().queryByRole('button', { name: 'Stage' })).toBeNull();
    expect(paletteIn().queryByRole('button', { name: 'Form' })).toBeNull();
  });

  it('still registers gridstack drag-in for the layout templates', () => {
    renderStudio(FORM_ROOT);
    // Every remaining template is droppable on a grid: the click-only Flow items are gone (doc 196 rule 17).
    expect(paletteIn().getByRole('button', { name: 'Heading' })).toHaveAttribute(DRAG_IN_ATTRIBUTE);
  });

  it('keeps the search across a drill-in, since the catalogue no longer swaps', async () => {
    renderStudio(FLOW);
    fireEvent.click(await screen.findByRole('button', { name: 'Open Contact' }));
    await waitFor(() => expect(palette()).not.toBeNull());

    fireEvent.change(paletteIn().getByRole('searchbox', { name: 'Search elements' }), {
      target: { value: 'head' },
    });
    await waitFor(() => expect(paletteIn().queryByRole('button', { name: 'Text' })).toBeNull());
    expect(paletteIn().getByRole('button', { name: 'Heading' })).toBeInTheDocument();
  });
});
