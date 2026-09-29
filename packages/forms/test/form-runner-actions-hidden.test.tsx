import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormRunner } from '../src/runner/form-runner';

// Doc 229 rules 1-2 — `<FormRunner actions={false}>`: a read-only page shows the document and no action bar.

const schema: JsonSchema = {
  type: 'object',
  properties: { name: { type: 'string', title: 'Name' } },
};
const SERVICE_ROOT = {
  type: 'Service',
  label: 'Business licence',
  elements: [
    { type: 'Heading', text: 'Who can apply' },
    { type: 'Control', scope: '#/properties/name' },
  ],
} as unknown as UISchemaElement;

const EMPTY: Record<string, unknown> = Object.freeze({});
const noop = () => {};
const actionBar = () => document.querySelector('[data-slot="runner-actions"]');

describe('FormRunner actions prop (doc 229)', () => {
  it('draws the action bar by default', async () => {
    render(
      <FormRunner disabled schema={schema} uischema={SERVICE_ROOT} data={EMPTY} onChange={noop} />,
    );
    await act(async () => {});

    expect(actionBar()).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('draws no action bar with actions={false}', async () => {
    render(
      <FormRunner
        disabled
        actions={false}
        schema={schema}
        uischema={SERVICE_ROOT}
        data={EMPTY}
        onChange={noop}
      />,
    );
    await act(async () => {});

    expect(actionBar()).toBeNull();
    for (const name of ['Back', 'Save draft', 'Submit', 'Next']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  it('still renders the document read-only with actions={false} and disabled', async () => {
    render(
      <FormRunner
        disabled
        actions={false}
        schema={schema}
        uischema={SERVICE_ROOT}
        data={EMPTY}
        onChange={noop}
      />,
    );
    await act(async () => {});

    expect(screen.getByText('Who can apply')).toBeInTheDocument();
    const name = screen.getByLabelText('Name');
    // Doc 218 rule 6: the readonly presentation — read-only where HTML has it, disabled where it does not.
    expect((name as HTMLInputElement).readOnly || (name as HTMLInputElement).disabled).toBe(true);
  });
});
