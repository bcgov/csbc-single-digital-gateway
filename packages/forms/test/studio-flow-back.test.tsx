import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FormStudio } from '../src/studio';
import { useXyflowJsdom } from './xyflow-jsdom';
import { BACK_TO_STAGES_LABEL } from '../src/studio/studio-back-button';

/** Doc 184 rule 19: entering and leaving preview are two buttons now, so one matcher finds whichever shows. */
const PREVIEW_BUTTON = /^(Preview|Exit preview)$/;

// Doc 197 rules 14-18 — the header's Back button: the obvious way out of a focused Form, alongside
// Escape (to the Stage) and the breadcrumbs.

useXyflowJsdom();

const schema: JsonSchema = {
  type: 'object',
  properties: { name: { type: 'string', title: 'Name' } },
};
const el = (element: object) => element as UISchemaElement;

const FLOW = el({
  type: 'Flow',
  elements: [
    {
      type: 'Stage',
      label: 'Applicant',
      id: 's1',
      elements: [
        {
          type: 'Form',
          label: 'Contact',
          id: 'f1',
          elements: [{ type: 'Control', scope: '#/properties/name' }],
        },
      ],
    },
  ],
});

function required<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`missing ${what}`);
  return value;
}

const centre = () =>
  required(document.querySelector<HTMLElement>('[data-slot="form-studio-center-panel"]'), 'centre');
const header = () =>
  required(document.querySelector<HTMLElement>('[data-slot="form-studio-header"]'), 'header');
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
const currentCrumb = () => {
  const page = trail().querySelector('[aria-current="page"]');
  return page ? (page.getAttribute('aria-label') ?? page.textContent) : null;
};
const backButton = () => screen.queryByRole('button', { name: BACK_TO_STAGES_LABEL });
const togglePreview = () => fireEvent.click(screen.getByRole('button', { name: PREVIEW_BUTTON }));
const escape = () => fireEvent.keyDown(document, { key: 'Escape' });

/** Renders the studio and drills into the Contact Form. */
async function drillIn(onFocusedFormChange?: (id: string | null, meta: unknown) => void) {
  const view = render(
    onFocusedFormChange ? (
      <FormStudio schema={schema} uischema={FLOW} onFocusedFormChange={onFocusedFormChange} />
    ) : (
      <FormStudio schema={schema} uischema={FLOW} />
    ),
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Open Contact' }));
  await waitFor(() => expect(flowCanvas()).toBeNull());
  return view;
}

describe('visibility (rules 14, 17)', () => {
  it('is absent while the Flow is the canvas root', async () => {
    render(<FormStudio schema={schema} uischema={FLOW} />);

    await screen.findByRole('button', { name: 'Open Contact' });
    expect(backButton()).toBeNull();
  });

  it('appears once a Form is focused', async () => {
    await drillIn();

    expect(backButton()).toBeInTheDocument();
  });

  it('is hidden while previewing, and returns on leaving preview', async () => {
    await drillIn();
    expect(backButton()).toBeInTheDocument();

    togglePreview();
    await waitFor(() => expect(backButton()).toBeNull());

    togglePreview();
    await waitFor(() => expect(backButton()).toBeInTheDocument());
  });
});

describe('pressing Back (rule 15)', () => {
  it('returns the canvas to the Flow', async () => {
    await drillIn();

    fireEvent.click(required(backButton(), 'back button'));

    await waitFor(() => expect(flowCanvas()).not.toBeNull());
    expect(rootFrameType()).toBe('Flow');
    expect(backButton()).toBeNull();
  });

  it('leaves nothing selected, so the breadcrumbs collapse to the root crumb', async () => {
    await drillIn();
    expect(currentCrumb()).toBe('Contact');

    fireEvent.click(required(backButton(), 'back button'));

    await waitFor(() => expect(currentCrumb()).not.toBe('Contact'));
    expect(crumbNames()).not.toContain('Applicant');
  });

  it('reports a null address with replace false, so browser Back returns to the Form', async () => {
    const onChange = vi.fn();
    await drillIn(onChange);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('f1', { replace: false }));

    fireEvent.click(required(backButton(), 'back button'));

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(null, { replace: false }));
  });
});

describe('shape and placement (rule 16)', () => {
  it('reads "Back to Stages" in bcgov gold and blue, and is the first child of the header (rule 16b)', async () => {
    await drillIn();

    const back = header().firstElementChild;
    expect(back).toHaveTextContent(BACK_TO_STAGES_LABEL);
    // Rule 16b: only the ARROW is on gold; the words sit beside it on the header's own background.
    const icon = back?.querySelector('[data-slot="studio-back-icon"]');
    expect(icon).toHaveClass('bg-bcgov-gold', 'text-bcgov-blue');
    expect(icon?.querySelector('svg')).not.toBeNull();
    expect(back).not.toHaveClass('bg-bcgov-gold');
  });

  it('keeps the dock and preview toggles right-aligned whether or not it is present', async () => {
    render(<FormStudio schema={schema} uischema={FLOW} />);
    await screen.findByRole('button', { name: 'Open Contact' });
    expect(header()).toHaveClass('justify-end');

    fireEvent.click(screen.getByRole('button', { name: 'Open Contact' }));

    await waitFor(() => expect(backButton()).toBeInTheDocument());
    expect(header()).toHaveClass('justify-end');
    expect(backButton()).toHaveClass('mr-auto');
  });
});

describe('the other ways out are unchanged (rule 18)', () => {
  it('still selects the parent Stage on Escape', async () => {
    await drillIn();

    escape();

    await waitFor(() => expect(flowCanvas()).not.toBeNull());
    expect(currentCrumb()).toBe('Applicant');
  });

  it('still selects the Flow from its breadcrumb', async () => {
    await drillIn();

    const rootCrumb = required(within(trail()).queryAllByRole('button')[0], 'root crumb');
    fireEvent.click(rootCrumb);

    await waitFor(() => expect(flowCanvas()).not.toBeNull());
    expect(rootFrameType()).toBe('Flow');
  });
});
