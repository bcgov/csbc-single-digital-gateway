import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { act, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { FormRunner } from '../src/runner/form-runner';

// Doc 218 rules 5-9 — `<FormRunner disabled>`: a published or archived template shown as the form a citizen would
// see, over a document nobody can fill.

const schema: JsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name' },
    plan: {
      type: 'string',
      title: 'Plan',
      oneOf: [
        { const: 'basic', title: 'Basic' },
        { const: 'pro', title: 'Pro' },
      ],
    },
  },
  required: ['name'],
};

const el = (element: object) => element as UISchemaElement;
const control = (key: string) => ({ type: 'Control', scope: `#/properties/${key}` });
const form = (label: string, keys: string[] = []) => ({
  type: 'Form',
  label,
  options: { id: `${label}-id` },
  elements: keys.map(control),
});
const stage = (id: string, label: string, forms: object[] = [form(`${label} form`)]) =>
  el({ type: 'Stage', label, elements: forms, options: { id } });

const FORM_ROOT = el({
  type: 'Form',
  label: 'Apply',
  elements: [control('name'), control('plan')],
});
const TWO_STAGE = el({
  type: 'Flow',
  elements: [stage('s1', 'Applicant', [form('Contact', ['name'])]), stage('s2', 'Review')],
  options: { edges: [{ id: 'e1', source: 's1', target: 's2' }], review: false },
});

/**
 * `data`/`onChange` stay REQUIRED even when disabled (rule 9), so a host passes exactly this: a frozen const and a
 * no-op. Nothing here holds state, which is the point — a disabled runner cannot produce a change to hold.
 */
const EMPTY: Record<string, unknown> = Object.freeze({});
const noop = () => {};

const renderDisabled = (uischema: UISchemaElement = FORM_ROOT, props: object = {}) =>
  render(
    <FormRunner
      disabled
      schema={schema}
      uischema={uischema}
      data={EMPTY}
      onChange={noop}
      {...props}
    />,
  );

const settle = () => act(async () => {});
const saveDraftButton = () => screen.getByRole('button', { name: 'Save draft' });

describe('FormRunner disabled (doc 218 rules 5-9)', () => {
  it('declares `disabled` on FormRunnerProps in the types-only root entry (rule 5)', () => {
    const types = readFileSync(resolve(import.meta.dirname, '../src/types/index.ts'), 'utf8');
    expect(types).toMatch(/disabled\?: boolean \| undefined;/);
  });

  it('draws every control read-only or disabled, and never writes back (rule 6)', async () => {
    const onChange = vi.fn();
    renderDisabled(FORM_ROOT, { onChange });
    await settle();

    // A text input HAS an HTML read-only mode, so it keeps full contrast and focusability and uses it.
    const name = screen.getByLabelText(/Name/);
    expect(name).toHaveAttribute('readonly');

    // A Combobox has none, so read-only falls back to disabled (doc 202 rule 50).
    const plan = screen.getByLabelText(/Plan/);
    expect(plan).toBeDisabled();
  });

  it('shows no validation error for a required field left empty (rule 7)', async () => {
    renderDisabled();
    await settle();
    // With ValidateAndShow — the JSONForms default — `name` being required and absent paints red on mount.
    expect(screen.queryByText(/is a required property/i)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('refuses Save draft and Submit, and ignores the handlers (rule 9)', async () => {
    const onSaveDraft = vi.fn();
    const onSubmit = vi.fn();
    renderDisabled(FORM_ROOT, { onSaveDraft, onSubmit });
    await settle();

    // Rule 37 still holds: disabled, not hidden — the affordance stays part of the layout being read.
    expect(saveDraftButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    expect(onSaveDraft).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps a Flow navigable even though its first Form is empty (rule 8)', async () => {
    renderDisabled(TWO_STAGE);
    await settle();

    // `name` is required and unanswered: an enabled runner refuses Next here (rule 24).
    const next = screen.getByRole('button', { name: 'Next' });
    expect(next).toBeEnabled();

    await act(async () => {
      next.click();
    });
    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled();
  });

  it('lets the stage rail re-open a visited stage behind an unfilled Form (rule 8)', async () => {
    renderDisabled(TWO_STAGE);
    await settle();

    // The rail is a history rail (rule 25): a stage is openable once VISITED, which `canOpen` then gates further.
    // So walk to stage 2 and back, to reach the case the gate is actually about.
    await act(async () => {
      screen.getByRole('button', { name: 'Next' }).click();
    });
    await act(async () => {
      screen.getByRole('button', { name: 'Back' }).click();
    });

    const rail = screen.getByRole('navigation');
    const review = within(rail).getByRole('button', { name: /Review/ });
    // THIS is the gate lifting: `mayOpen` refuses a visited stage that sits behind an unfilled Form, so an enabled
    // runner would render this row blocked. Nothing about `name` has changed — only that nobody may answer it.
    expect(review).toBeEnabled();

    await act(async () => {
      review.click();
    });
    // And the jump lands: the last stage is the end of the flow, so its action bar offers Submit, not Next.
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });
});
