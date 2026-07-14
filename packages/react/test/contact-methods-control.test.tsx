import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderers } from '../src/jsonforms-renderers';

// The Service type definition models contact methods as a loose array; the bespoke control is
// dispatched purely by the uischema option `format: 'contact-methods'` (mirrors the richtext field).
const schema: JsonSchema = {
  type: 'object',
  properties: {
    contact_methods: {
      type: 'array',
      title: 'Contact methods',
      items: {
        type: 'object',
        required: ['type'],
        properties: {
          type: { type: 'string', enum: ['phone', 'email', 'address', 'fax', 'links'] },
          label: { type: 'string' },
          description: { type: 'object' },
          entries: { type: 'array' },
        },
      },
    },
  },
};

const uischema = {
  type: 'VerticalLayout',
  elements: [
    {
      type: 'Control',
      scope: '#/properties/contact_methods',
      options: { format: 'contact-methods' },
    },
  ],
} as unknown as UISchemaElement;

function Form({
  onData,
  initial = {},
}: {
  onData?: (data: Record<string, unknown>) => void;
  initial?: Record<string, unknown>;
}) {
  const [data, setData] = useState<Record<string, unknown>>(initial);
  return (
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={data}
      renderers={renderers}
      cells={[]}
      onChange={({ data: next }) => {
        setData(next as Record<string, unknown>);
        onData?.(next as Record<string, unknown>);
      }}
    />
  );
}

// Read the latest emitted contact_methods array from the onChange spy (JsonForms debounces ~10ms —
// always assert inside waitFor, never synchronously after the interaction).
function lastMethods(onData: ReturnType<typeof vi.fn>): unknown[] {
  const last = onData.mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined;
  return (last?.contact_methods as unknown[]) ?? [];
}

describe('contact-methods control (editable)', () => {
  it('renders the control label and an add affordance per contact-method type', () => {
    render(<Form />);
    expect(screen.getByText('Contact methods')).toBeInTheDocument();
    for (const type of ['phone', 'email', 'address', 'fax', 'links']) {
      expect(
        screen.getByRole('button', { name: new RegExp(`add ${type}`, 'i') }),
      ).toBeInTheDocument();
    }
  });

  it('appends a typed method when its add button is clicked', async () => {
    const onData = vi.fn();
    const user = userEvent.setup();
    render(<Form onData={onData} />);

    await user.click(screen.getByRole('button', { name: /add phone/i }));

    await waitFor(() => {
      const methods = lastMethods(onData);
      expect(methods).toHaveLength(1);
      expect((methods[0] as { type?: string }).type).toBe('phone');
    });
  });

  it('renders a label input, a rich-text description editor, and a remove control for a method', async () => {
    const user = userEvent.setup();
    render(<Form initial={{ contact_methods: [{ type: 'phone', label: '', entries: [] }] }} />);

    // Label field.
    expect(screen.getByRole('textbox', { name: /label/i })).toBeInTheDocument();
    // Rich-text description reuses the Lexical toolbar from feature 37.
    expect(screen.getByRole('toolbar', { name: /formatting/i })).toBeInTheDocument();
    // Remove-method control.
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
    expect(user).toBeDefined();
  });

  it('adds a value entry (label + value) to a phone method', async () => {
    const onData = vi.fn();
    const user = userEvent.setup();
    render(
      <Form
        onData={onData}
        initial={{ contact_methods: [{ type: 'phone', label: 'Support', entries: [] }] }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /add (phone number|entry)/i }));
    const value = screen.getByRole('textbox', { name: /number|value/i });
    await user.type(value, '1-800-555-0000');

    await waitFor(() => {
      const methods = lastMethods(onData) as { entries?: { value?: string }[] }[];
      expect(methods[0]?.entries?.at(-1)?.value).toBe('1-800-555-0000');
    });
  });

  it('renders address fields for an address method', () => {
    render(
      <Form initial={{ contact_methods: [{ type: 'address', label: 'HQ', entries: [{}] }] }} />,
    );
    expect(screen.getByRole('textbox', { name: /address line 1/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /city/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /postal code/i })).toBeInTheDocument();
  });

  it('removes a method when its remove control is clicked', async () => {
    const onData = vi.fn();
    const user = userEvent.setup();
    render(
      <Form
        onData={onData}
        initial={{ contact_methods: [{ type: 'email', label: 'X', entries: [] }] }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /remove/i }));

    await waitFor(() => {
      expect(lastMethods(onData)).toHaveLength(0);
    });
  });
});
