import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderers } from '../src/jsonforms-renderers';

// Drive the registry through vanilla @jsonforms/react so these tests exercise the
// renderers themselves, independent of the @repo/react/jsonforms wrapper.
function Form({
  schema,
  uischema,
  initial = {},
  onData = () => {},
}: {
  schema: JsonSchema;
  uischema?: UISchemaElement;
  initial?: Record<string, unknown>;
  onData?: (data: unknown) => void;
}) {
  const [data, setData] = useState<Record<string, unknown>>(initial);
  return (
    <JsonForms
      schema={schema}
      {...(uischema ? { uischema } : {})}
      data={data}
      renderers={renderers}
      cells={[]}
      onChange={({ data: next }) => {
        setData(next as Record<string, unknown>);
        onData(next);
      }}
    />
  );
}

describe('@repo/react/jsonforms-renderers — registry', () => {
  it('exports a non-empty renderer registry of { tester, renderer } entries', () => {
    expect(Array.isArray(renderers)).toBe(true);
    expect(renderers.length).toBeGreaterThanOrEqual(10);
    for (const entry of renderers) {
      expect(typeof entry.tester).toBe('function');
      expect(entry.renderer).toBeDefined();
    }
  });
});

describe('@repo/react/jsonforms-renderers — control renderers', () => {
  it('renders a string control as a labelled text input', () => {
    render(
      <Form
        schema={{ type: 'object', properties: { name: { type: 'string', title: 'Full name' } } }}
      />,
    );
    const input = screen.getByLabelText(/full name/i);
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  it('renders an integer control as a number spinbutton and emits a number', async () => {
    const user = userEvent.setup();
    const onData = vi.fn();
    render(
      <Form
        schema={{ type: 'object', properties: { age: { type: 'integer', title: 'Age' } } }}
        onData={onData}
      />,
    );
    const input = screen.getByLabelText(/age/i);
    expect(input).toHaveAttribute('type', 'number');
    await user.type(input, '42');
    await waitFor(() => {
      const last = onData.mock.calls.at(-1)?.[0] as { age?: unknown } | undefined;
      expect(last?.age).toBe(42);
    });
  });

  it('renders a boolean control as a checkbox and emits a boolean on toggle', async () => {
    const user = userEvent.setup();
    const onData = vi.fn();
    render(
      <Form
        schema={{
          type: 'object',
          properties: { subscribe: { type: 'boolean', title: 'Subscribe' } },
        }}
        onData={onData}
      />,
    );
    const checkbox = screen.getByRole('checkbox', { name: /subscribe/i });
    await user.click(checkbox);
    await waitFor(() => {
      const last = onData.mock.calls.at(-1)?.[0] as { subscribe?: unknown } | undefined;
      expect(last?.subscribe).toBe(true);
    });
  });

  it('renders a multiline string control as a textarea', () => {
    render(
      <Form
        schema={{ type: 'object', properties: { bio: { type: 'string', title: 'Bio' } } }}
        uischema={
          {
            type: 'Control',
            scope: '#/properties/bio',
            options: { multi: true },
          } as UISchemaElement
        }
      />,
    );
    const field = screen.getByLabelText(/bio/i);
    expect(field.tagName).toBe('TEXTAREA');
  });

  it('marks a required, empty control as aria-invalid and clears it when valid', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { name: { type: 'string', title: 'Full name' } },
      required: ['name'],
    };
    // Distinct keys force a remount so JSONForms re-seeds from the new `initial` data
    // (a plain rerender would keep the first useState seed).
    const { rerender } = render(<Form key="empty" schema={schema} initial={{}} />);
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute('aria-invalid', 'true');

    rerender(<Form key="valid" schema={schema} initial={{ name: 'Ada' }} />);
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute('aria-invalid', 'false');
  });
});

describe('@repo/react/jsonforms-renderers — layouts & jsdom-hostile controls (render-safety)', () => {
  it('renders enum/select, radio, switch, slider and date controls without throwing', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        color: { type: 'string', enum: ['Red', 'Green', 'Blue'], title: 'Colour' },
        plan: { type: 'string', enum: ['Free', 'Pro'], title: 'Plan' },
        active: { type: 'boolean', title: 'Active' },
        volume: { type: 'integer', title: 'Volume' },
        born: { type: 'string', format: 'date', title: 'Born' },
      },
    };
    const uischema: UISchemaElement = {
      type: 'VerticalLayout',
      elements: [
        { type: 'Control', scope: '#/properties/color' },
        { type: 'Control', scope: '#/properties/plan', options: { format: 'radio' } },
        { type: 'Control', scope: '#/properties/active', options: { toggle: true } },
        { type: 'Control', scope: '#/properties/volume', options: { slider: true } },
        { type: 'Control', scope: '#/properties/born' },
      ],
    } as UISchemaElement;
    expect(() => render(<Form schema={schema} uischema={uischema} />)).not.toThrow();
    // Labels from every control are present → all five renderers were dispatched.
    expect(screen.getByText(/colour/i)).toBeInTheDocument();
    expect(screen.getByText(/^plan$/i)).toBeInTheDocument();
    expect(screen.getByText(/active/i)).toBeInTheDocument();
    expect(screen.getByText(/volume/i)).toBeInTheDocument();
    expect(screen.getByText(/born/i)).toBeInTheDocument();
  });

  it('renders Group and Categorization layouts without throwing', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { a: { type: 'string', title: 'A' }, b: { type: 'string', title: 'B' } },
    };
    const uischema: UISchemaElement = {
      type: 'Categorization',
      elements: [
        {
          type: 'Category',
          label: 'Tab One',
          elements: [
            {
              type: 'Group',
              label: 'Group One',
              elements: [{ type: 'Control', scope: '#/properties/a' }],
            },
          ],
        },
        {
          type: 'Category',
          label: 'Tab Two',
          elements: [{ type: 'Control', scope: '#/properties/b' }],
        },
      ],
    } as UISchemaElement;
    expect(() => render(<Form schema={schema} uischema={uischema} />)).not.toThrow();
    expect(screen.getByText(/tab one/i)).toBeInTheDocument();
    expect(screen.getByText(/group one/i)).toBeInTheDocument();
  });
});
