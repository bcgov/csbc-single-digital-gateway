import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import pkg from '../package.json';
import { DataTable, type DataTableColumnDef } from '@ui/data/data-table';
import { DataTableColumnHeader } from '@ui/data/data-table-column-header';

interface Person {
  name: string;
  age: number;
}

const PEOPLE: Person[] = [
  { name: 'Bea', age: 31 },
  { name: 'Al', age: 45 },
  { name: 'Cy', age: 12 },
];

const plainColumns: DataTableColumnDef<Person>[] = [
  { accessorKey: 'name', header: 'Name', meta: { title: 'Name' } },
  { accessorKey: 'age', header: 'Age', meta: { title: 'Age' } },
];

const sortableColumns: DataTableColumnDef<Person>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
  },
  { accessorKey: 'age', header: 'Age' },
];

/** The body rows' first cell texts, top to bottom. */
const names = () =>
  within(screen.getAllByRole('rowgroup')[1]!)
    .getAllByRole('row')
    .map((row) => within(row).getAllByRole('cell')[0]!.textContent);

const many = (count: number): Person[] =>
  Array.from({ length: count }, (_, i) => ({ name: `P${i + 1}`, age: i }));

describe('DataTable (doc 263)', () => {
  describe('core (rules 1-4, 7)', () => {
    it('renders a header row and one body row per data item through @repo/ui/table', () => {
      render(<DataTable columns={plainColumns} data={PEOPLE} />);
      expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
        'Name',
        'Age',
      ]);
      expect(names()).toEqual(['Bea', 'Al', 'Cy']);
      expect(screen.getByRole('table')).toHaveAttribute('data-slot', 'table');
    });

    it('draws the empty message across every visible column (default No results.)', () => {
      const { rerender } = render(<DataTable columns={plainColumns} data={[]} />);
      const cell = screen.getByRole('cell', { name: 'No results.' });
      expect(cell).toHaveAttribute('colspan', '2');
      rerender(<DataTable columns={plainColumns} data={[]} emptyMessage="Nothing yet" />);
      expect(screen.getByRole('cell', { name: 'Nothing yet' })).toBeInTheDocument();
      expect(screen.queryByText('No results.')).not.toBeInTheDocument();
    });

    it('forwards aria-label / aria-labelledby / aria-describedby to the table', () => {
      render(
        <DataTable
          columns={plainColumns}
          data={PEOPLE}
          aria-label="People"
          aria-labelledby="lbl"
          aria-describedby="desc"
        />,
      );
      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label', 'People');
      expect(table).toHaveAttribute('aria-labelledby', 'lbl');
      expect(table).toHaveAttribute('aria-describedby', 'desc');
    });

    it('marks the root, toolbar and footer with data-slot', () => {
      const { container } = render(
        <DataTable
          columns={plainColumns}
          data={PEOPLE}
          pageSize={10}
          filter={{ columnId: 'name', placeholder: 'Filter names' }}
        />,
      );
      expect(container.querySelector('[data-slot="data-table"]')).not.toBeNull();
      expect(container.querySelector('[data-slot="data-table-toolbar"]')).not.toBeNull();
      expect(container.querySelector('[data-slot="data-table-pagination"]')).not.toBeNull();
    });

    it('renders no toolbar without filter or columnVisibility', () => {
      const { container } = render(<DataTable columns={plainColumns} data={PEOPLE} />);
      expect(container.querySelector('[data-slot="data-table-toolbar"]')).toBeNull();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /view/i })).not.toBeInTheDocument();
    });
  });

  describe('sorting (rule 5)', () => {
    it('sorts ascending then descending from DataTableColumnHeader', async () => {
      const user = userEvent.setup();
      render(<DataTable columns={sortableColumns} data={PEOPLE} />);
      await user.click(screen.getByRole('button', { name: 'Name, sort options' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Ascending' }));
      expect(names()).toEqual(['Al', 'Bea', 'Cy']);
      await user.click(screen.getByRole('button', { name: 'Name, sort options' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Descending' }));
      expect(names()).toEqual(['Cy', 'Bea', 'Al']);
    });

    it('leaves a plain string header unsortable', () => {
      render(<DataTable columns={sortableColumns} data={PEOPLE} />);
      const age = screen.getAllByRole('columnheader')[1]!;
      expect(age).toHaveTextContent('Age');
      expect(within(age).queryByRole('button')).not.toBeInTheDocument();
      expect(names()).toEqual(['Bea', 'Al', 'Cy']);
    });
  });

  describe('pagination (rule 4)', () => {
    it('shows pageSize rows and pages with next / previous', async () => {
      const user = userEvent.setup();
      render(<DataTable columns={plainColumns} data={many(12)} pageSize={5} />);
      expect(names()).toEqual(['P1', 'P2', 'P3', 'P4', 'P5']);
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeDisabled();
      await user.click(screen.getByRole('button', { name: 'Go to next page' }));
      expect(names()).toEqual(['P6', 'P7', 'P8', 'P9', 'P10']);
      await user.click(screen.getByRole('button', { name: 'Go to last page' }));
      expect(names()).toEqual(['P11', 'P12']);
      expect(screen.getByRole('button', { name: 'Go to next page' })).toBeDisabled();
      await user.click(screen.getByRole('button', { name: 'Go to previous page' }));
      expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    });

    it('renders no pagination footer without pageSize', () => {
      const { container } = render(<DataTable columns={plainColumns} data={many(25)} />);
      expect(names()).toHaveLength(25);
      expect(container.querySelector('[data-slot="data-table-pagination"]')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Go to next page' })).not.toBeInTheDocument();
    });
  });

  describe('filtering (rule 4)', () => {
    it('filters rows by the filter column as the user types', async () => {
      const user = userEvent.setup();
      render(
        <DataTable
          columns={plainColumns}
          data={PEOPLE}
          filter={{ columnId: 'name', placeholder: 'Filter names' }}
        />,
      );
      const input = screen.getByRole('textbox', { name: 'Filter names' });
      await user.type(input, 'b');
      expect(names()).toEqual(['Bea']);
      await user.clear(input);
      expect(names()).toEqual(['Bea', 'Al', 'Cy']);
      await user.type(input, 'zz');
      expect(screen.getByRole('cell', { name: 'No results.' })).toBeInTheDocument();
    });
  });

  describe('column visibility (rule 4)', () => {
    it('hides a column from the view options menu', async () => {
      const user = userEvent.setup();
      render(<DataTable columns={plainColumns} data={PEOPLE} columnVisibility />);
      await user.click(screen.getByRole('button', { name: /view/i }));
      const age = await screen.findByRole('menuitemcheckbox', { name: 'Age' });
      expect(age).toHaveAttribute('aria-checked', 'true');
      await user.click(age);
      expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Name']);
      expect(screen.queryByText('31')).not.toBeInTheDocument();
    });
  });

  describe('row selection (rule 4)', () => {
    it('prepends Select all / Select row checkboxes and reports the selected originals', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <DataTable
          columns={plainColumns}
          data={PEOPLE}
          rowSelection
          onRowSelectionChange={onChange}
        />,
      );
      expect(screen.getAllByRole('checkbox', { name: 'Select row' })).toHaveLength(3);
      expect(onChange).not.toHaveBeenCalled();
      await user.click(screen.getAllByRole('checkbox', { name: 'Select row' })[1]!);
      expect(onChange).toHaveBeenLastCalledWith([PEOPLE[1]]);
      await user.click(screen.getByRole('checkbox', { name: 'Select all' }));
      expect(onChange).toHaveBeenLastCalledWith(PEOPLE);
    });

    it('marks selected rows data-state=selected and counts them in the footer', async () => {
      const user = userEvent.setup();
      render(<DataTable columns={plainColumns} data={PEOPLE} rowSelection pageSize={10} />);
      expect(screen.getByText('0 of 3 row(s) selected.')).toBeInTheDocument();
      await user.click(screen.getAllByRole('checkbox', { name: 'Select row' })[0]!);
      const rows = within(screen.getAllByRole('rowgroup')[1]!).getAllByRole('row');
      expect(rows[0]).toHaveAttribute('data-state', 'selected');
      expect(rows[1]).not.toHaveAttribute('data-state');
      expect(screen.getByText('1 of 3 row(s) selected.')).toBeInTheDocument();
    });
  });

  describe('exports (rule 2)', () => {
    it('exposes @repo/ui/data-table and its sibling subpaths', () => {
      const exportsMap = pkg.exports as Record<string, { development?: string }>;
      for (const name of [
        'data-table',
        'data-table-column-header',
        'data-table-pagination',
        'data-table-view-options',
      ]) {
        expect(exportsMap[`./${name}`]?.development, name).toBe(`./src/${name}.ts`);
      }
      expect(exportsMap['./features']).toBeUndefined();
      expect(exportsMap['./selection-column']).toBeUndefined();
    });
  });
});
