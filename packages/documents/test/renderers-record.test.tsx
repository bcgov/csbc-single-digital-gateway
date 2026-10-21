import { JsonForms } from '@jsonforms/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as defaults from '../src/renderers/default/index';
import { relativeItem } from '../src/renderers/ui/record-item';

const ITEM = '#/properties/people/items/properties';
const schema = (extra: Record<string, unknown> = {}) => ({
  type: 'object',
  properties: {
    people: {
      type: 'array',
      title: 'People',
      items: {
        type: 'object',
        properties: {
          first: { type: 'string', title: 'First name' },
          member: { type: 'boolean', title: 'Member' },
        },
      },
      ...extra,
    },
  },
});
const record = (options: Record<string, unknown> = {}, elements?: unknown[]) => ({
  type: 'Control',
  scope: '#/properties/people',
  options: { component: 'record', ...options },
  elements: elements ?? [
    {
      type: 'VerticalLayout',
      elements: [
        { type: 'Control', scope: `${ITEM}/first` },
        { type: 'Control', scope: `${ITEM}/member` },
      ],
    },
  ],
});

function renderRecord({
  uischema = record(),
  data = {},
  readonly = false,
  schemaExtra = {},
}: {
  uischema?: Record<string, unknown>;
  data?: Record<string, unknown>;
  readonly?: boolean;
  schemaExtra?: Record<string, unknown>;
} = {}) {
  const onChange = vi.fn<(data: Record<string, unknown>) => void>();
  const view = render(
    <JsonForms
      schema={schema(schemaExtra)}
      uischema={uischema as never}
      data={data}
      renderers={defaults.renderers}
      cells={defaults.cells}
      readonly={readonly}
      onChange={({ data: next }) => onChange(next as Record<string, unknown>)}
    />,
  );
  const lastData = () => onChange.mock.calls.at(-1)?.[0];
  return { ...view, onChange, lastData };
}

const cards = () => screen.queryAllByRole('group', { name: /^Item \d+$/ });

describe('record — fillable renderer (doc 271 rules 3-8)', () => {
  it('makes item scopes relative and leaves anything else alone', () => {
    expect(
      relativeItem(
        {
          type: 'VerticalLayout',
          elements: [
            { type: 'Control', scope: `${ITEM}/first` },
            { type: 'Control', scope: '#/properties/other' },
          ],
        },
        'people',
      ),
    ).toEqual({
      type: 'VerticalLayout',
      elements: [
        { type: 'Control', scope: '#/properties/first' },
        { type: 'Control', scope: '#/properties/other' },
      ],
    });
  });

  it('takes the record presentation only for component record', () => {
    const { container, unmount } = renderRecord();
    expect(container.querySelector('[data-component="record"]')).not.toBeNull();
    unmount();
    const table = renderRecord({ uischema: { ...record(), options: {} } });
    expect(table.container.querySelector('[data-slot="data-table"]')).not.toBeNull();
  });

  it('opens with one blank, unwritten item and writes typed values into the array', async () => {
    const user = userEvent.setup();
    const { onChange, lastData } = renderRecord();
    expect(cards()).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Remove item/ })).not.toBeInTheDocument();
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(lastData()).toEqual({});
    await user.type(within(cards()[0]!).getByRole('textbox', { name: 'First name' }), 'Bea');
    await waitFor(() => expect(lastData()).toEqual({ people: [{ first: 'Bea' }] }));
  });

  it('adds and removes items, writing undefined when the last is removed', async () => {
    const user = userEvent.setup();
    const { lastData } = renderRecord({ data: { people: [{ first: 'Al' }] } });
    expect(within(cards()[0]!).getByRole('textbox', { name: 'First name' })).toHaveValue('Al');
    await user.click(screen.getByRole('button', { name: 'Add item' }));
    await waitFor(() => expect(lastData()).toEqual({ people: [{ first: 'Al' }, {}] }));
    expect(cards()).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Remove item 1' }));
    await waitFor(() => expect(lastData()).toEqual({ people: [{}] }));
    await user.click(screen.getByRole('button', { name: 'Remove item 1' }));
    await waitFor(() => expect(lastData()).toEqual({}));
    expect(cards()).toHaveLength(1);
  });

  it('honours the row options: minimum, maximum, label and allow flags', () => {
    const { unmount } = renderRecord({
      schemaExtra: { minItems: 2, maxItems: 2 },
      uischema: record({ addLabel: 'Add person' }),
      data: { people: [{}, {}] },
    });
    expect(cards()).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Add person' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove item 1' })).toBeDisabled();
    unmount();
    renderRecord({
      uischema: record({ addRows: false, deleteRows: false }),
      data: { people: [{}] },
    });
    expect(screen.queryByRole('button', { name: /Add item|Remove item/ })).not.toBeInTheDocument();
  });

  it('draws disabled cards with no Add or Remove when disabled', () => {
    renderRecord({ readonly: true, data: { people: [{ first: 'Al' }] } });
    expect(within(cards()[0]!).getByRole('textbox', { name: 'First name' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Add item|Remove item/ })).not.toBeInTheDocument();
  });

  it('says so when the record has no item form', () => {
    renderRecord({ uischema: record({}, []) });
    expect(screen.getByText('This record has no item form.')).toBeInTheDocument();
    fireEvent.click(document.body);
  });
});
