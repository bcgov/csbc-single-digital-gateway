import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as xyflow from '../src/renderers-xyflow';
import { FormStudio } from '../src/studio';
import { StudioCodePanel } from '../src/studio/code/studio-code-panel';
import { useXyflowJsdom } from './xyflow-jsdom';

// Doc 196 rules 1-2, 5, 7-11, 13 — editing a Flow in the Form Studio. Handle connections can't be driven in jsdom
// (rule 23): their gestures are unit-tested in studio-flow-gestures and verified by hand.
// Doc 198 rule 4: Stage nodes are no longer draggable — positions are derived, so a drag could not persist.

vi.mock('../src/studio/code/code-editor', async () => {
  const { createElement } = await import('react');
  return {
    CodeEditor: ({ label }: { label: string }) =>
      createElement('textarea', { 'aria-label': label }),
  };
});

useXyflowJsdom();

const schema: JsonSchema = {
  type: 'object',
  properties: { name: { type: 'string', title: 'Name' } },
};
const el = (element: object) => element as UISchemaElement;

const FLOW = el({
  type: 'Flow',
  options: { edges: [{ id: 'e1', source: 's1', target: 's2' }] },
  elements: [
    {
      type: 'Stage',
      label: 'Applicant',
      options: { id: 's1' },
      elements: [
        {
          type: 'Form',
          label: 'Contact',
          elements: [{ type: 'Control', scope: '#/properties/name' }],
        },
      ],
    },
    {
      type: 'Stage',
      label: 'Review',
      options: { id: 's2' },
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
const nodeOf = (id: string) =>
  required(document.querySelector<HTMLElement>(`.react-flow__node[data-id="${id}"]`), `node ${id}`);
const stageFrame = (label: string) =>
  required(
    [
      ...document.querySelectorAll<HTMLElement>(
        '[data-slot="studio-element"][data-element-type="Stage"]',
      ),
    ].find((frame) => frame.querySelector('[data-slot="stage-label"]')?.textContent === label),
    `${label} frame`,
  );
const edgeIds = () =>
  [...document.querySelectorAll('[data-testid^="rf__edge-"]')].map((edge) =>
    edge.getAttribute('data-testid'),
  );
const press = (element: HTMLElement) => {
  fireEvent.pointerDown(element);
  fireEvent.pointerUp(element);
};
const confirmDelete = async (description: string) => {
  const dialog = await screen.findByRole('alertdialog');
  expect(dialog).toHaveTextContent(description);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
};

const renderStudio = (uischema: UISchemaElement = FLOW) =>
  render(<FormStudio schema={schema} uischema={uischema} />);

describe('editor port (rules 1-2)', () => {
  it('keeps renderers/xyflow view-only without a FlowEditorProvider (doc 195 rule 11)', async () => {
    render(
      <div style={{ width: '800px', height: '600px' }}>
        <JsonForms
          schema={schema}
          uischema={FLOW}
          data={{}}
          renderers={[...xyflow.layoutRenderers]}
          cells={[]}
        />
      </div>,
    );
    await waitFor(() => expect(edgeIds()).toEqual(['rf__edge-e1']));
    expect(nodeOf('s1')).not.toHaveClass('draggable');
    expect(document.querySelector('[data-slot="stage-form-open"]')).toBeNull();
    expect(document.querySelector('[data-slot="stage-form-delete"]')).toBeNull();
    expect(document.querySelector('.react-flow__edge')).not.toHaveClass('selectable');
  });

  it('provides the Flow editor in the studio canvas and not in preview', () => {
    renderStudio();
    // The editor is present but does NOT make nodes draggable (doc 198 rule 4); its Form rows are the tell.
    expect(centre().querySelectorAll('[data-slot="stage-form-open"]')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    // Doc 202 rules 40, 46: preview runs the flow instead of refusing it, and still never draws the canvas.
    expect(within(centre()).queryByRole('status')).toBeNull();
    expect(centre().querySelector('[data-slot="fill-flow"]')).not.toBeNull();
    expect(centre().querySelector('.react-flow')).toBeNull();
  });

  it('never imports renderers/studio from renderers/xyflow', () => {
    const directory = resolve(import.meta.dirname, '../src/renderers/xyflow');
    for (const file of readdirSync(directory)) {
      const source = readFileSync(resolve(directory, file), 'utf8');
      expect(source, file).not.toMatch(/from ['"]\.\.\/(studio|studio-palette|studio-inspector)\//);
      expect(source, file).not.toMatch(/from ['"][^'"]*\/studio\/[^'"]*['"]/);
    }
  });
});

describe('canvas under an editor (rules 4-5, 7)', () => {
  it('draws nodes neither draggable nor selectable, with visible connectable handles', () => {
    renderStudio();
    const node = nodeOf('s1');
    // Doc 198 rule 4: derived positions mean a drag could not persist, so dragging is off even under an editor.
    expect(node).not.toHaveClass('draggable');
    expect(node).not.toHaveClass('selectable');
    const handles = [...node.querySelectorAll('.react-flow__handle')];
    expect(handles).toHaveLength(2);
    for (const handle of handles) {
      expect(handle).toHaveClass('connectable', 'size-2.5!');
      expect(handle).not.toHaveClass('opacity-0');
    }
  });

  it('draws edges selectable', async () => {
    renderStudio();
    await waitFor(() => expect(edgeIds()).toEqual(['rf__edge-e1']));
    expect(document.querySelector('.react-flow__edge')).toHaveClass('selectable');
  });
});

describe('delete key trap (rule 8)', () => {
  it('gives the studio code panel root the xyflow nokey class', () => {
    const { container } = render(
      <StudioCodePanel schema={schema} uischema={FLOW} onReplace={() => {}} />,
    );
    expect(container.querySelector('[data-studio-code]')).toHaveClass('nokey');
  });
});

describe('deleting Stages and Forms (rules 9-10)', () => {
  it('shows a Delete-only actions popover on the selected Stage', async () => {
    renderStudio();
    press(stageFrame('Applicant'));
    const menu = await screen.findByRole('dialog', { name: 'Stage actions' });
    expect(
      within(menu)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Delete']);
  });

  it('removes the Stage and its edges once the deletion is confirmed', async () => {
    renderStudio();
    await waitFor(() => expect(edgeIds()).toEqual(['rf__edge-e1']));
    press(stageFrame('Applicant'));
    const menu = await screen.findByRole('dialog', { name: 'Stage actions' });
    fireEvent.click(within(menu).getByRole('button', { name: 'Delete' }));
    await confirmDelete('This stage, its forms and its connections will be removed from the flow.');

    await waitFor(() =>
      expect(centre().querySelectorAll('[data-slot="stage-card"]')).toHaveLength(1),
    );
    expect(centre().querySelector('[data-slot="stage-label"]')).toHaveTextContent('Review');
    await waitFor(() => expect(edgeIds()).toEqual([]));
  });

  it("removes a Form from its Stage through its row's Delete button and the confirmation", async () => {
    renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Contact' }));
    await confirmDelete('This form and everything inside it will be removed from its stage.');

    await waitFor(() =>
      expect(
        [...centre().querySelectorAll('[data-slot="stage-form-row"]')].map(
          (row) => row.textContent,
        ),
      ).toEqual(['Decision']),
    );
    expect(stageFrame('Applicant').querySelector('[data-slot="stage-empty"]')).toHaveTextContent(
      'No forms',
    );
  });
});

describe('empty Flow (rule 11, doc 198 rule 12)', () => {
  it('shows "Add a stage to get started." and an origin + for a Flow with no Stages', () => {
    renderStudio(el({ type: 'Flow', elements: [] }));
    expect(centre().querySelector('[data-slot="flow-empty"]')).toHaveTextContent(
      'Add a stage to get started.',
    );
    expect(within(centre()).getByRole('button', { name: 'Add a stage' })).toBeInTheDocument();
  });
});

describe('Stage content under an editor (rule 13)', () => {
  it('is not inert but pointer-events-none, and its Form rows are pointer-events-auto nodrag buttons', async () => {
    renderStudio();
    const content = required(
      stageFrame('Applicant').querySelector<HTMLElement>(':scope > [data-slot="studio-content"]'),
      'stage content',
    );
    expect(content).not.toHaveAttribute('inert');
    expect(content).toHaveClass('pointer-events-none');

    const open = await screen.findByRole('button', { name: 'Open Contact' });
    expect(open).toHaveAttribute('tabindex', '0');
    expect(open).toHaveClass('nodrag', 'pointer-events-auto');
    expect(screen.getByRole('button', { name: 'Delete Contact' })).toHaveClass(
      'nodrag',
      'pointer-events-auto',
    );
  });
});
