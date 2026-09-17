import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormStudio } from '../src/studio';
import { useXyflowJsdom } from './xyflow-jsdom';

/** Doc 184 rule 19: entering and leaving preview are two buttons now, so one matcher finds whichever shows. */
const PREVIEW_BUTTON = /^(Preview|Exit preview)$/;

// Doc 196 rules 12-14, 16 — drilling into a Form in a Stage, backing out, and previewing the focused Form.

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
const flowCanvas = () => centre().querySelector('.react-flow');
const rootFrameType = () =>
  centre()
    .querySelector(':scope > [data-slot="studio-element"]')
    ?.getAttribute('data-element-type');
const trail = () => screen.getByRole('navigation', { name: 'Element path' });
const crumbNames = () =>
  within(trail())
    .queryAllByRole('button')
    .map((button) => button.getAttribute('aria-label') ?? button.textContent);
// The root crumb is an icon named by aria-label (doc 186 rule 10b), so read the label before the text.
const currentCrumb = () => {
  const page = trail().querySelector('[aria-current="page"]');
  return page ? (page.getAttribute('aria-label') ?? page.textContent) : null;
};
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
const togglePreview = () => fireEvent.click(screen.getByRole('button', { name: PREVIEW_BUTTON }));

async function openContact() {
  render(<FormStudio schema={schema} uischema={FLOW} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Open Contact' }));
  await waitFor(() => expect(flowCanvas()).toBeNull());
}

describe('open (rules 12-13)', () => {
  it('renders the Form as the canvas root when its row is clicked, with no nested-Form error', async () => {
    await openContact();
    expect(rootFrameType()).toBe('Form');
    expect(await within(centre()).findByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    expect(centre().querySelector('[data-slot="form-nested-error"]')).toBeNull();
    expect(within(centre()).queryByRole('alert')).toBeNull();
    expect(currentCrumb()).toBe('Contact');
  });

  it('opens the Form from its row with Enter and with Space', async () => {
    render(<FormStudio schema={schema} uischema={FLOW} />);
    fireEvent.keyDown(await screen.findByRole('button', { name: 'Open Decision' }), {
      key: 'Enter',
    });
    await waitFor(() => expect(currentCrumb()).toBe('Decision'));
    expect(flowCanvas()).toBeNull();

    fireEvent.click(within(trail()).getByRole('button', { name: 'Review' }));
    fireEvent.keyDown(await screen.findByRole('button', { name: 'Open Contact' }), { key: ' ' });
    await waitFor(() => expect(currentCrumb()).toBe('Contact'));
    expect(rootFrameType()).toBe('Form');
  });

  it("edits the focused Form: a palette insert lands in it and the document's Flow keeps its other Stages", async () => {
    await openContact();
    const palette = within(
      required(document.querySelector<HTMLElement>('[data-studio-palette]'), 'palette'),
    );
    fireEvent.click(palette.getByRole('button', { name: 'Heading' }));
    expect(await within(centre()).findByRole('heading', { name: 'Heading' })).toBeInTheDocument();
    expect(crumbNames()).toEqual(['Flow', 'Applicant', 'Contact']);

    fireEvent.click(within(trail()).getByRole('button', { name: 'Flow' }));
    await waitFor(() => expect(flowCanvas()).not.toBeNull());
    expect(centre().querySelectorAll('[data-slot="stage-card"]')).toHaveLength(2);
    expect(within(centre()).queryByRole('heading', { name: 'Heading' })).toBeNull();
  });
});

describe('back out (rule 14)', () => {
  it('names the path "<Flow> › <Stage> › <Form>" while a Form is focused', async () => {
    await openContact();
    expect(crumbNames()).toEqual(['Flow', 'Applicant']);
    expect(currentCrumb()).toBe('Contact');
  });

  it('returns to the Flow view with the Stage selected when Escape is pressed on the focused Form', async () => {
    await openContact();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(flowCanvas()).not.toBeNull());
    expect(currentCrumb()).toBe('Applicant');
    expect(stageFrame('Applicant')).toHaveAttribute('data-selected');
  });

  it('returns to the Flow view when the Flow or Stage crumb is selected', async () => {
    await openContact();
    fireEvent.click(within(trail()).getByRole('button', { name: 'Applicant' }));
    await waitFor(() => expect(flowCanvas()).not.toBeNull());
    expect(currentCrumb()).toBe('Applicant');

    fireEvent.click(await screen.findByRole('button', { name: 'Open Contact' }));
    await waitFor(() => expect(flowCanvas()).toBeNull());
    fireEvent.click(within(trail()).getByRole('button', { name: 'Flow' }));
    await waitFor(() => expect(flowCanvas()).not.toBeNull());
    expect(currentCrumb()).toBe('Flow');
  });

  it('keeps the Form focused (selected) after a press on empty canvas', async () => {
    await openContact();
    press(centre());
    expect(currentCrumb()).toBe('Contact');
    expect(flowCanvas()).toBeNull();
    expect(rootFrameType()).toBe('Form');
  });
});

describe('preview of a focused Form (rule 16)', () => {
  it('previews only the focused Form, fillable, through renderers/default', async () => {
    await openContact();
    togglePreview();
    const field = await within(centre()).findByRole('textbox', { name: 'Name' });
    expect(field).toBeEnabled();
    fireEvent.change(field, { target: { value: 'Ada' } });
    expect(field).toHaveValue('Ada');
    expect(
      centre().querySelector('[data-slot="fill-layout"][data-layout-type="Form"]'),
    ).not.toBeNull();
    expect(within(centre()).queryByRole('status')).toBeNull();
    expect(centre().querySelector('.react-flow, .grid-stack')).toBeNull();

    // Doc 202 rule 40c: a FOCUSED Form is one step of a longer journey, so it gets NO action bar —
    // offering Submit here would misrepresent how a citizen reaches it. Asserted explicitly because the
    // `fill-layout` check above passes either way: the runner renders that same element inside itself.
    expect(centre().querySelector('[data-slot="runner-actions"]')).toBeNull();
    expect(within(centre()).queryByRole('button', { name: 'Submit' })).toBeNull();
  });

  it('drills back into the remembered Form when preview ends', async () => {
    await openContact();
    togglePreview();
    await within(centre()).findByRole('textbox', { name: 'Name' });
    togglePreview();
    await waitFor(() => expect(currentCrumb()).toBe('Contact'));
    expect(flowCanvas()).toBeNull();
    expect(rootFrameType()).toBe('Form');
  });

  it('previews the whole flow when no Form is focused, and selects nothing after', async () => {
    render(<FormStudio schema={schema} uischema={FLOW} />);
    press(stageFrame('Review'));
    togglePreview();
    // Doc 202 rules 40, 46: previewing a Flow with no focused Form now runs it, rather than saying it cannot.
    expect(within(centre()).queryByRole('status')).toBeNull();
    expect(centre().querySelector('[data-slot="fill-flow"]')).not.toBeNull();
    togglePreview();
    await waitFor(() => expect(flowCanvas()).not.toBeNull());
    expect(currentCrumb()).toBeNull();
  });
});
