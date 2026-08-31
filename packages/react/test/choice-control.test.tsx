import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen, waitFor, within } from '@testing-library/react';
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

const ONE_OF = [
  { const: 'r', title: 'Red' },
  { const: 'g', title: 'Green' },
];

describe('ChoiceControl (feature 167 — schema-native oneOf/const/title)', () => {
  it('renders a radio display and emits the picked value', async () => {
    const user = userEvent.setup();
    const onData = vi.fn();
    render(
      <Form
        schema={{ type: 'object', properties: { color: { type: 'string', oneOf: ONE_OF } } }}
        uischema={
          {
            type: 'Control',
            scope: '#/properties/color',
            label: 'Colour',
            options: { display: 'radio' },
          } as UISchemaElement
        }
        onData={onData}
      />,
    );
    // Labels come from schema.oneOf's `title`, not the raw `const` values.
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
          properties: {
            tags: { type: 'array', items: { type: 'string', oneOf: ONE_OF }, uniqueItems: true },
          },
        }}
        uischema={
          {
            type: 'Control',
            scope: '#/properties/tags',
            label: 'Tags',
            options: { display: 'checkboxes' },
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

  it('renders a single select dropdown from a bare uischema (no options at all)', async () => {
    // Base UI Select popup is portalled/positioned → render-safety, not popup interaction (repo convention).
    const user = userEvent.setup();
    const onData = vi.fn();
    render(
      <Form
        schema={{ type: 'object', properties: { plan: { type: 'string', oneOf: ONE_OF } } }}
        uischema={{ type: 'Control', scope: '#/properties/plan', label: 'Plan' } as UISchemaElement}
        initial={{ plan: 'g' }}
        onData={onData}
      />,
    );
    expect(screen.getByText('Plan')).toBeInTheDocument();
    // The trigger shows the authored label for the selected value, not the raw const.
    expect(screen.getByText('Green')).toBeInTheDocument();

    // The plain (non-combobox) select also gets a clear button once a value is set.
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => {
      const last = onData.mock.calls.at(-1)?.[0] as { plan?: unknown } | undefined;
      expect(last?.plan).toBeUndefined();
    });
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
  });

  it('hides the clear button on a plain single select when no value is set', () => {
    render(
      <Form
        schema={{ type: 'object', properties: { plan: { type: 'string', oneOf: ONE_OF } } }}
        uischema={{ type: 'Control', scope: '#/properties/plan', label: 'Plan' } as UISchemaElement}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
  });

  it('renders a multi select dropdown from a bare array+oneOf schema, shows joined labels, and clears all via the clear button', async () => {
    const user = userEvent.setup();
    const onData = vi.fn();
    render(
      <Form
        schema={{
          type: 'object',
          properties: {
            plans: { type: 'array', items: { type: 'string', oneOf: ONE_OF }, uniqueItems: true },
          },
        }}
        uischema={
          { type: 'Control', scope: '#/properties/plans', label: 'Plans' } as UISchemaElement
        }
        initial={{ plans: ['r', 'g'] }}
        onData={onData}
      />,
    );
    expect(screen.getByText('Plans')).toBeInTheDocument();
    expect(screen.getByText('Red, Green')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    await waitFor(() => {
      const last = onData.mock.calls.at(-1)?.[0] as { plans?: unknown } | undefined;
      expect(last?.plans).toEqual([]);
    });
    expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
  });

  it('renders a filterable combobox for a single-value select when options.combobox is true (feature 168)', async () => {
    const user = userEvent.setup();
    const onData = vi.fn();
    render(
      <Form
        schema={{ type: 'object', properties: { plan: { type: 'string', oneOf: ONE_OF } } }}
        uischema={
          {
            type: 'Control',
            scope: '#/properties/plan',
            label: 'Plan',
            options: { display: 'select', combobox: true },
          } as UISchemaElement
        }
        onData={onData}
      />,
    );
    const input = screen.getByRole('combobox', { name: 'Plan' });
    await user.click(input);
    await user.type(input, 'Gr');
    const listbox = await screen.findByRole('listbox');
    // Typing filters the option list (regression: ComboboxList requires the render-prop children
    // form — a static `.map()` renders every item regardless of the query).
    expect(within(listbox).queryByRole('option', { name: 'Red' })).not.toBeInTheDocument();
    await user.click(within(listbox).getByRole('option', { name: 'Green' }));
    await waitFor(() => {
      const last = onData.mock.calls.at(-1)?.[0] as { plan?: unknown } | undefined;
      expect(last?.plan).toBe('g');
    });
    // The input reflects the authored label of the picked value, not the raw const.
    expect(screen.getByDisplayValue('Green')).toBeInTheDocument();

    // The clear button (feature 168 amendment) resets the value.
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => {
      const last = onData.mock.calls.at(-1)?.[0] as { plan?: unknown } | undefined;
      expect(last?.plan).toBeUndefined();
    });
  });

  it('renders the plain Select trigger (not a typeable Combobox input) when options.combobox is unset/false', () => {
    render(
      <Form
        schema={{ type: 'object', properties: { plan: { type: 'string', oneOf: ONE_OF } } }}
        uischema={
          {
            type: 'Control',
            scope: '#/properties/plan',
            label: 'Plan',
            options: { display: 'select', combobox: false },
          } as UISchemaElement
        }
      />,
    );
    // Base UI's Select trigger also carries role="combobox", so distinguish by element type: the plain
    // Select trigger is a <button>, whereas the feature-168 Combobox variant renders a typeable <input>.
    expect(screen.getByRole('combobox', { name: 'Plan' }).tagName).toBe('BUTTON');
  });

  it('renders a multi-value select as removable chips when options.combobox is true (feature 168)', async () => {
    const user = userEvent.setup();
    const onData = vi.fn();
    render(
      <Form
        schema={{
          type: 'object',
          properties: {
            plans: { type: 'array', items: { type: 'string', oneOf: ONE_OF }, uniqueItems: true },
          },
        }}
        uischema={
          {
            type: 'Control',
            scope: '#/properties/plans',
            label: 'Plans',
            options: { display: 'select', combobox: true },
          } as UISchemaElement
        }
        initial={{ plans: ['r'] }}
        onData={onData}
      />,
    );
    // The pre-selected value renders as a removable chip carrying its authored label.
    expect(screen.getByText('Red')).toBeInTheDocument();
    const removeButton = screen.getByRole('button', { name: 'Remove Red' });
    // "Clear all" is showing (a value is picked) — the Open trigger stays mounted (it's a CSS-driven
    // hide via `group-has-data-[slot=combobox-clear]:hidden`, not jsdom-visible), same one-icon-at-a-
    // time swap the single combobox already does.
    expect(screen.getByRole('button', { name: 'Open' }).className).toContain(
      'group-has-data-[slot=combobox-clear]:hidden',
    );

    const input = screen.getByRole('combobox', { name: 'Plans' });
    await user.click(input);
    await user.type(input, 'Gr');
    const listbox = await screen.findByRole('listbox');
    // Typing filters the option list even in chips mode.
    expect(within(listbox).queryByRole('option', { name: 'Red' })).not.toBeInTheDocument();
    await user.click(within(listbox).getByRole('option', { name: 'Green' }));
    await waitFor(() => {
      const last = onData.mock.calls.at(-1)?.[0] as { plans?: unknown } | undefined;
      expect(last?.plans).toEqual(['r', 'g']);
    });
    // The picked option now also renders as a chip (the listbox may still be open showing it too).
    expect(screen.getByRole('button', { name: 'Remove Green' })).toBeInTheDocument();

    await user.click(removeButton);
    await waitFor(() => {
      const last = onData.mock.calls.at(-1)?.[0] as { plans?: unknown } | undefined;
      expect(last?.plans).toEqual(['g']);
    });

    // "Clear all" (feature 168 amendment) resets every pick at once.
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    await waitFor(() => {
      const last = onData.mock.calls.at(-1)?.[0] as { plans?: unknown } | undefined;
      expect(last?.plans).toEqual([]);
    });
  });

  it('shows an Open trigger (not Clear all) on a multi-value combobox with nothing picked yet', () => {
    render(
      <Form
        schema={{
          type: 'object',
          properties: {
            plans: { type: 'array', items: { type: 'string', oneOf: ONE_OF }, uniqueItems: true },
          },
        }}
        uischema={
          {
            type: 'Control',
            scope: '#/properties/plans',
            label: 'Plans',
            options: { display: 'select', combobox: true },
          } as UISchemaElement
        }
      />,
    );
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
    // Base UI's Combobox.Clear only mounts once there's something to clear.
    expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
  });

  it('does not match a plain enum schema (legacy renderers still own that shape)', () => {
    render(
      <Form
        schema={{ type: 'object', properties: { plan: { type: 'string', enum: ['r', 'g'] } } }}
        uischema={{ type: 'Control', scope: '#/properties/plan', label: 'Plan' } as UISchemaElement}
      />,
    );
    // The generic enum renderer (not ChoiceControl) owns this shape — still renders a dropdown.
    expect(screen.getByText('Plan')).toBeInTheDocument();
  });
});
