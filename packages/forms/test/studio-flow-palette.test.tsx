import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DRAG_IN_ATTRIBUTE } from '../src/renderers/gridstack/grid-drag-in';
import { FormStudio } from '../src/studio';
import { useXyflowJsdom } from './xyflow-jsdom';

// Doc 196 rules 17-20 — the palette's Flow group: adding Stages and Forms.

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
      options: { id: 's1', position: { x: 0, y: 0 } },
      elements: [{ type: 'Form', label: 'Contact', elements: [] }],
    },
    {
      type: 'Stage',
      label: 'Review',
      options: { id: 's2', position: { x: 320, y: 0 } },
      elements: [{ type: 'Form', label: 'Decision', elements: [] }],
    },
  ],
});

function required<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`missing ${what}`);
  return value;
}

const centre = () =>
  required(document.querySelector<HTMLElement>('[data-slot="form-studio-center-panel"]'), 'centre');
const palette = () =>
  within(required(document.querySelector<HTMLElement>('[data-studio-palette]'), 'palette'));
// Groups are found by accessible name — a group with no matching item renders nothing.
const hasGroup = (name: string) => palette().queryByRole('group', { name }) !== null;
const groupCount = () => palette().queryAllByRole('group').length;
const stageCount = () => centre().querySelectorAll('[data-slot="stage-card"]').length;
const edgeCount = () => document.querySelectorAll('[data-testid^="rf__edge-"]').length;
const trail = () => screen.getByRole('navigation', { name: 'Element path' });
const crumbNames = () =>
  within(trail())
    .queryAllByRole('button')
    .map((button) => button.getAttribute('aria-label') ?? button.textContent);
const currentCrumb = () => trail().querySelector('[aria-current="page"]')?.textContent ?? null;
const stageFrame = (label: string) =>
  required(
    [
      ...document.querySelectorAll<HTMLElement>(
        '[data-slot="studio-element"][data-element-type="Stage"]',
      ),
    ].find((frame) => frame.querySelector('[data-slot="stage-label"]')?.textContent === label),
    `${label} frame`,
  );
const press = (element: HTMLElement) => {
  fireEvent.pointerDown(element);
  fireEvent.pointerUp(element);
};

const renderStudio = (uischema: UISchemaElement = FLOW) =>
  render(<FormStudio schema={schema} uischema={uischema} />);

describe('palette views (rule 17)', () => {
  it('shows only the Flow group (Stage, Form) in the Flow view', () => {
    renderStudio();
    expect(groupCount()).toBe(1);
    expect(hasGroup('Flow')).toBe(true);
    expect(
      palette()
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Stage', 'Form']);
  });

  it('shows Display, Layout and Fields, not Flow, for a Form root and for a focused Form', async () => {
    const formGroups = () => {
      expect(groupCount()).toBe(3);
      for (const name of ['Display', 'Layout', 'Fields']) expect(hasGroup(name), name).toBe(true);
      expect(hasGroup('Flow')).toBe(false);
    };
    const { unmount } = renderStudio(el({ type: 'Form', elements: [] }));
    formGroups();
    unmount();

    renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Open Contact' }));
    await waitFor(() => expect(hasGroup('Fields')).toBe(true));
    formGroups();
    expect(palette().queryByRole('button', { name: 'Stage' })).toBeNull();
  });

  it('keeps the search text when the view changes', async () => {
    renderStudio();
    fireEvent.change(palette().getByRole('searchbox', { name: 'Search elements' }), {
      target: { value: 'page' },
    });
    await waitFor(() => expect(palette().queryByRole('button', { name: 'Stage' })).toBeNull());
    expect(palette().getByRole('button', { name: 'Form' })).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: 'Open Contact' }));
    await waitFor(() => expect(centre().querySelector('.react-flow')).toBeNull());
    expect(palette().getByRole('searchbox', { name: 'Search elements' })).toHaveValue('page');
    // The form view has no Form item, and "page" matches none of its items.
    expect(palette().queryByRole('button', { name: 'Form' })).toBeNull();
    expect(palette().getByText('No elements match your search.')).toBeInTheDocument();
  });

  it('registers no gridstack drag-in for Flow group items', async () => {
    renderStudio();
    expect(palette().getByRole('button', { name: 'Stage' })).not.toHaveAttribute(DRAG_IN_ATTRIBUTE);
    expect(palette().getByRole('button', { name: 'Form' })).not.toHaveAttribute(DRAG_IN_ATTRIBUTE);

    fireEvent.click(await screen.findByRole('button', { name: 'Open Contact' }));
    await waitFor(() =>
      expect(palette().getByRole('button', { name: 'Heading' })).toHaveAttribute(DRAG_IN_ATTRIBUTE),
    );
  });
});

describe('add Stage (rules 18, 20)', () => {
  it('appends a connected "Stage <n>" right of the selected Stage and selects it', async () => {
    renderStudio();
    await waitFor(() => expect(edgeCount()).toBe(1));
    press(stageFrame('Review'));
    fireEvent.click(palette().getByRole('button', { name: 'Stage' }));

    await waitFor(() => expect(stageCount()).toBe(3));
    expect(currentCrumb()).toBe('Stage 1');
    expect(stageFrame('Stage 1')).toHaveAttribute('data-selected');
    await waitFor(() => expect(edgeCount()).toBe(2));
    const [, , added] = [...document.querySelectorAll<HTMLElement>('.react-flow__node')];
    // 320px right of the selected Review (x 320); jsdom serialises the transform without a space.
    expect(required(added, 'added node').style.transform).toMatch(/^translate\(640px,\s?0px\)$/);
  });

  it('appends an unconnected Stage when nothing is selected', async () => {
    renderStudio();
    await waitFor(() => expect(edgeCount()).toBe(1));
    fireEvent.click(palette().getByRole('button', { name: 'Stage' }));

    await waitFor(() => expect(stageCount()).toBe(3));
    expect(currentCrumb()).toBe('Stage 1');
    expect(stageFrame('Stage 1').querySelector('[data-slot="stage-form-row"]')).toHaveTextContent(
      'Form 1',
    );
    await new Promise((done) => setTimeout(done, 20));
    expect(edgeCount()).toBe(1);
  });
});

describe('add Form (rules 19-20)', () => {
  it('appends "Form <n>" to the selected Stage and drills into it', async () => {
    renderStudio();
    press(stageFrame('Review'));
    fireEvent.click(palette().getByRole('button', { name: 'Form' }));

    await waitFor(() => expect(currentCrumb()).toBe('Form 1'));
    expect(crumbNames()).toEqual(['Flow', 'Review']);
    expect(centre().querySelector('.react-flow')).toBeNull();
  });

  it('changes nothing when no Stage is selected', () => {
    renderStudio();
    fireEvent.click(palette().getByRole('button', { name: 'Form' }));
    expect(currentCrumb()).toBeNull();
    expect(stageCount()).toBe(2);
    expect(centre().querySelectorAll('[data-slot="stage-form-row"]')).toHaveLength(2);
    expect(centre().querySelector('.react-flow')).not.toBeNull();
  });
});
