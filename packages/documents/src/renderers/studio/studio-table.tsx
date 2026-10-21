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
  contentOptions,
  tableContent,
  tableDisplay,
  type TableContent,
  type TableDisplay,
} from '../ui/table-content';
import { columnMeta, displayProps, TableRenderer } from '../ui/table-renderer';
import { InlineTextInput } from './inline-text-input';
import { revealTableEnd } from './reveal-end';
import { mayEdit, useStudioEditor } from './studio-editor';
import { ELEMENT_INSET, STUDIO_INTERACTIVE, useStudioElement } from './studio-element';
import { TableHeaderEditor } from './table-header-editor';

type Row = string[];

/** Display defaults for building a column's meta from just the flags the editor reads. */
const TABLE_DISPLAY_DEFAULTS: TableDisplay = tableDisplay(undefined);
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
  const display = useMemo(() => tableDisplay(options), [options]);
  const editable = editor !== null && element !== null && mayEdit(editor, element.id, 'content');
  // Cells read the latest content and editor through a ref: columns rebuilt per edit would remount every input.
  const latest = useRef({ content, write: (_: TableContent) => {} });
  latest.current = {
    content,
    write: (next) => {
      if (editor !== null && element !== null)
        editor.update(element.id, { options: contentOptions(next) });
    },
  };
  // Rebuilt only when what a column DRAWS changes — keyed by a string, since `content.align` is a new array per edit and
  // rebuilt columns remount the cell the author just tabbed into.
  const alignKey = content.align.join();
  const { rowHeaders, showHeader } = display;
  const columns = useMemo(
    () => editColumns(content.headers.length, { rowHeaders, showHeader }, latest),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- alignKey stands in for content.align, read via `latest`.
    [content.headers.length, alignKey, rowHeaders, showHeader],
  );
  if (!editable) return <TableRenderer {...props} />;
  if (!props.visible) return null;
  const write: Write = (next) => latest.current.write(next);
  return (
    <div data-slot="table-content" className={`${ELEMENT_INSET} flex flex-col items-start gap-2`}>
      <DataTable
        {...displayProps(display)}
        className="w-full"
        columns={columns}
        data={content.rows}
        emptyMessage="No rows."
      />
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
  shown: Pick<TableDisplay, 'rowHeaders' | 'showHeader'>,
  latest: { current: { content: TableContent; write: Write } },
): DataTableColumnDef<Row>[] {
  const write: Write = (next) => latest.current.write(next);
  const cells = Array.from(
    { length: count },
    (_, index): DataTableColumnDef<Row> => ({
      id: String(index),
      accessorFn: (row) => row[index] ?? '',
      enableSorting: false,
      meta: columnMeta(latest.current.content, { ...TABLE_DISPLAY_DEFAULTS, ...shown }, index),
      // The header row always shows here, carrying the column controls; hidden, it is muted (doc 267 rule 6).
      header: () => (
        <div
          className={shown.showHeader ? undefined : 'opacity-50'}
          title={shown.showHeader ? undefined : 'Header row hidden'}
        >
          <TableHeaderEditor index={index} content={latest.current.content} onChange={write} />
        </div>
      ),
      cell: ({ row, getValue }) => (
        // A column never squeezes below this: past it the columns scroll under the pinned actions (doc 270).
        <div className="min-w-28">
          <InlineTextInput
            value={String(getValue() ?? '')}
            label={`Row ${row.index + 1}, column ${index + 1}`}
            allowBlank
            className="w-full"
            onCommit={(text) => write(setCell(latest.current.content, row.index, index, text))}
          />
        </div>
      ),
    }),
  );
  return [
    ...cells,
    {
      id: '__actions',
      enableSorting: false,
      enableHiding: false,
      // Pinned right: Add column and each Delete row stay in reach while the columns scroll (doc 270).
      meta: { pin: 'right' },
      header: () => (
        <Button
          variant="ghost"
          size="icon-xs"
          className={STUDIO_INTERACTIVE}
          aria-label="Add column"
          onClick={(event) => {
            write(addColumn(latest.current.content));
            revealTableEnd(event.currentTarget);
          }}
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
