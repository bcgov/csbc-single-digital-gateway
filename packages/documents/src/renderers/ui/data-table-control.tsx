import { and, rankWith, schemaMatches, uiTypeIs, type ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { DataTable, type DataTableColumnDef } from '@repo/ui/data-table';
import { DataTableColumnHeader } from '@repo/ui/data-table-column-header';
import { useMemo } from 'react';
import { DataTableField } from './data-table-field';
import {
  formatCell,
  isObjectArray,
  tableColumns,
  tableRows,
  type TableColumn,
} from './object-array';

type Row = Record<string, unknown>;

/** Rows per page before the table paginates (doc 263 rule 16). */
export const DATA_TABLE_PAGE_SIZE = 10;

/**
 * Any Control over an object array (doc 263 rules 13-14): its only presentation, so absent, `'data-table'` and an
 * unknown `options.component` all draw the table. Multiple choice needs `items.oneOf`, so rank 1 never ties.
 */
export const dataTableControlTester = rankWith(
  1,
  and(
    uiTypeIs('Control'),
    schemaMatches((schema) => isObjectArray(schema)),
  ),
);

/** A column reading its key from a row; its header is the caller's. */
export function rowColumn(
  column: TableColumn,
  header: NonNullable<DataTableColumnDef<Row>['header']>,
): DataTableColumnDef<Row> {
  return {
    id: column.key,
    accessorFn: (row) => row[column.key],
    header,
    meta: { title: column.title },
    cell: ({ getValue }) => formatCell(getValue()),
  };
}

/** The read-only object array (rules 15-17): sortable headers, paginated rows; it never writes. */
export function DataTableControl(props: ControlProps) {
  const { data, schema } = props;
  const columns = useMemo(
    () =>
      tableColumns(schema).map((column) =>
        rowColumn(column, ({ column: c }) => (
          <DataTableColumnHeader column={c} title={column.title} />
        )),
      ),
    [schema],
  );
  const rows = useMemo(() => tableRows(data), [data]);
  return (
    <DataTableField props={props}>
      {(wiring) => (
        <DataTable
          {...wiring}
          columns={columns}
          data={rows}
          pageSize={DATA_TABLE_PAGE_SIZE}
          emptyMessage="No rows."
        />
      )}
    </DataTableField>
  );
}

export const dataTableControlEntry = {
  tester: dataTableControlTester,
  renderer: withJsonFormsControlProps(DataTableControl),
};
