import { rankWith, uiTypeIs, type LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { DataTable, type DataTableColumnDef } from '@repo/ui/data-table';
import { useMemo } from 'react';
import { tableContent } from './table-content';

type Row = string[];

/** A static Table (doc 265 rule 3), rank 1; the studio's editable Table outranks it. */
export const tableTester = rankWith(1, uiTypeIs('Table'));

/** One read-only column per header: plain text, no sorting. */
export function tableColumns(headers: readonly string[]): DataTableColumnDef<Row>[] {
  return headers.map((header, index) => ({
    id: String(index),
    accessorFn: (row) => row[index] ?? '',
    header,
    meta: { title: header },
    enableSorting: false,
  }));
}

/** The authored table, read-only: headers and cell text, no sort, pagination or toolbar; nothing without headers. */
export function TableRenderer({ uischema, visible }: LayoutProps) {
  const options = (uischema as { options?: unknown }).options;
  const content = useMemo(() => tableContent(options), [options]);
  const columns = useMemo(() => tableColumns(content.headers), [content.headers]);
  if (!visible || content.headers.length === 0) return null;
  return (
    <div data-slot="table-content">
      <DataTable columns={columns} data={content.rows} emptyMessage="No rows." />
    </div>
  );
}

export const tableEntry = {
  tester: tableTester,
  renderer: withJsonFormsLayoutProps(TableRenderer),
};
