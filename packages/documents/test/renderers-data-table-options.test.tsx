import { JsonForms } from '@jsonforms/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as defaults from '../src/renderers/default/index';

const people = (extra: Record<string, unknown> = {}) => ({
  type: 'object',
  properties: {
    people: {
      type: 'array',
      title: 'People',
      items: { type: 'object', properties: { name: { type: 'string', title: 'Name' } } },
      ...extra,
    },
  },
});

function renderTable({
  schemaExtra = {},
  options = {},
  data = {},
  readonly = false,
}: {
  schemaExtra?: Record<string, unknown>;
  options?: Record<string, unknown>;
  data?: Record<string, unknown>;
  readonly?: boolean;
} = {}) {
  const onChange = vi.fn<(data: Record<string, unknown>) => void>();
  const view = render(
    <JsonForms
      schema={people(schemaExtra)}
      uischema={{ type: 'Control', scope: '#/properties/people', options } as never}
      data={data}
      renderers={defaults.renderers}
      cells={defaults.cells}
      readonly={readonly}
      onChange={({ data: next }) => onChange(next as Record<string, unknown>)}
    />,
  );
  const lastPeople = () => onChange.mock.calls.at(-1)?.[0]?.['people'];
  return { ...view, onChange, lastPeople };
}

const names = () => screen.queryAllByRole('textbox', { name: /^Name, row/ });

describe('data table options — default renderer (doc 266 rules 2-6)', () => {
  it('shows one blank, unwritten row for an empty table', async () => {
    const { onChange } = renderTable();
    expect(names()).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Delete row 1' })).not.toBeInTheDocument();
    // Nothing is written until someone types: the data never gains `people`.
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    for (const [next] of onChange.mock.calls) expect(next).not.toHaveProperty('people');
  });

  it('pads to the minimum and writes the rows up to the one typed into', async () => {
    const { lastPeople } = renderTable({ schemaExtra: { minItems: 3 } });
    expect(names()).toHaveLength(3);
    fireEvent.change(names()[2]!, { target: { value: 'Cy' } });
    await waitFor(() => expect(lastPeople()).toEqual([{}, {}, { name: 'Cy' }]));
  });

  it('disables Delete row at the minimum and Add row at the maximum', () => {
    renderTable({
      schemaExtra: { minItems: 1, maxItems: 2 },
      data: { people: [{ name: 'A' }, { name: 'B' }] },
    });
    expect(screen.getByRole('button', { name: 'Delete row 1' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Add row' })).toBeDisabled();
  });

  it('keeps the minimum when deleting', () => {
    renderTable({ schemaExtra: { minItems: 1 }, data: { people: [{ name: 'A' }] } });
    expect(screen.getByRole('button', { name: 'Delete row 1' })).toBeDisabled();
  });

  it('hides Add row and Delete row when they are not allowed, and labels Add row', async () => {
    const user = userEvent.setup();
    const { unmount } = renderTable({
      options: { addRows: false, deleteRows: false },
      data: { people: [{ name: 'A' }] },
    });
    expect(screen.queryByRole('button', { name: /Add row|Delete row/ })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('columnheader')).toHaveLength(1);
    unmount();
    const { lastPeople } = renderTable({ options: { addLabel: 'Add household member' } });
    await user.click(screen.getByRole('button', { name: 'Add household member' }));
    await waitFor(() => expect(lastPeople()).toEqual([{}, {}]));
  });

  it('paginates the read-only table at the authored page size', () => {
    const rows = Array.from({ length: 7 }, (_, i) => ({ name: `P${i + 1}` }));
    renderTable({ options: { pageSize: 3 }, data: { people: rows }, readonly: true });
    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });
});
