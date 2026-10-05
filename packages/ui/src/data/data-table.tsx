import {
  createColumnHelper,
  useTable,
  type ColumnDef,
  type ReactTable,
  type RowData,
} from '@tanstack/react-table';
import { Input } from '@ui/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/components/ui/table';
import { cn } from '@ui/lib/utils';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { DataTablePagination } from './data-table-pagination';
import { DataTableViewOptions } from './data-table-view-options';
import { dataTableFeatures, type DataTableFeatures } from './data-table/features';
import { selectionColumn } from './data-table/selection-column';

export type { DataTableColumnMeta, DataTableFeatures } from './data-table/features';
export { dataTableFeatures } from './data-table/features';

/** A DataTable column (doc 263 rule 1): consumers never need `@tanstack/react-table` themselves. */
export type DataTableColumnDef<TData extends RowData> = ColumnDef<DataTableFeatures, TData>;

/** TanStack's column helper, bound to the DataTable feature set. */
export function createDataTableColumnHelper<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>();
}

export interface DataTableProps<TData extends RowData> {
  columns: DataTableColumnDef<TData>[];
  data: TData[];
  getRowId?: (row: TData, index: number) => string;
  /** Drawn as one full-width row when there are no rows to show. */
  emptyMessage?: ReactNode;
  /** Paginates at this many rows and draws the pagination footer; absent: every row, no footer. */
  pageSize?: number;
  /** A toolbar input filtering rows by one column. */
  filter?: { columnId: string; placeholder: string };
  /** A toolbar menu that shows and hides columns. */
  columnVisibility?: boolean;
  /** A leading checkbox column; the footer counts the selection. */
  rowSelection?: boolean;
  /** Told the selected rows' originals whenever the selection changes. */
  onRowSelectionChange?: (rows: TData[]) => void;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

/** shadcn's Data Table on TanStack Table v9 (doc 263 rules 1-7): every optional feature is opt-in by prop. */
export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  emptyMessage = 'No results.',
  pageSize,
  filter,
  columnVisibility = false,
  rowSelection = false,
  onRowSelectionChange,
  className,
  ...aria
}: DataTableProps<TData>) {
  const allColumns = useMemo(
    () => (rowSelection ? [selectionColumn<TData>(), ...columns] : columns),
    [columns, rowSelection],
  );
  const table = useTable({
    features: dataTableFeatures,
    data,
    columns: allColumns,
    ...(getRowId !== undefined && { getRowId }),
    enableRowSelection: rowSelection,
    initialState: { pagination: { pageIndex: 0, pageSize: pageSize ?? 10 } },
  });
  useSelectionReport(table, onRowSelectionChange);
  const rows =
    pageSize === undefined ? table.getPrePaginatedRowModel().rows : table.getRowModel().rows;
  return (
    <div data-slot="data-table" className={cn('flex flex-col gap-3', className)}>
      {(filter !== undefined || columnVisibility) && (
        <div data-slot="data-table-toolbar" className="flex items-center gap-2">
          {filter !== undefined && <FilterInput table={table} filter={filter} />}
          {columnVisibility && <DataTableViewOptions table={table} />}
        </div>
      )}
      <div className="overflow-hidden rounded-md border">
        <Table {...aria}>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={Math.max(table.getVisibleLeafColumns().length, 1)}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {pageSize !== undefined && <DataTablePagination table={table} showSelection={rowSelection} />}
    </div>
  );
}

function FilterInput<TData extends RowData>({
  table,
  filter,
}: {
  table: ReactTable<DataTableFeatures, TData>;
  filter: { columnId: string; placeholder: string };
}) {
  const column = table.getColumn(filter.columnId);
  const value = column?.getFilterValue();
  return (
    <Input
      placeholder={filter.placeholder}
      aria-label={filter.placeholder}
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => column?.setFilterValue(event.target.value)}
      className="max-w-sm"
    />
  );
}

/** Reports the selected originals on every selection change after mount (rule 4). Held in a ref: inline is safe. */
function useSelectionReport<TData extends RowData>(
  table: ReactTable<DataTableFeatures, TData>,
  onChange: ((rows: TData[]) => void) | undefined,
) {
  const report = useRef(onChange);
  report.current = onChange;
  const selection = table.state.rowSelection;
  const previous = useRef(selection);
  useEffect(() => {
    // By identity, not "skip the first run": StrictMode runs effects twice on mount.
    if (previous.current === selection) return;
    previous.current = selection;
    report.current?.(table.getSelectedRowModel().rows.map((row) => row.original));
  }, [selection, table]);
}
