import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { formKey, mayOpen, pathErrors } from '../src/runner/path-errors';
import { FormRunner } from '../src/runner/form-runner';

// Doc 202 rules 27b-27d — errors attributed to the Forms on the citizen's path: Submit ignores the branch not taken,
// a blocked Submit takes the citizen to the first errored Form, and the rail flags errored Forms.

const schema: JsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name' },
    kind: { type: 'string', title: 'Kind' },
    bizName: { type: 'string', title: 'Business name' },
    agree: { type: 'string', title: 'Agree' },
  },
  // `bizName` is required, but lives only on the Business branch.
  required: ['name', 'bizName'],
};
const el = (element: object) => element as UISchemaElement;
const form = (id: string, label: string, keys: string[]) => ({
  type: 'Form',
  label,
  id,
  elements: keys.map((key) => ({ type: 'Control', scope: `#/properties/${key}` })),
});

/** Applicant (Contact, Extra) → Condition on `kind` → (biz) Business | (default) Review. */
const FLOW = el({
  type: 'Flow',
  options: {
    // `review: false` (rule 47 turns the review page on by default): these tests are about Submit on the last
    // Form of the path, which a review page would move to a page of its own.
    review: false,
    edges: [
      { id: 'e1', source: 's1', target: 'x' },
      { id: 'e2', source: 'x', target: 's2', sourceHandle: 'c1' },
      { id: 'e3', source: 'x', target: 's3' },
      { id: 'e4', source: 's2', target: 's3' },
    ],
  },
  elements: [
    {
      type: 'Stage',
      label: 'Applicant',
      id: 's1',
      elements: [form('f-contact', 'Contact', ['name', 'kind']), form('f-extra', 'Extra', [])],
    },
    {
      type: 'Condition',
      id: 'x',
      options: { criteria: [{ id: 'c1', field: 'kind', operator: 'equals', value: 'biz' }] },
    },
    {
      type: 'Stage',
      label: 'Business',
      id: 's2',
      elements: [form('f-biz', 'About the business', ['bizName'])],
    },
    {
      type: 'Stage',
      label: 'Review',
      id: 's3',
      elements: [form('f-review', 'Confirm', ['agree'])],
    },
  ],
});

function Harness({ initial }: { initial: Record<string, unknown> }) {
  const [data, setData] = useState<Record<string, unknown>>(initial);
  return (
    <>
      {/* A host replacing the answers under the runner — a restored draft, say — without any rail navigation. */}
      <button type="button" onClick={() => setData(({ name: _name, ...rest }) => rest)}>
        Host clears name
      </button>
      <FormRunner schema={schema} uischema={FLOW} data={data} onChange={setData} />
    </>
  );
}

const settle = () => act(async () => {});
const sidebar = () => screen.getByRole('navigation', { name: 'Steps' });
const stageRow = (id: string) =>
  sidebar().querySelector<HTMLElement>(`[data-slot="runner-stage"][data-stage-id="${id}"]`);
const stageButton = (id: string) =>
  within(stageRow(id) as HTMLElement).getAllByRole('button')[0] as HTMLElement;
const flagged = (element: Element | null) =>
  element?.querySelector('[data-slot="runner-error-flag"]') != null;
const submitButton = () => screen.getByRole('button', { name: 'Submit' });
const currentForm = () => sidebar().querySelector('[aria-current="page"]');

const required = (key: string) => ({
  instancePath: '',
  keyword: 'required',
  params: { missingProperty: key },
});

describe('pathErrors (rule 27b)', () => {
  it('ignores an error owned only by a Form off the path', () => {
    const result = pathErrors(FLOW, ['s1', 's3'], schema, [required('bizName')]);
    expect(result.submitBlocked).toBe(false);
    expect(result.erroredForms.size).toBe(0);
  });

  it('blocks on a path Form, naming the first in path order', () => {
    const result = pathErrors(FLOW, ['s1', 's3'], schema, [
      { instancePath: '/agree', keyword: 'maxLength', params: {} },
      required('name'),
    ]);
    expect(result.submitBlocked).toBe(true);
    expect(result.firstError && formKey(result.firstError)).toBe('s1/f-contact');
    expect([...result.erroredForms]).toEqual(['s1/f-contact', 's3/f-review']);
  });

  it('blocks on an error NO Form owns, with nowhere to send the citizen', () => {
    const result = pathErrors(FLOW, ['s1', 's3'], schema, [
      { instancePath: '', keyword: 'additionalProperties', params: {} },
    ]);
    expect(result).toMatchObject({ submitBlocked: true, firstError: undefined });
  });
});

const nextButton = () => screen.getByRole('button', { name: 'Next' });

/** Contact → Extra → Review with Next (upcoming stages are locked, rule 25c), so every stage is reached. */
async function reachReview() {
  fireEvent.click(nextButton());
  await waitFor(() => expect(currentForm()).toHaveTextContent('Extra'));
  fireEvent.click(nextButton());
  await waitFor(() => expect(stageButton('s3')).toHaveAttribute('aria-current', 'step'));
}

/**
 * Reach Review, then have the HOST clear the required name. Rule 24b means the citizen can no longer walk past a broken
 * page themselves, so a Form left with errors now comes from outside the runner.
 */
async function leaveContactBroken() {
  await reachReview();
  fireEvent.click(screen.getByRole('button', { name: 'Host clears name' }));
}

describe('the runner (rules 27b-27d)', () => {
  it('does not flag the Form on screen, but flags it once the citizen leaves it with errors', async () => {
    render(<Harness initial={{ kind: 'person' }} />);
    await settle();
    // Contact is on screen with `name` missing: its message shows on the page, so the rail stays quiet.
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(flagged(stageRow('s1'))).toBe(false);
  });

  it('flags a visited Form whose answers broke after the citizen left it', async () => {
    render(<Harness initial={{ kind: 'person', name: 'Ada' }} />);
    await settle();
    await leaveContactBroken();

    await waitFor(() => expect(flagged(stageRow('s1'))).toBe(true));
    expect(stageRow('s1')).toHaveTextContent('has errors');
    expect(flagged(stageRow('s3'))).toBe(false);
  });

  it('keeps Submit pressable and takes the citizen to the first errored Form, flagged, with its message', async () => {
    render(<Harness initial={{ kind: 'person', name: 'Ada' }} />);
    await settle();
    await leaveContactBroken();
    // JSONForms reports errors on a debounce, so wait until they have reached the runner before pressing Submit.
    await waitFor(() => expect(flagged(stageRow('s1'))).toBe(true));

    expect(submitButton()).toBeEnabled();
    fireEvent.click(submitButton());

    await waitFor(() => expect(currentForm()).toHaveTextContent('Contact'));
    // After a Submit attempt even the Form on screen is flagged.
    expect(flagged(currentForm())).toBe(true);
    expect(screen.getByText('is a required property')).toBeInTheDocument();
    // No submission happened.
    expect(screen.queryByRole('dialog', { name: 'Submission preview' })).toBeNull();
  });

  it('submits with a required field left empty on the branch NOT taken', async () => {
    // `bizName` is required, but a person never reaches Business.
    render(<Harness initial={{ kind: 'person', name: 'Ada' }} />);
    await settle();
    await reachReview();
    // There is no visible error to wait for here, so outlast JSONForms' 10ms error debounce explicitly: without it
    // Submit could be pressed before the `bizName` error exists, and this would pass for the wrong reason.
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

    expect(submitButton()).toBeEnabled();
    fireEvent.click(submitButton());

    // No handler is passed, so Submit opens the payload preview (rule 38) rather than jumping anywhere.
    expect(await screen.findByRole('dialog', { name: 'Submission preview' })).toBeInTheDocument();
  });

  it('marks a flagged stage with a dot and a spoken hint when the rail is collapsed', async () => {
    render(<Harness initial={{ kind: 'person', name: 'Ada' }} />);
    await settle();
    await leaveContactBroken();

    await waitFor(() => expect(flagged(stageRow('s1'))).toBe(true));
    fireEvent.click(screen.getByRole('button', { name: 'Collapse steps' }));

    expect(stageRow('s1')?.querySelector('[data-slot="runner-error-dot"]')).not.toBeNull();
    expect(
      within(sidebar()).getByRole('button', { name: 'Step 1: Applicant, has errors' }),
    ).toBeInTheDocument();
    expect(stageRow('s3')?.querySelector('[data-slot="runner-error-dot"]')).toBeNull();
  });
});

describe('forward moves wait for unfinished pages (rule 24b)', () => {
  const forms = [
    { stageId: 's1', formId: 'a' },
    { stageId: 's1', formId: 'b' },
    { stageId: 's2', formId: 'c' },
  ];
  const gate = (errored: string[]) => ({
    forms: forms.map((entry) => ({ ...entry, element: el({ type: 'Form', elements: [] }) })),
    erroredForms: new Set(errored),
  });

  it('always allows moving back or staying', () => {
    expect(mayOpen(gate(['s1/a', 's1/b']), forms[2] ?? null, forms[0] as never)).toBe(true);
    expect(mayOpen(gate(['s1/a']), forms[0] ?? null, forms[0] as never)).toBe(true);
  });

  it('refuses a forward target past an errored page, including the one on screen', () => {
    expect(mayOpen(gate(['s1/a']), forms[0] ?? null, forms[1] as never)).toBe(false);
    expect(mayOpen(gate(['s1/b']), forms[0] ?? null, forms[2] as never)).toBe(false);
  });

  it('allows a forward target when only the target itself (or later) has errors', () => {
    expect(mayOpen(gate(['s1/b', 's2/c']), forms[0] ?? null, forms[1] as never)).toBe(true);
  });

  it('closes a later page item while the current page has a required field empty', async () => {
    render(<Harness initial={{ kind: 'person' }} />);
    await settle();
    const extra = () => within(sidebar()).getByRole('button', { name: /^Extra/ });
    await waitFor(() => expect(extra()).toBeDisabled());
    expect(extra()).toHaveTextContent('complete the current page first');

    fireEvent.change(screen.getByRole('textbox', { name: /^Name/ }), { target: { value: 'Ada' } });
    await waitFor(() => expect(extra()).toBeEnabled());
  });

  it('closes a VISITED later stage once the citizen goes back and breaks a page', async () => {
    render(<Harness initial={{ kind: 'person', name: 'Ada' }} />);
    await settle();
    await reachReview();
    fireEvent.click(stageButton('s1'));
    await waitFor(() => expect(currentForm()).toHaveTextContent('Contact'));

    fireEvent.change(screen.getByRole('textbox', { name: /^Name/ }), { target: { value: '' } });

    await waitFor(() => expect(stageButton('s3')).toBeDisabled());
    expect(stageButton('s3')).toHaveTextContent('complete the current page first');
    // Going back is never gated — Applicant is where they are, and it stays open.
    expect(stageButton('s1')).toBeEnabled();
  });
});
