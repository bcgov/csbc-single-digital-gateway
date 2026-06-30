import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FormRunner } from '../src/form-runner';

function Harness({
  kind,
  definition,
  onSubmit,
}: {
  kind: string;
  definition: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
}) {
  const [data, setData] = useState<Record<string, unknown>>({});
  return (
    <FormRunner
      kind={kind}
      definition={definition}
      data={data}
      onChange={setData}
      onSubmit={onSubmit}
    />
  );
}

const basicDefinition = {
  schema: {
    type: 'object',
    required: ['name'],
    properties: { name: { type: 'string', title: 'Name' } },
  },
  uischema: {
    type: 'VerticalLayout',
    elements: [{ type: 'Control', scope: '#/properties/name' }],
  },
};

const page = (prop: string, required: boolean) => ({
  schema: {
    type: 'object',
    ...(required ? { required: [prop] } : {}),
    properties: { [prop]: { type: 'string', title: prop.toUpperCase() } },
  },
  uischema: {
    type: 'VerticalLayout',
    elements: [{ type: 'Control', scope: `#/properties/${prop}` }],
  },
});

const multiStageDefinition = {
  stages: [
    { id: 's1', name: 'One', pages: [{ id: 'p1', name: 'Page 1', ...page('a', true) }] },
    { id: 's2', name: 'Two', pages: [{ id: 'p2', name: 'Page 2', ...page('b', false) }] },
  ],
};

describe('FormRunner — basic', () => {
  it('blocks submit until required fields are valid, then submits the data', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness kind="basic-form" definition={basicDefinition} onSubmit={onSubmit} />);

    const submit = screen.getByRole('button', { name: 'Submit' });
    await waitFor(() => expect(submit).toBeDisabled()); // required `name` missing

    await user.type(screen.getByRole('textbox'), 'Ann');
    await waitFor(() => expect(submit).toBeEnabled());

    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ann' }));
  });
});

describe('FormRunner — multi-stage', () => {
  it('gates Next per step and submits on the last step', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <Harness kind="multi-stage-form" definition={multiStageDefinition} onSubmit={onSubmit} />,
    );

    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    const next = screen.getByRole('button', { name: 'Next' });
    await waitFor(() => expect(next).toBeDisabled()); // page 1 requires `a`

    await user.type(screen.getByRole('textbox'), 'x');
    await waitFor(() => expect(next).toBeEnabled());
    await user.click(next);

    expect(await screen.findByText('Step 2 of 2')).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Submit' });
    await waitFor(() => expect(submit).toBeEnabled()); // page 2 field optional
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ a: 'x' }));
  });
});
