import { rankWith, uiTypeIs, type LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { mdiDeleteOutline, mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { DataTable, type DataTableColumnDef } from '@repo/ui/data-table';
import { useMemo, useRef } from 'react';
import {
  addColumn,
  addRow,
  removeRow,
  setCell,
  tableContent,
  type TableContent,
} from '../ui/table-content';
import { TableRenderer } from '../ui/table-renderer';
import { InlineTextInput } from './inline-text-input';
import { mayEdit, useStudioEditor } from './studio-editor';
import { ELEMENT_INSET, STUDIO_INTERACTIVE, useStudioElement } from './studio-element';
import { TableHeaderEditor } from './table-header-editor';

type Row = string[];
type Write = (content: TableContent) => void;

/** Outranks the spread ui Table (doc 265 rule 4). */
export const studioTableTester = rankWith(2, uiTypeIs('Table'));

/**
 * A Table the author writes in place (doc 265 rules 4-7): headers, cells, rows and columns. Every edit writes BOTH
 * option keys through the uischema `update` port, so it is editable in every variant; the template's Content setting
 * gates it. Otherwise it draws the read-only Table.
 */
export function StudioTableRenderer(props: LayoutProps) {
  const editor = useStudioEditor();
  const element = useStudioElement();
  const options = (props.uischema as { options?: unknown }).options;
  const content = useMemo(() => tableContent(options), [options]);
  const editable = editor !== null && element !== null && mayEdit(editor, element.id, 'content');
  // Cells read the latest content and editor through a ref: columns rebuilt per edit would remount every input.
  const latest = useRef({ content, write: (_: TableContent) => {} });
  latest.current = {
    content,
    write: (next) => {
      if (editor !== null && element !== null)
        editor.update(element.id, { options: { headers: next.headers, rows: next.rows } });
    },
  };
  const columns = useMemo(
    () => editColumns(content.headers.length, latest),
    [content.headers.length],
  );
  if (!editable) return <TableRenderer {...props} />;
  if (!props.visible) return null;
  const write: Write = (next) => latest.current.write(next);
  return (
    <div data-slot="table-content" className={`${ELEMENT_INSET} flex flex-col items-start gap-2`}>
      <DataTable className="w-full" columns={columns} data={content.rows} emptyMessage="No rows." />
      <Button
        variant="outline"
        size="sm"
        className={STUDIO_INTERACTIVE}
        onClick={() => write(addRow(content))}
      >
        <Icon path={mdiPlus} size="0.875rem" aria-hidden />
        Add row
      </Button>
    </div>
  );
}

/** One editable column per header, a Delete row column, and an Add column header (rule 5). */
function editColumns(
  count: number,
  latest: { current: { content: TableContent; write: Write } },
): DataTableColumnDef<Row>[] {
  const write: Write = (next) => latest.current.write(next);
  const cells = Array.from(
    { length: count },
    (_, index): DataTableColumnDef<Row> => ({
      id: String(index),
      accessorFn: (row) => row[index] ?? '',
      enableSorting: false,
      header: () => (
        <TableHeaderEditor index={index} content={latest.current.content} onChange={write} />
      ),
      cell: ({ row, getValue }) => (
        <InlineTextInput
          value={String(getValue() ?? '')}
          label={`Row ${row.index + 1}, column ${index + 1}`}
          allowBlank
          className="w-full"
          onCommit={(text) => write(setCell(latest.current.content, row.index, index, text))}
        />
      ),
    }),
  );
  return [
    ...cells,
    {
      id: '__actions',
      enableSorting: false,
      enableHiding: false,
      header: () => (
        <Button
          variant="ghost"
          size="icon-xs"
          className={STUDIO_INTERACTIVE}
          aria-label="Add column"
          onClick={() => write(addColumn(latest.current.content))}
        >
          <Icon path={mdiPlus} size="0.875rem" aria-hidden />
        </Button>
      ),
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon-xs"
          className={STUDIO_INTERACTIVE}
          aria-label={`Delete row ${row.index + 1}`}
          onClick={() => write(removeRow(latest.current.content, row.index))}
        >
          <Icon path={mdiDeleteOutline} size="0.875rem" aria-hidden />
        </Button>
      ),
    },
  ];
}

export const studioTableEntry = {
  tester: studioTableTester,
  renderer: withJsonFormsLayoutProps(StudioTableRenderer),
};
