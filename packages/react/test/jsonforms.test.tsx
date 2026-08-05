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

  it('renders the root schema title + description as a form header', () => {
    render(
      <JsonForms
        schema={{
          ...schema,
          title: 'Apply for a permit',
          description: 'Tell us about your request.',
        }}
        data={{}}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Apply for a permit' })).toBeInTheDocument();
    expect(screen.getByText('Tell us about your request.')).toBeInTheDocument();
  });

  it('renders no header when the schema has no title/description', () => {
    render(<JsonForms schema={schema} data={{}} onChange={() => {}} />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
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

  it('renders an integer number control with step=1 and min/max attributes (feature 155)', () => {
    const numberSchema: JsonSchema = {
      type: 'object',
      properties: {
        quantity: { type: 'integer', title: 'Quantity', minimum: 1, maximum: 10 },
      },
    };
    render(<JsonForms schema={numberSchema} data={{}} onChange={() => {}} />);
    const input = screen.getByLabelText(/quantity/i);
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('step', '1');
    expect(input).toHaveAttribute('min', '1');
    expect(input).toHaveAttribute('max', '10');
  });

  it('renders a decimal number control with step=any and no bounds when unset (feature 155)', () => {
    const numberSchema: JsonSchema = {
      type: 'object',
      properties: { amount: { type: 'number', title: 'Amount' } },
    };
    render(<JsonForms schema={numberSchema} data={{}} onChange={() => {}} />);
    const input = screen.getByLabelText(/amount/i);
    expect(input).toHaveAttribute('step', 'any');
    expect(input).not.toHaveAttribute('min');
    expect(input).not.toHaveAttribute('max');
  });

  it('sets step from options.decimals and flags over-precision on a decimal number (feature 155)', () => {
    const numberSchema: JsonSchema = {
      type: 'object',
      properties: { price: { type: 'number', title: 'Price' } },
    };
    const uischema = {
      type: 'VerticalLayout',
      elements: [{ type: 'Control', scope: '#/properties/price', options: { decimals: 2 } }],
    } as const;

    // A value with 3 decimals exceeds the 2-place limit → client error + aria-invalid.
    render(
      <JsonForms
        schema={numberSchema}
        uischema={uischema as unknown as import('@jsonforms/core').UISchemaElement}
        data={{ price: 1.234 }}
        onChange={() => {}}
      />,
    );
    const input = screen.getByLabelText(/price/i);
    expect(input).toHaveAttribute('step', '0.01');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/at most 2 decimal/i)).toBeInTheDocument();
  });

  it('does not flag a decimal value within the options.decimals limit (feature 155)', () => {
    const numberSchema: JsonSchema = {
      type: 'object',
      properties: { price: { type: 'number', title: 'Price' } },
    };
    const uischema = {
      type: 'VerticalLayout',
      elements: [{ type: 'Control', scope: '#/properties/price', options: { decimals: 2 } }],
    } as const;

    render(
      <JsonForms
        schema={numberSchema}
        uischema={uischema as unknown as import('@jsonforms/core').UISchemaElement}
        data={{ price: 1.2 }}
        onChange={() => {}}
      />,
    );
    expect(screen.queryByText(/at most 2 decimal/i)).not.toBeInTheDocument();
  });
});
