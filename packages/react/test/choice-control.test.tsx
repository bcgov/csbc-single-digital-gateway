import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderers } from '../src/jsonforms-renderers';

function Form({
  schema,
  uischema,
  initial = {},
  onData = () => {},
}: {
  schema: JsonSchema;
  uischema: UISchemaElement;
  initial?: Record<string, unknown>;
  onData?: (data: unknown) => void;
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
        onData(next);
      }}
    />
  );
}

const CHOICES = [
  { value: 'r', label: 'Red' },
  { value: 'g', label: 'Green' },
];

describe('ChoiceControl (feature 156, Step 2)', () => {
  it('renders a radio display and emits the picked value', async () => {
    const user = userEvent.setup();
    const onData = vi.fn();
    render(
      <Form
        schema={{ type: 'object', properties: { color: { type: 'string', enum: ['r', 'g'] } } }}
        uischema={
          {
            type: 'Control',
            scope: '#/properties/color',
            label: 'Colour',
            options: { format: 'choice', display: 'radio', choices: CHOICES },
          } as UISchemaElement
        }
        onData={onData}
      />,
    );
    // Labels come from options.choices, not the schema enum values.
    await user.click(screen.getByRole('radio', { name: 'Green' }));
    await waitFor(() => {
      const last = onData.mock.calls.at(-1)?.[0] as { color?: unknown } | undefined;
      expect(last?.color).toBe('g');
    });
  });

  it('renders a checkbox group and emits an array as boxes are toggled', async () => {
    const user = userEvent.setup();
    const onData = vi.fn();
    render(
      <Form
        schema={{
          type: 'object',
          properties: { tags: { type: 'array', items: { type: 'string', enum: ['r', 'g'] } } },
        }}
        uischema={
          {
            type: 'Control',
            scope: '#/properties/tags',
            label: 'Tags',
            options: { format: 'choice', display: 'checkboxes', choices: CHOICES },
          } as UISchemaElement
        }
        onData={onData}
      />,
    );
    await user.click(screen.getByRole('checkbox', { name: 'Red' }));
    await waitFor(() => {
      const last = onData.mock.calls.at(-1)?.[0] as { tags?: unknown } | undefined;
      expect(last?.tags).toEqual(['r']);
    });
    await user.click(screen.getByRole('checkbox', { name: 'Green' }));
    await waitFor(() => {
      const last = onData.mock.calls.at(-1)?.[0] as { tags?: unknown } | undefined;
      expect(last?.tags).toEqual(['r', 'g']);
    });
    // Unchecking removes just that value.
    await user.click(screen.getByRole('checkbox', { name: 'Red' }));
    await waitFor(() => {
      const last = onData.mock.calls.at(-1)?.[0] as { tags?: unknown } | undefined;
      expect(last?.tags).toEqual(['g']);
    });
  });

  it('renders a single select dropdown (Base UI) without throwing and shows its label + value', () => {
    // Base UI Select popup is portalled/positioned → render-safety, not popup interaction (repo convention).
    render(
      <Form
        schema={{ type: 'object', properties: { plan: { type: 'string', enum: ['r', 'g'] } } }}
        uischema={
          {
            type: 'Control',
            scope: '#/properties/plan',
            label: 'Plan',
            options: { format: 'choice', display: 'select', choices: CHOICES },
          } as UISchemaElement
        }
        initial={{ plan: 'g' }}
      />,
    );
    expect(screen.getByText('Plan')).toBeInTheDocument();
    // The trigger shows the authored label for the selected value, not the raw value.
    expect(screen.getByText('Green')).toBeInTheDocument();
  });

  it('renders a multi select dropdown (Base UI) without throwing and shows joined labels', () => {
    render(
      <Form
        schema={{
          type: 'object',
          properties: { plans: { type: 'array', items: { type: 'string', enum: ['r', 'g'] } } },
        }}
        uischema={
          {
            type: 'Control',
            scope: '#/properties/plans',
            label: 'Plans',
            options: { format: 'choice', display: 'select', multiple: true, choices: CHOICES },
          } as UISchemaElement
        }
        initial={{ plans: ['r', 'g'] }}
      />,
    );
    expect(screen.getByText('Plans')).toBeInTheDocument();
    expect(screen.getByText('Red, Green')).toBeInTheDocument();
  });
});
