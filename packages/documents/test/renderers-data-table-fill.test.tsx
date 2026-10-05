import { JsonForms } from '@jsonforms/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as defaults from '../src/renderers/default/index';

const schema = {
  type: 'object',
  properties: {
    people: {
      type: 'array',
      title: 'People',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' },
          weight: { type: 'number', title: 'Weight' },
          age: { type: 'integer', title: 'Age' },
          member: { type: 'boolean', title: 'Member' },
          extra: { type: 'object', title: 'Extra' },
        },
      },
    },
  },
};
const uischema = { type: 'Control', scope: '#/properties/people' };

function renderFill(data: Record<string, unknown> = {}, { readonly = false } = {}) {
  const onChange = vi.fn<(data: Record<string, unknown>) => void>();
  const view = render(
    <JsonForms
      schema={schema}
      uischema={uischema as never}
      data={data}
      renderers={defaults.renderers}
      cells={defaults.cells}
      readonly={readonly}
      onChange={({ data: next }) => onChange(next as Record<string, unknown>)}
    />,
  );
  const lastPeople = () =>
    onChange.mock.calls.at(-1)?.[0]?.['people'] as Record<string, unknown>[] | undefined;
  return { ...view, onChange, lastPeople };
}

const ROWS = [
  { name: 'Bea', weight: 61.5, age: 31, member: true, extra: { a: 1 } },
  { name: 'Al', age: 45 },
];

describe('data table fill — default renderer (doc 264 rules 1-7)', () => {
  describe('cells (rule 1)', () => {
    it('renders a text input, numeric input, checkbox or text per column type, named by title and row', () => {
      renderFill({ people: ROWS });
      expect(screen.getByRole('textbox', { name: 'Name, row 1' })).toHaveValue('Bea');
      expect(screen.getByRole('textbox', { name: 'Name, row 2' })).toHaveValue('Al');
      const weight = screen.getByRole('spinbutton', { name: 'Weight, row 1' });
      expect(weight).toHaveValue(61.5);
      expect(weight).toHaveAttribute('step', 'any');
      expect(screen.getByRole('spinbutton', { name: 'Age, row 2' })).toHaveAttribute('step', '1');
      expect(screen.getByRole('spinbutton', { name: 'Weight, row 2' })).toHaveValue(null);
      expect(screen.getByRole('checkbox', { name: 'Member, row 1' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Member, row 2' })).not.toBeChecked();
      // An `other` column stays text.
      expect(screen.getByRole('cell', { name: '{"a":1}' })).toBeInTheDocument();
    });
  });

  describe('writes (rule 2)', () => {
    it('writes the whole array with the edited row key set', async () => {
      const { lastPeople } = renderFill({ people: ROWS });
      fireEvent.change(screen.getByRole('textbox', { name: 'Name, row 2' }), {
        target: { value: 'Alf' },
      });
      await waitFor(() => expect(lastPeople()).toEqual([ROWS[0], { name: 'Alf', age: 45 }]));
      fireEvent.change(screen.getByRole('spinbutton', { name: 'Weight, row 2' }), {
        target: { value: '70.25' },
      });
      await waitFor(() =>
        expect(lastPeople()).toEqual([ROWS[0], { name: 'Alf', age: 45, weight: 70.25 }]),
      );
    });

    it('removes the key for an emptied text or number cell and writes true/false for a checkbox', async () => {
      const user = userEvent.setup();
      const { lastPeople } = renderFill({ people: ROWS });
      fireEvent.change(screen.getByRole('textbox', { name: 'Name, row 1' }), {
        target: { value: '' },
      });
      await waitFor(() => expect(lastPeople()?.[0]).not.toHaveProperty('name'));
      fireEvent.change(screen.getByRole('spinbutton', { name: 'Age, row 1' }), {
        target: { value: '' },
      });
      await waitFor(() => expect(lastPeople()?.[0]).not.toHaveProperty('age'));
      await user.click(screen.getByRole('checkbox', { name: 'Member, row 1' }));
      await waitFor(() => expect(lastPeople()?.[0]?.['member']).toBe(false));
      await user.click(screen.getByRole('checkbox', { name: 'Member, row 2' }));
      await waitFor(() => expect(lastPeople()?.[1]?.['member']).toBe(true));
    });
  });

  describe('rows (rule 3)', () => {
    it('appends an empty row from Add row', async () => {
      const user = userEvent.setup();
      const { lastPeople } = renderFill();
      expect(screen.getByRole('cell', { name: 'No rows yet.' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Add row' }));
      await waitFor(() => expect(lastPeople()).toEqual([{}]));
      await user.type(screen.getByRole('textbox', { name: 'Name, row 1' }), 'Cy');
      await waitFor(() => expect(lastPeople()).toEqual([{ name: 'Cy' }]));
      await user.click(screen.getByRole('button', { name: 'Add row' }));
      await waitFor(() => expect(lastPeople()).toEqual([{ name: 'Cy' }, {}]));
    });

    it('deletes a row, and writes undefined when the last row is deleted', async () => {
      const user = userEvent.setup();
      const { lastPeople, onChange } = renderFill({ people: ROWS });
      await user.click(screen.getByRole('button', { name: 'Delete row 1' }));
      await waitFor(() => expect(lastPeople()).toEqual([ROWS[1]]));
      await user.click(screen.getByRole('button', { name: 'Delete row 1' }));
      // JSONForms drops a key written as `undefined`: the data has no `people` at all.
      await waitFor(() => expect(onChange.mock.calls.at(-1)?.[0]).toEqual({}));
      expect(screen.getByRole('cell', { name: 'No rows yet.' })).toBeInTheDocument();
    });
  });

  describe('layout (rule 4)', () => {
    it('shows every row without pagination or sorting and No rows yet. when empty', () => {
      const people = Array.from({ length: 13 }, (_, i) => ({ name: `P${i + 1}` }));
      const { container } = renderFill({ people });
      expect(screen.getAllByRole('textbox', { name: /^Name, row/ })).toHaveLength(13);
      expect(container.querySelector('[data-slot="data-table-pagination"]')).toBeNull();
      expect(screen.queryByRole('button', { name: /sort options/ })).not.toBeInTheDocument();
      const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
      expect(headers.slice(0, 5)).toEqual(['Name', 'Weight', 'Age', 'Member', 'Extra']);
    });
  });

  describe('disabled (rule 5)', () => {
    it('keeps the doc 263 read-only table when disabled and never writes', () => {
      const data = { people: ROWS };
      const { onChange, container } = renderFill(data, { readonly: true });
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Add row' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Delete row/ })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Name, sort options' })).toBeInTheDocument();
      expect(container.querySelector('[data-slot="data-table-pagination"]')).not.toBeNull();
      const body = screen.getAllByRole('rowgroup')[1]!;
      expect(within(body).getAllByRole('row')[0]).toHaveTextContent('Bea');
      for (const [next] of onChange.mock.calls) expect(next).toEqual(data);
    });
  });
});
