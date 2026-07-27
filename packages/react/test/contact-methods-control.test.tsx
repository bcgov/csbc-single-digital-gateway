import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderers } from '../src/jsonforms-renderers';

// Contact methods are a loose array; the bespoke control is dispatched purely by the uischema option
// `format: 'contact-methods'`. Each method holds ONE value (revision 2 — no entries list).
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
          value: { type: 'string' },
          address_one: { type: 'string' },
          city: { type: 'string' },
          postal_code: { type: 'string' },
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

function lastMethods(onData: ReturnType<typeof vi.fn>): Record<string, unknown>[] {
  const last = onData.mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined;
  return (last?.contact_methods as Record<string, unknown>[]) ?? [];
}

describe('contact-methods control (table + modal editor)', () => {
  it('renders the heading, add button, and an empty-state table placeholder when empty', () => {
    render(<Form />);
    expect(screen.getByRole('heading', { name: /contact methods/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add contact method/i })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText(/no contact methods yet/i)).toBeInTheDocument();
  });

  it('adds a phone method through the modal (pick type → fill form → save)', async () => {
    const onData = vi.fn();
    const user = userEvent.setup();
    render(<Form onData={onData} />);

    await user.click(screen.getByRole('button', { name: /add contact method/i }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(/choose the kind of contact method to add/i),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /phone/i }));
    await user.type(within(dialog).getByRole('textbox', { name: /label/i }), 'Support line');
    // The phone value uses react-phone-number-input — paste an E.164 number (avoids format-as-you-type).
    const phoneField = within(dialog).getByRole('textbox', { name: /number|value/i });
    await user.click(phoneField);
    await user.paste('+12505551234');
    await user.click(within(dialog).getByRole('button', { name: /save|add/i }));

    await waitFor(() => {
      const methods = lastMethods(onData);
      expect(methods).toHaveLength(1);
      expect(methods[0]).toMatchObject({
        type: 'phone',
        label: 'Support line',
        value: '+12505551234',
      });
    });
  });

  it('adds an address method with its address fields', async () => {
    const onData = vi.fn();
    const user = userEvent.setup();
    render(<Form onData={onData} />);

    await user.click(screen.getByRole('button', { name: /add contact method/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /address/i }));
    await user.type(within(dialog).getByRole('textbox', { name: /^label/i }), 'Head office');
    await user.type(
      within(dialog).getByRole('textbox', { name: /address line 1/i }),
      '123 Government St',
    );
    await user.type(within(dialog).getByRole('textbox', { name: /city/i }), 'Victoria');
    await user.type(within(dialog).getByRole('textbox', { name: /province/i }), 'BC');
    await user.type(within(dialog).getByRole('textbox', { name: /country/i }), 'Canada');
    await user.type(within(dialog).getByRole('textbox', { name: /postal code/i }), 'V8V 1X4');
    await user.click(within(dialog).getByRole('button', { name: /save|add/i }));

    await waitFor(() => {
      const methods = lastMethods(onData);
      expect(methods[0]).toMatchObject({
        type: 'address',
        label: 'Head office',
        address_one: '123 Government St',
        city: 'Victoria',
        province: 'BC',
        country: 'Canada',
        postal_code: 'V8V 1X4',
      });
    });
  });

  it('blocks save and shows "Required" errors when required fields are empty', async () => {
    const onData = vi.fn();
    const user = userEvent.setup();
    render(<Form onData={onData} />);

    await user.click(screen.getByRole('button', { name: /add contact method/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /phone/i }));
    await user.click(within(dialog).getByRole('button', { name: /save/i }));

    // Save is blocked (dialog stays open), both required fields show an error, nothing was saved.
    expect(within(dialog).getAllByText(/required/i).length).toBeGreaterThanOrEqual(2);
    expect(lastMethods(onData)).toHaveLength(0);
  });

  it('renders a table with method, details and action columns', () => {
    render(
      <Form
        initial={{
          contact_methods: [{ type: 'phone', label: 'Support line', value: '1-800-555-0000' }],
        }}
      />,
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /contact method/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /details/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /action/i })).toBeInTheDocument();
    expect(screen.getByText('Support line')).toBeInTheDocument();
    expect(screen.getByText('1-800-555-0000')).toBeInTheDocument();
  });

  it('edits a method through the modal', async () => {
    const onData = vi.fn();
    const user = userEvent.setup();
    render(
      <Form
        onData={onData}
        initial={{ contact_methods: [{ type: 'phone', label: 'Support', value: '+12505550000' }] }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /edit/i }));
    const dialog = await screen.findByRole('dialog');
    const valueField = within(dialog).getByRole('textbox', { name: /number|value/i });
    await user.clear(valueField);
    await user.click(valueField);
    await user.paste('+12509998888');
    await user.click(within(dialog).getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(lastMethods(onData)).toHaveLength(1);
      expect(lastMethods(onData)[0]).toMatchObject({ value: '+12509998888' });
    });
  });

  it('deletes a method', async () => {
    const onData = vi.fn();
    const user = userEvent.setup();
    render(
      <Form
        onData={onData}
        initial={{ contact_methods: [{ type: 'email', label: 'X', value: 'x@y.z' }] }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(lastMethods(onData)).toHaveLength(0);
    });
  });

  it('reorders methods with the move-down control', async () => {
    const onData = vi.fn();
    const user = userEvent.setup();
    render(
      <Form
        onData={onData}
        initial={{
          contact_methods: [
            { type: 'phone', label: 'First', value: '111' },
            { type: 'email', label: 'Second', value: 'two@x.z' },
          ],
        }}
      />,
    );

    const [firstMoveDown] = screen.getAllByRole('button', { name: /move down/i });
    if (!firstMoveDown) {
      throw new Error('expected a move-down button');
    }
    await user.click(firstMoveDown);

    await waitFor(() => {
      const methods = lastMethods(onData);
      expect(methods.map((m) => m.label)).toEqual(['Second', 'First']);
    });
  });
});
