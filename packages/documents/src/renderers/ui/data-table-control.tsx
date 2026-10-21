import { and, rankWith, schemaMatches, uiTypeIs, type ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { DataTable, type DataTableColumnDef } from '@repo/ui/data-table';
import { DataTableColumnHeader } from '@repo/ui/data-table-column-header';
import { mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { useCallback, useMemo, useRef } from 'react';
import { arrayOptions, shownRowCount } from './array-options';
import { fillColumns, type FillSource, type WriteRows } from './data-table-cells';
import { DataTableField } from './data-table-field';
import {
  formatCell,
  isObjectArray,
  tableColumns,
  tableRows,
  type TableColumn,
} from './object-array';

type Row = Record<string, unknown>;

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
    cell: ({ getValue }) => formatCell(getValue(), column.options),
  };
}

/**
 * An object array (doc 263 rules 15-16, docs 264, 266): enabled, applicants fill its cells — at least one row shows —
 * and add / delete rows within the authored limits; disabled, the read-only table — sortable, paginated, never writing.
 */
export function DataTableControl(props: ControlProps) {
  const { data, schema, uischema, enabled, handleChange, path } = props;
  const rows = useMemo(() => tableRows(data), [data]);
  const options = useMemo(() => arrayOptions(schema, uischema), [schema, uischema]);
  const shown = useMemo(
    () => [
      ...rows,
      ...Array.from({ length: shownRowCount(rows.length, options) - rows.length }, () => ({})),
    ],
    [rows, options],
  );
  const shape = useMemo(() => tableColumns(schema), [schema]);
  const readOnlyColumns = useMemo(
    () =>
      shape.map((column) =>
        rowColumn(column, ({ column: c }) => (
          <DataTableColumnHeader column={c} title={column.title} />
        )),
      ),
    [shape],
  );
  const write = useCallback<WriteRows>((next) => handleChange(path, next), [handleChange, path]);
  const source = useRef<FillSource['current']>({ rows, options, write });
  source.current = { rows, options, write };
  const fillable = useMemo(
    () => fillColumns(shape, source, options.deleteRows),
    [shape, options.deleteRows],
  );
  const full = options.maxRows !== undefined && shown.length >= options.maxRows;
  return (
    <DataTableField props={props}>
      {(wiring) =>
        enabled ? (
          <div className="flex flex-col items-start gap-2">
            <DataTable {...wiring} className="w-full" columns={fillable} data={shown} />
            {options.addRows && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={full}
                onClick={() => write([...shown, {}])}
              >
                <Icon path={mdiPlus} size="0.875rem" aria-hidden />
                {options.addLabel}
              </Button>
            )}
          </div>
        ) : (
          <DataTable
            {...wiring}
            columns={readOnlyColumns}
            data={rows}
            pageSize={options.pageSize}
            emptyMessage="No rows."
          />
        )
      }
    </DataTableField>
  );
}

export const dataTableControlEntry = {
  tester: dataTableControlTester,
  renderer: withJsonFormsControlProps(DataTableControl),
};
