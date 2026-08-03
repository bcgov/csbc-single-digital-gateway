import { Table, TableBody, TableHeader, TableRow } from '@repo/ui/table';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ListPagination } from '@/components/console/list/list-pagination';
import { ListSearchInput } from '@/components/console/list/list-search-input';
import { SortableHeader } from '@/components/console/list/sortable-header';

function renderHeader(props: Parameters<typeof SortableHeader>[0]) {
  return render(
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader {...props} />
        </TableRow>
      </TableHeader>
      <TableBody />
    </Table>,
  );
}

describe('SortableHeader', () => {
  it('sorts by its column on click', async () => {
    const onSort = vi.fn();
    renderHeader({ column: 'title', label: 'Title', active: 'updated', order: 'desc', onSort });
    await userEvent.click(screen.getByRole('button', { name: /sort by title/i }));
    expect(onSort).toHaveBeenCalledWith('title');
  });

  it('renders ArrowDown when active and order is desc', () => {
    const { container } = renderHeader({
      column: 'title',
      label: 'Title',
      active: 'title',
      order: 'desc',
      onSort: () => {},
    });
    const btn = screen.getByRole('button', { name: /sort by title/i });
    expect(btn).toHaveClass('text-foreground');
    expect(btn).not.toHaveClass('flex-row-reverse');
    expect(container.querySelector('.lucide-arrow-down')).toBeInTheDocument();
  });

  it('renders ArrowUp when active and order is asc', () => {
    const { container } = renderHeader({
      column: 'title',
      label: 'Title',
      active: 'title',
      order: 'asc',
      onSort: () => {},
    });
    const btn = screen.getByRole('button', { name: /sort by title/i });
    expect(btn).toHaveClass('text-foreground');
    expect(container.querySelector('.lucide-arrow-up')).toBeInTheDocument();
  });

  it('renders flex-row-reverse class when align is right', () => {
    renderHeader({
      column: 'title',
      label: 'Title',
      active: 'updated',
      order: 'desc',
      onSort: () => {},
      align: 'right',
    });
    const btn = screen.getByRole('button', { name: /sort by title/i });
    expect(btn).toHaveClass('flex-row-reverse');
  });
});

describe('ListPagination', () => {
  it('renders nothing when everything fits on one page', () => {
    const { container } = render(
      <ListPagination total={5} limit={20} offset={0} onPageChange={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the range and pages forward/back within bounds', async () => {
    const onPageChange = vi.fn();
    render(<ListPagination total={45} limit={20} offset={20} onPageChange={onPageChange} />);
    expect(screen.getByText(/showing/i)).toHaveTextContent('Showing 21–40 of 45');
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /prev/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('disables Prev on the first page and Next on the last', () => {
    const { rerender } = render(
      <ListPagination total={45} limit={20} offset={0} onPageChange={() => {}} />,
    );
    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled();
    rerender(<ListPagination total={45} limit={20} offset={40} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('handles total of 0 when limit is negative to cover the edge case branch', () => {
    render(<ListPagination total={0} limit={-1} offset={0} onPageChange={() => {}} />);
    expect(screen.getByText(/showing/i)).toHaveTextContent('Showing 0–-1 of 0');
  });
});

describe('ListSearchInput', () => {
  it('emits a single trailing term after typing (debounced)', async () => {
    const onChange = vi.fn();
    render(<ListSearchInput value="" onChange={onChange} delay={50} />);
    await userEvent.type(screen.getByRole('searchbox'), 'per');
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('per'));
    // Debounced: one trailing emit, not one per keystroke.
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('clears immediately via the clear button', async () => {
    const onChange = vi.fn();
    render(<ListSearchInput value="permit" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /clear search/i }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('renders with custom placeholder and className', () => {
    render(
      <ListSearchInput
        value=""
        onChange={() => {}}
        placeholder="Search things…"
        className="my-custom-class"
      />,
    );
    expect(screen.getByRole('searchbox')).toHaveAttribute('placeholder', 'Search things…');
    expect(screen.getByRole('searchbox').closest('.my-custom-class')).toBeInTheDocument();
  });

  it('adopts external value changes', () => {
    const { rerender } = render(<ListSearchInput value="first" onChange={() => {}} />);
    expect(screen.getByRole('searchbox')).toHaveValue('first');
    rerender(<ListSearchInput value="second" onChange={() => {}} />);
    expect(screen.getByRole('searchbox')).toHaveValue('second');
  });
});
