import { JsonForms } from '@jsonforms/react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers/default/index';

const form = (table: Record<string, unknown>) => ({
  type: 'Form',
  elements: [{ type: 'Table', ...table }],
});

function renderTable(table: Record<string, unknown>) {
  return render(
    <JsonForms
      schema={{ type: 'object', properties: {} }}
      uischema={form(table) as never}
      data={{}}
      renderers={defaults.renderers}
      cells={defaults.cells}
    />,
  );
}

const OPTIONS = {
  headers: ['Fee', 'Amount'],
  rows: [
    ['Application', '$25'],
    ['Renewal', '$10'],
  ],
};

describe('Table — read-only renderer (doc 265 rule 3)', () => {
  describe('rendering', () => {
    it('draws the headers and cell text with no sort, pagination or toolbar', () => {
      const { container } = renderTable({ options: OPTIONS });
      expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
        'Fee',
        'Amount',
      ]);
      const rows = within(screen.getAllByRole('rowgroup')[1]!).getAllByRole('row');
      expect(rows.map((row) => row.textContent)).toEqual(['Application$25', 'Renewal$10']);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(container.querySelector('[data-slot="data-table-pagination"]')).toBeNull();
      expect(container.querySelector('[data-slot="table-content"]')).not.toBeNull();
    });

    it('shows No rows. with headers and no rows, and nothing without headers', () => {
      const { unmount } = renderTable({ options: { headers: ['Fee'], rows: [] } });
      expect(screen.getByRole('cell', { name: 'No rows.' })).toBeInTheDocument();
      unmount();
      const { container } = renderTable({ options: { rows: [['x']] } });
      expect(container.querySelector('[data-slot="table-content"]')).toBeNull();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('renders nothing when hidden', () => {
      renderTable({
        options: OPTIONS,
        rule: { effect: 'HIDE', condition: { scope: '#', schema: {} } },
      });
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });
});
