import { rankWith, uiTypeIs, type LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { DataTable, type DataTableColumnDef } from '@repo/ui/data-table';
import { useMemo } from 'react';
import { tableContent, tableDisplay, type TableContent, type TableDisplay } from './table-content';

type Row = string[];

/** A static Table (doc 265 rule 3), rank 1; the studio's editable Table outranks it. */
export const tableTester = rankWith(1, uiTypeIs('Table'));

/** Each column's presentation (doc 267 rules 5-6): its alignment, and the FIRST column's row-header flag. */
export function columnMeta(content: TableContent, display: TableDisplay, index: number) {
  return {
    title: content.headers[index] ?? '',
    align: content.align[index] ?? 'left',
    ...(display.rowHeaders && index === 0 && { rowHeader: true }),
  };
}

/** One read-only column per header: plain text, no sorting. */
export function tableColumns(
  content: TableContent,
  display: TableDisplay,
): DataTableColumnDef<Row>[] {
  return content.headers.map((header, index) => ({
    id: String(index),
    accessorFn: (row) => row[index] ?? '',
    header,
    meta: columnMeta(content, display, index),
    enableSorting: false,
  }));
}

/** The DataTable props a Table's display options become (rule 6). */
export function displayProps(display: TableDisplay) {
  return {
    ...(display.caption !== undefined && { caption: display.caption }),
    striped: display.striped,
    bordered: display.bordered,
    compact: display.compact,
  };
}

/** The authored table, read-only: headers and cell text, no sort, pagination or toolbar; nothing without headers. */
export function TableRenderer({ uischema, visible }: LayoutProps) {
  const options = (uischema as { options?: unknown }).options;
  const content = useMemo(() => tableContent(options), [options]);
  const display = useMemo(() => tableDisplay(options), [options]);
  const columns = useMemo(() => tableColumns(content, display), [content, display]);
  if (!visible || content.headers.length === 0) return null;
  return (
    <div data-slot="table-content">
      <DataTable
        {...displayProps(display)}
        showHeader={display.showHeader}
        columns={columns}
        data={content.rows}
        emptyMessage="No rows."
      />
    </div>
  );
}

export const tableEntry = {
  tester: tableTester,
  renderer: withJsonFormsLayoutProps(TableRenderer),
};
