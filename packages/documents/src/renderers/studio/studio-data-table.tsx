import { and, rankWith, schemaMatches, uiTypeIs, type ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { DataTable, type DataTableColumnDef } from '@repo/ui/data-table';
import { useCallback, useMemo, useRef } from 'react';
import { useStudioVariant } from '../../studio/variants/variant-context';
import { rowColumn } from '../ui/data-table-control';
import { arrayOptions, shownRowCount } from '../ui/array-options';
import { Cell, fillColumns, type FillSource, type WriteRows } from '../ui/data-table-cells';
import { DataTableField } from '../ui/data-table-field';
import {
  COLUMN_TYPE_NAMES,
  columnKeyProblem,
  isObjectArray,
  tableColumns,
  tableRows,
  type TableColumn,
} from '../ui/object-array';
import type { ColumnEdit } from './column-edit';
import { ColumnHeaderEditor } from './column-header-editor';
import { revealTableEnd } from './reveal-end';
import { mayEdit, useStudioEditor } from './studio-editor';
import { ELEMENT_INSET, STUDIO_INTERACTIVE, useStudioElement } from './studio-element';
import { useStudioFill } from './studio-fill';

type Row = Record<string, unknown>;

/** Outranks the spread ui data table (doc 263 rule 18). */
export const studioDataTableTester = rankWith(
  2,
  and(
    uiTypeIs('Control'),
    schemaMatches((schema) => isObjectArray(schema)),
  ),
);

/** The canvas has no answers (`data={}`): one preview row of each column's inert input (doc 269, was rule 24). */
const PLACEHOLDER_ROWS: Row[] = [{}];
const NO_CHANGE = () => {};
/** A column never squeezes below this: past it the columns scroll under the pinned Add column (doc 270). */
const COLUMN_MIN_WIDTH = 'min-w-32';

/**
 * An object array the author shapes in place (doc 263 rules 18-24): its columns' names, types, order and number. Only
 * the default variant, under a template that leaves `columns` free, with an `editColumns` port, edits (rule 19).
 */
export function StudioDataTable(props: ControlProps) {
  const editor = useStudioEditor();
  const element = useStudioElement();
  const variant = useStudioVariant();
  const editColumns = editor?.editColumns;
  const send =
    editor !== null &&
    editColumns !== undefined &&
    element !== null &&
    variant.isDefault &&
    mayEdit(editor, element.id, 'columns')
      ? (edit: ColumnEdit) => editColumns(element.id, edit)
      : undefined;
  const editable = send !== undefined;
  // Doc 281 rule 11: on a fillable canvas the body is the fillable table, under the same editable headers.
  const live = useStudioFill() && props.enabled;
  const fill = useLiveRows(props);
  // `send` is rebuilt every render; the columns only need rebuilding when what they show changes.
  const sendRef = useRef(send);
  sendRef.current = send;
  const { source, deleteRows } = fill;
  const columns = useMemo(() => {
    const shape = tableColumns(props.schema);
    const headed = studioColumns(
      shape,
      editable,
      (edit) => sendRef.current?.(edit),
      (from, to) => columnKeyProblem(props.schema, from, to),
      element?.id ?? '',
    );
    return live ? withFillCells(headed, fillColumns(shape, source, deleteRows)) : headed;
  }, [props.schema, editable, sendRef, element?.id, live, source, deleteRows]);
  return (
    <div className={ELEMENT_INSET}>
      <DataTableField props={props}>
        {(wiring) =>
          live ? (
            <div className="flex flex-col items-start gap-2">
              <DataTable {...wiring} className="w-full" columns={columns} data={fill.shown} />
              {fill.addRow}
            </div>
          ) : (
            <DataTable {...wiring} columns={columns} data={PLACEHOLDER_ROWS} />
          )
        }
      </DataTableField>
    </div>
  );
}

/**
 * The fillable table's rows (doc 281 rule 11, restating doc 264-266's `DataTableControl`): the written rows padded to
 * the shown count, the `FillSource` its cells read through, and the Add row button within the authored limits.
 */
function useLiveRows({ data, schema, uischema, handleChange, path }: ControlProps) {
  const rows = useMemo(() => tableRows(data), [data]);
  const options = useMemo(() => arrayOptions(schema, uischema), [schema, uischema]);
  const shown = useMemo(
    () => [
      ...rows,
      ...Array.from({ length: shownRowCount(rows.length, options) - rows.length }, () => ({})),
    ],
    [rows, options],
  );
  const write = useCallback<WriteRows>((next) => handleChange(path, next), [handleChange, path]);
  const source = useRef<FillSource['current']>({ rows, options, write });
  source.current = { rows, options, write };
  const full = options.maxRows !== undefined && shown.length >= options.maxRows;
  const addRow = options.addRows && (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={STUDIO_INTERACTIVE}
      disabled={full}
      onClick={() => write([...shown, {}])}
    >
      <Icon path={mdiPlus} size="0.875rem" aria-hidden />
      {options.addLabel}
    </Button>
  );
  return { shown, source, deleteRows: options.deleteRows, addRow };
}

/** The studio's columns with each data column's preview cell replaced by its fillable one, and Delete row added. */
function withFillCells(
  headed: DataTableColumnDef<Row>[],
  filled: DataTableColumnDef<Row>[],
): DataTableColumnDef<Row>[] {
  const fillById = new Map(filled.map((def) => [def.id, def]));
  const cells = headed.map((def) => {
    const cell = fillById.get(def.id)?.cell;
    return cell === undefined ? def : { ...def, cell };
  });
  const remove = fillById.get('__delete-row');
  if (remove === undefined) return cells;
  const add = cells.findIndex((def) => def.id === '__add-column');
  return add === -1 ? [...cells, remove] : [...cells.slice(0, add), remove, ...cells.slice(add)];
}

/** Each column with its type as the placeholder cell; editable headers and a trailing Add column when editing. */
function studioColumns(
  columns: TableColumn[],
  editable: boolean,
  send: (edit: ColumnEdit) => void,
  keyProblem: (from: string, to: string) => string | undefined,
  elementId: string,
): DataTableColumnDef<Row>[] {
  const defs = columns.map((column, index) => ({
    ...rowColumn(
      column,
      editable
        ? () => (
            <ColumnHeaderEditor
              column={column}
              index={index}
              count={columns.length}
              onEdit={send}
              keyProblem={keyProblem}
              elementId={elementId}
            />
          )
        : column.title,
    ),
    enableSorting: false,
    // The applicant's own input, drawn inert (doc 269): the canvas has no answers, and a click must only select.
    cell: () => (
      <div inert data-slot="column-preview" className={COLUMN_MIN_WIDTH}>
        <Cell
          column={column}
          value={undefined}
          label={`${column.title}, preview`}
          placeholder={COLUMN_TYPE_NAMES[column.type]}
          onChange={NO_CHANGE}
        />
      </div>
    ),
  }));
  if (!editable) return defs;
  return [
    ...defs,
    {
      id: '__add-column',
      enableSorting: false,
      enableHiding: false,
      // Pinned right: Add column stays in reach while the columns scroll under it (doc 270).
      meta: { pin: 'right' },
      header: () => (
        <Button
          variant="ghost"
          size="icon-xs"
          className={STUDIO_INTERACTIVE}
          aria-label="Add column"
          onClick={(event) => {
            send({ kind: 'add' });
            revealTableEnd(event.currentTarget);
          }}
        >
          <Icon path={mdiPlus} size="0.875rem" aria-hidden />
        </Button>
      ),
      cell: () => null,
    },
  ];
}

export const studioDataTableEntry = {
  tester: studioDataTableTester,
  renderer: withJsonFormsControlProps(StudioDataTable),
};
