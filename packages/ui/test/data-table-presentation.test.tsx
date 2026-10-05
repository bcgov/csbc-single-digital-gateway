import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataTable, type DataTableColumnDef } from '@ui/data/data-table';
import { alignClass, pinClass, tableStyleClass } from '@ui/data/data-table/presentation';

type Fee = { name: string; amount: string };
const FEES: Fee[] = [
  { name: 'Application', amount: '$25' },
  { name: 'Renewal', amount: '$10' },
];
const tableEl = () => screen.getByRole('table');

const columns: DataTableColumnDef<Fee>[] = [
  { accessorKey: 'name', header: 'Fee', meta: { rowHeader: true } },
  { accessorKey: 'amount', header: 'Amount', meta: { align: 'right' } },
];

describe('DataTable presentation (doc 267 rules 1-3)', () => {
  it('names the table by its caption', () => {
    render(<DataTable columns={columns} data={FEES} caption="Service fees" />);
    const table = screen.getByRole('table', { name: 'Service fees' });
    expect(table.querySelector('caption')).toHaveTextContent('Service fees');
  });

  it('omits the header row with showHeader={false}', () => {
    render(<DataTable columns={columns} data={FEES} showHeader={false} />);
    expect(screen.queryByRole('columnheader')).not.toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(2);
  });

  it('renders a rowHeader column as th scope=row and aligns cells by meta.align', () => {
    render(<DataTable columns={columns} data={FEES} />);
    const rowHeaders = screen.getAllByRole('rowheader');
    expect(rowHeaders.map((th) => th.textContent)).toEqual(['Application', 'Renewal']);
    expect(rowHeaders[0]).toHaveAttribute('scope', 'row');
    const amount = within(screen.getAllByRole('row')[1]!).getByRole('cell', { name: '$25' });
    expect(amount).toHaveClass('text-right');
    expect(screen.getByRole('columnheader', { name: 'Amount' })).toHaveClass('text-right');
    expect(screen.getByRole('columnheader', { name: 'Fee' })).not.toHaveClass('text-right');
  });

  it('applies striped, bordered and compact classes to the table', () => {
    const { rerender } = render(<DataTable columns={columns} data={FEES} />);
    expect(tableEl().className).not.toMatch(/nth-child|border\]|py-1/);
    rerender(<DataTable columns={columns} data={FEES} striped bordered compact />);
    expect(tableEl().className).toContain(tableStyleClass({ striped: true }));
    expect(tableEl().className).toContain('[&_td]:border');
    expect(tableEl().className).toContain('[&_td]:py-1');
  });

  it('pins a meta.pin column to the right edge, header and cells (doc 270)', () => {
    const pinned: DataTableColumnDef<Fee>[] = [
      ...columns,
      { id: 'actions', header: 'Actions', cell: () => 'x', meta: { pin: 'right' } },
    ];
    render(<DataTable columns={pinned} data={FEES} />);
    const header = screen.getByRole('columnheader', { name: 'Actions' });
    expect(header).toHaveClass('sticky', 'right-0', 'bg-background', 'w-px');
    for (const cell of screen.getAllByRole('cell', { name: 'x' }))
      expect(cell).toHaveClass('sticky', 'right-0');
    expect(screen.getByRole('columnheader', { name: 'Amount' })).not.toHaveClass('sticky');
    // The table sits in the scrolling container, so the unpinned columns scroll under the pinned one.
    expect(tableEl().closest('[data-slot="table-container"]')).toHaveClass('overflow-x-auto');
    expect(pinClass(undefined)).toBeUndefined();
  });

  it('maps alignments to classes, left being none', () => {
    expect(alignClass(undefined)).toBeUndefined();
    expect(alignClass('left')).toBeUndefined();
    expect(alignClass('center')).toBe('text-center');
    expect(tableStyleClass({})).toBe('');
  });
});
