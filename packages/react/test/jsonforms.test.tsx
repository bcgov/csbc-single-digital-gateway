import { rankWith } from '@jsonforms/core';
import type { JsonSchema } from '@jsonforms/core';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { JsonForms } from '../src/jsonforms';

const schema: JsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Full name' },
  },
  required: ['name'],
};

// Controlled harness — JSONForms is uncontrolled-friendly but we keep data in state and
// feed it back so we can assert the emitted value.
function Harness({ onData }: { onData: (data: unknown) => void }) {
  const [data, setData] = useState<Record<string, unknown>>({});
  return (
    <JsonForms
      schema={schema}
      data={data}
      onChange={({ data: next }) => {
        setData(next as Record<string, unknown>);
        onData(next);
      }}
    />
  );
}

describe('@repo/react/jsonforms — JsonForms wrapper', () => {
  it('renders design-system controls with NO renderers prop (defaults to @repo/ui set)', () => {
    render(<JsonForms schema={schema} data={{}} onChange={() => {}} />);
    // The default @repo/ui renderer set must render the string control as a labelled input.
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });

  it('invokes onChange with the updated data as the user types', async () => {
    const user = userEvent.setup();
    const onData = vi.fn();
    render(<Harness onData={onData} />);

    await user.type(screen.getByLabelText(/full name/i), 'Ada');

    // @jsonforms/react debounces onChange (~10ms) — wait for the trailing emit.
    await waitFor(() => {
      const last = onData.mock.calls.at(-1)?.[0] as { name?: string } | undefined;
      expect(last?.name).toBe('Ada');
    });
  });

  it('respects an explicit renderers override', () => {
    const override = [
      { tester: rankWith(100, () => true), renderer: () => <div>custom-override</div> },
    ];
    render(<JsonForms schema={schema} data={{}} renderers={override} onChange={() => {}} />);
    // Override wins — the default Input must not be rendered.
    expect(screen.getByText('custom-override')).toBeInTheDocument();
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
  });
});
