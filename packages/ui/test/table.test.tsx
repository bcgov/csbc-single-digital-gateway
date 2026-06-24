import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/components/ui/table';

function TestTable() {
  return (
    <Table>
      <TableCaption>Users</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Ada</TableCell>
          <TableCell>Admin</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Grace</TableCell>
          <TableCell>Editor</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

describe('Table', () => {
  it('renders an accessible table with a caption', () => {
    render(<TestTable />);
    const table = screen.getByRole('table', { name: 'Users' });
    expect(table).toBeInTheDocument();
  });

  it('exposes column headers via the columnheader role', () => {
    render(<TestTable />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(2);
    expect(headers[0]).toHaveTextContent('Name');
    expect(headers[1]).toHaveTextContent('Role');
  });

  it('renders every body row with its cells', () => {
    render(<TestTable />);
    // 1 header row + 2 body rows
    expect(screen.getAllByRole('row')).toHaveLength(3);

    const adaRow = screen.getByRole('row', { name: /Ada Admin/ });
    const cells = within(adaRow).getAllByRole('cell');
    expect(cells).toHaveLength(2);
    expect(cells[0]).toHaveTextContent('Ada');
    expect(cells[1]).toHaveTextContent('Admin');
  });

  it('renders cell content as queryable text', () => {
    render(<TestTable />);
    expect(screen.getByText('Grace')).toBeInTheDocument();
    expect(screen.getByText('Editor')).toBeInTheDocument();
  });
});
