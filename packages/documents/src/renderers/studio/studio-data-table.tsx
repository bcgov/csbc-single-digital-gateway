import { and, rankWith, schemaMatches, uiTypeIs, type ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { DataTable, type DataTableColumnDef } from '@repo/ui/data-table';
import { useMemo, useRef } from 'react';
import { useStudioVariant } from '../../studio/variants/variant-context';
import { rowColumn } from '../ui/data-table-control';
import { DataTableField } from '../ui/data-table-field';
import {
  COLUMN_TYPE_NAMES,
  isObjectArray,
  tableColumns,
  type TableColumn,
} from '../ui/object-array';
import type { ColumnEdit } from './column-edit';
import { ColumnHeaderEditor } from './column-header-editor';
import { mayEdit, useStudioEditor } from './studio-editor';
import { ELEMENT_INSET, STUDIO_INTERACTIVE, useStudioElement } from './studio-element';

type Row = Record<string, unknown>;

/** Outranks the spread ui data table (doc 263 rule 18). */
export const studioDataTableTester = rankWith(
  2,
  and(
    uiTypeIs('Control'),
    schemaMatches((schema) => isObjectArray(schema)),
  ),
);

/** The canvas has no answers (`data={}`): one placeholder row naming each column's type (rule 24). */
const PLACEHOLDER_ROWS: Row[] = [{}];

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
  // `send` is rebuilt every render; the columns only need rebuilding when what they show changes.
  const sendRef = useRef(send);
  sendRef.current = send;
  const columns = useMemo(
    () => studioColumns(tableColumns(props.schema), editable, (edit) => sendRef.current?.(edit)),
    [props.schema, editable, sendRef],
  );
  return (
    <div className={ELEMENT_INSET}>
      <DataTableField props={props}>
        {(wiring) => <DataTable {...wiring} columns={columns} data={PLACEHOLDER_ROWS} />}
      </DataTableField>
    </div>
  );
}

/** Each column with its type as the placeholder cell; editable headers and a trailing Add column when editing. */
function studioColumns(
  columns: TableColumn[],
  editable: boolean,
  send: (edit: ColumnEdit) => void,
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
            />
          )
        : column.title,
    ),
    enableSorting: false,
    cell: () => <span className="text-muted-foreground">{COLUMN_TYPE_NAMES[column.type]}</span>,
  }));
  if (!editable) return defs;
  return [
    ...defs,
    {
      id: '__add-column',
      enableSorting: false,
      enableHiding: false,
      header: () => (
        <Button
          variant="ghost"
          size="icon-xs"
          className={STUDIO_INTERACTIVE}
          aria-label="Add column"
          onClick={() => send({ kind: 'add' })}
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
