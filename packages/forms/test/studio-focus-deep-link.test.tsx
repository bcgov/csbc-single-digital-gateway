import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FormStudio } from '../src/studio';
import { STUDIO_SAMPLE_SCHEMA, STUDIO_SAMPLE_UISCHEMA } from '../src/studio/sample';
import { useXyflowJsdom } from './xyflow-jsdom';

// Doc 197 rules 7-13 — the optional host interface: `focusedForm` in, `onFocusedFormChange` out.
// Focus stays derived from the selection (doc 196 rule 12), so these drive FormStudio, not a store.

useXyflowJsdom();

const schema: JsonSchema = {
  type: 'object',
  properties: { name: { type: 'string', title: 'Name' } },
};
const el = (element: object) => element as UISchemaElement;

/** Flow [ Applicant [ Contact 'f1', Plain (no address) ], Review [ Decision 'f3' ] ]. */
const flowDocument = () =>
  el({
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
          { type: 'Form', label: 'Plain', elements: [] },
        ],
      },
      {
        type: 'Stage',
        label: 'Review',
        id: 's2',
        elements: [{ type: 'Form', label: 'Decision', id: 'f3', elements: [] }],
      },
    ],
  });

const FLOW = flowDocument();

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
const currentCrumb = () => {
  const page = screen
    .getByRole('navigation', { name: 'Element path' })
    .querySelector('[aria-current="page"]');
  return page ? (page.getAttribute('aria-label') ?? page.textContent) : null;
};
const open = async (label: string) =>
  fireEvent.click(await screen.findByRole('button', { name: `Open ${label}` }));
const escape = () => fireEvent.keyDown(document, { key: 'Escape' });

/** The address of the last report, and whether it replaced — `undefined` when nothing was reported. */
const lastCall = (spy: ReturnType<typeof vi.fn>) => spy.mock.calls.at(-1);

describe('no props — degrade, never throw (rule 8)', () => {
  it('drills into a Form exactly as before when neither prop is passed', async () => {
    render(<FormStudio schema={schema} uischema={FLOW} />);
    await open('Contact');

    await waitFor(() => expect(flowCanvas()).toBeNull());
    expect(rootFrameType()).toBe('Form');
    expect(currentCrumb()).toBe('Contact');
  });

  it('reports nothing when onFocusedFormChange is absent but focusedForm is passed', async () => {
    render(<FormStudio schema={schema} uischema={FLOW} focusedForm="f3" />);

    await waitFor(() => expect(flowCanvas()).toBeNull());
    expect(rootFrameType()).toBe('Form');
    expect(currentCrumb()).toBe('Decision');
  });
});

describe('host → studio (rule 9)', () => {
  it('renders the addressed Form as the canvas root on mount', async () => {
    render(<FormStudio schema={schema} uischema={FLOW} focusedForm="f1" />);

    await waitFor(() => expect(flowCanvas()).toBeNull());
    expect(rootFrameType()).toBe('Form');
    expect(currentCrumb()).toBe('Contact');
    expect(await screen.findByRole('textbox', { name: 'Name' })).toBeInTheDocument();
  });

  it('moves focus to the newly addressed Form when the prop changes', async () => {
    const { rerender } = render(<FormStudio schema={schema} uischema={FLOW} focusedForm="f1" />);
    await waitFor(() => expect(currentCrumb()).toBe('Contact'));

    rerender(<FormStudio schema={schema} uischema={FLOW} focusedForm="f3" />);

    await waitFor(() => expect(currentCrumb()).toBe('Decision'));
    expect(flowCanvas()).toBeNull();
  });

  it('backs out to the Flow with nothing selected when the prop becomes null', async () => {
    const { rerender } = render(<FormStudio schema={schema} uischema={FLOW} focusedForm="f1" />);
    await waitFor(() => expect(flowCanvas()).toBeNull());

    rerender(<FormStudio schema={schema} uischema={FLOW} focusedForm={null} />);

    await waitFor(() => expect(flowCanvas()).not.toBeNull());
    expect(rootFrameType()).toBe('Flow');
  });
});

describe('studio → host (rule 10)', () => {
  it("reports the opened Form's address with replace false", async () => {
    const onChange = vi.fn();
    render(<FormStudio schema={schema} uischema={FLOW} onFocusedFormChange={onChange} />);
    await open('Contact');

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(lastCall(onChange)).toEqual(['f1', { replace: false }]);
  });

  it('reports null when the selection leaves the Form (Escape to the Stage)', async () => {
    const onChange = vi.fn();
    render(<FormStudio schema={schema} uischema={FLOW} onFocusedFormChange={onChange} />);
    await open('Contact');
    await waitFor(() => expect(lastCall(onChange)).toEqual(['f1', { replace: false }]));

    escape();

    await waitFor(() => expect(lastCall(onChange)).toEqual([null, { replace: false }]));
    expect(flowCanvas()).not.toBeNull();
  });

  // Doc 219 SUPERSEDES doc 197 rule 10. Seed normalisation stamps an id on every id-less element, so a Form
  // without an address no longer exists in an open document — the studio now always has one to report, and
  // every Form is deep-linkable. Rule 10 existed precisely because an un-addressed Form could not be.
  it('reports an address for a Form authored without one, because seeding stamps every element', async () => {
    const onChange = vi.fn();
    render(<FormStudio schema={schema} uischema={FLOW} onFocusedFormChange={onChange} />);
    await open('Plain');

    await waitFor(() => expect(rootFrameType()).toBe('Form'));
    const reported = onChange.mock.calls.map(([formId]) => formId);
    expect(reported.length).toBeGreaterThan(0);
    expect(reported.every((formId) => typeof formId === 'string' && formId !== '')).toBe(true);
  });
});

describe('self-healing (rule 11)', () => {
  it('reports the effective address with replace true for an unknown id', async () => {
    const onChange = vi.fn();
    render(
      <FormStudio
        schema={schema}
        uischema={FLOW}
        focusedForm="nope"
        onFocusedFormChange={onChange}
      />,
    );

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(lastCall(onChange)).toEqual([null, { replace: true }]);
    expect(flowCanvas()).not.toBeNull();
  });

  it('reports null with replace true when an address arrives and the root is a Form', async () => {
    const onChange = vi.fn();
    // Doc 200 rule 23: a bare studio opens the New form dialog, so the Form root is seeded explicitly.
    render(
      <FormStudio
        schema={STUDIO_SAMPLE_SCHEMA}
        uischema={STUDIO_SAMPLE_UISCHEMA}
        focusedForm="f1"
        onFocusedFormChange={onChange}
      />,
    );

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(lastCall(onChange)).toEqual([null, { replace: true }]);
    expect(rootFrameType()).toBe('Form');
  });

  it('reports null when the focused Form is no longer in the document', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <FormStudio
        schema={schema}
        uischema={FLOW}
        focusedForm="f1"
        onFocusedFormChange={onChange}
      />,
    );
    await waitFor(() => expect(flowCanvas()).toBeNull());

    const without = el({
      type: 'Flow',
      elements: [{ type: 'Stage', label: 'Review', id: 's2', elements: [] }],
    });
    rerender(
      <FormStudio
        schema={schema}
        uischema={without}
        focusedForm="f1"
        onFocusedFormChange={onChange}
      />,
    );

    await waitFor(() => expect(lastCall(onChange)).toEqual([null, { replace: true }]));
  });
});

describe('no feedback loop (rule 12)', () => {
  it('does not report an address back to the host merely for applying it', async () => {
    const onChange = vi.fn();
    render(
      <FormStudio
        schema={schema}
        uischema={FLOW}
        focusedForm="f1"
        onFocusedFormChange={onChange}
      />,
    );

    await waitFor(() => expect(flowCanvas()).toBeNull());
    expect(currentCrumb()).toBe('Contact');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports once per real focus change, not once per render', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <FormStudio schema={schema} uischema={FLOW} onFocusedFormChange={onChange} />,
    );
    await open('Contact');
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));

    rerender(<FormStudio schema={schema} uischema={FLOW} onFocusedFormChange={() => onChange()} />);

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('a new seed document (rule 13)', () => {
  it('re-resolves the current address against the new document', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <FormStudio
        schema={schema}
        uischema={FLOW}
        focusedForm="f1"
        onFocusedFormChange={onChange}
      />,
    );
    await waitFor(() => expect(currentCrumb()).toBe('Contact'));

    // A rebuilt document: same addresses, new objects — so the element ids restart.
    rerender(
      <FormStudio
        schema={schema}
        uischema={flowDocument()}
        focusedForm="f1"
        onFocusedFormChange={onChange}
      />,
    );

    await waitFor(() => expect(currentCrumb()).toBe('Contact'));
    expect(flowCanvas()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports null with replace true when the address no longer resolves', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <FormStudio
        schema={schema}
        uischema={FLOW}
        focusedForm="f1"
        onFocusedFormChange={onChange}
      />,
    );
    await waitFor(() => expect(flowCanvas()).toBeNull());

    rerender(
      <FormStudio
        schema={schema}
        uischema={el({ type: 'Form', elements: [] })}
        focusedForm="f1"
        onFocusedFormChange={onChange}
      />,
    );

    await waitFor(() => expect(lastCall(onChange)).toEqual([null, { replace: true }]));
  });
});
