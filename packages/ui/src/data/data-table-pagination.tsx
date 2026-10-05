import {
  mdiChevronDoubleLeft,
  mdiChevronDoubleRight,
  mdiChevronLeft,
  mdiChevronRight,
} from '@mdi/js';
import { Icon } from '@mdi/react';
import type { ReactTable, RowData } from '@tanstack/react-table';
import { Button } from '@ui/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/components/ui/select';
import type { DataTableFeatures } from './data-table/features';

/** The rows-per-page choices; a table's own page size is added when it is not one of them. */
const PAGE_SIZES = [10, 20, 30, 50];

export interface DataTablePaginationProps<TData extends RowData> {
  table: ReactTable<DataTableFeatures, TData>;
  /** Whether to say how many rows are selected (doc 263 rule 4: only with row selection). */
  showSelection?: boolean;
}

/** Page controls, rows per page and, with selection, "n of m row(s) selected" (doc 263 rule 4). */
export function DataTablePagination<TData extends RowData>({
  table,
  showSelection = false,
}: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.state.pagination;
  const sizes = PAGE_SIZES.includes(pageSize)
    ? PAGE_SIZES
    : [...PAGE_SIZES, pageSize].toSorted((a, b) => a - b);
  const pages = Math.max(table.getPageCount(), 1);
  return (
    <div
      data-slot="data-table-pagination"
      className="flex flex-wrap items-center justify-between gap-2 px-2 text-xs"
    >
      <div className="text-muted-foreground flex-1">
        {showSelection &&
          `${table.getFilteredSelectedRowModel().rows.length} of ${table.getFilteredRowModel().rows.length} row(s) selected.`}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger size="sm" className="w-18" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sizes.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span>
          Page {pageIndex + 1} of {pages}
        </span>
        <div className="flex items-center gap-1">
          <PageButton
            label="Go to first page"
            icon={mdiChevronDoubleLeft}
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.firstPage()}
          />
          <PageButton
            label="Go to previous page"
            icon={mdiChevronLeft}
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          />
          <PageButton
            label="Go to next page"
            icon={mdiChevronRight}
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          />
          <PageButton
            label="Go to last page"
            icon={mdiChevronDoubleRight}
            disabled={!table.getCanNextPage()}
            onClick={() => table.lastPage()}
          />
        </div>
      </div>
    </div>
  );
}

function PageButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon path={icon} size="1rem" aria-hidden />
    </Button>
  );
}
