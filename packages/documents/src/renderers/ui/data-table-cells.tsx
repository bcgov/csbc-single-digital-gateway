import { mdiDeleteOutline } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { Checkbox } from '@repo/ui/checkbox';
import type { DataTableColumnDef } from '@repo/ui/data-table';
import { Input } from '@repo/ui/input';
import { useEffect, useRef, useState } from 'react';
import type { ArrayOptions } from './array-options';
import { formatCell, type TableColumn } from './object-array';

type Row = Record<string, unknown>;

/** Where a fillable table's edits go: the whole next array, or `undefined` for no rows (doc 264 rules 2-3). */
export type WriteRows = (rows: Row[] | undefined) => void;

/**
 * `rows` with row `index`'s `key` set — an `undefined` value REMOVES the key (doc 264 rule 2). An index past the
 * written rows is a shown blank row (doc 266 rule 2): the rows are first padded up to it with `{}`.
 */
export function withCell(rows: readonly Row[], index: number, key: string, value: unknown): Row[] {
  const padded =
    index < rows.length
      ? rows
      : [...rows, ...Array.from({ length: index + 1 - rows.length }, (): Row => ({}))];
  const next = [...padded];
  const { [key]: _removed, ...rest } = padded[index] ?? {};
  next[index] = value === undefined ? rest : { ...rest, [key]: value };
  return next;
}

/** `rows` without row `index`; none left is `undefined`, never `[]` (rule 3). */
export function withoutRow(rows: readonly Row[], index: number): Row[] | undefined {
  const next = rows.filter((_, i) => i !== index);
  return next.length === 0 ? undefined : next;
}

/** What a fillable table's cells read at the moment they write: the latest written rows, options and writer. */
export interface FillSource {
  current: { rows: readonly Row[]; options: ArrayOptions; write: WriteRows };
}

/**
 * The fillable columns (rule 1): one input per cell by type, then a Delete row button. They depend on the column SHAPE
 * only and read rows through `source`: column definitions rebuilt per keystroke hand TanStack new cell functions, which
 * React mounts as new components — the input under the caret remounts and loses focus after every character.
 */
export function fillColumns(
  columns: readonly TableColumn[],
  source: FillSource,
  deleteRows: boolean,
): DataTableColumnDef<Row>[] {
  const write: WriteRows = (next) => source.current.write(next);
  const cellColumns = columns.map(
    (column): DataTableColumnDef<Row> => ({
      id: column.key,
      accessorFn: (row) => row[column.key],
      header: column.title,
      meta: { title: column.title },
      enableSorting: false,
      cell: ({ row, getValue }) => (
        <Cell
          column={column}
          value={getValue()}
          label={`${column.title}, row ${row.index + 1}`}
          onChange={(value) => write(withCell(source.current.rows, row.index, column.key, value))}
        />
      ),
    }),
  );
  if (!deleteRows) return cellColumns;
  return [
    ...cellColumns,
    {
      id: '__delete-row',
      enableSorting: false,
      enableHiding: false,
      header: () => <span className="sr-only">Actions</span>,
      // Only a WRITTEN row deletes, and never below the minimum (doc 266 rule 3); a shown blank row has nothing to delete.
      cell: ({ row }) => {
        const { rows, options } = source.current;
        if (row.index >= rows.length) return null;
        return (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Delete row ${row.index + 1}`}
            disabled={rows.length <= options.minRows}
            onClick={() => write(withoutRow(source.current.rows, row.index))}
          >
            <Icon path={mdiDeleteOutline} size="0.875rem" aria-hidden />
          </Button>
        );
      },
    },
  ];
}

const CELL_INPUT = 'h-8 px-2 py-1 text-xs';

function Cell({
  column,
  value,
  label,
  onChange,
}: {
  column: TableColumn;
  value: unknown;
  label: string;
  onChange: (value: unknown) => void;
}) {
  switch (column.type) {
    case 'string':
      return (
        <Input
          aria-label={label}
          className={CELL_INPUT}
          value={typeof value === 'string' ? value : ''}
          // An emptied cell removes its key: Ajv counts '' as present (rule 2).
          onChange={(event) => onChange(event.target.value === '' ? undefined : event.target.value)}
        />
      );
    case 'number':
    case 'integer':
      return (
        <NumberCell
          label={label}
          value={value}
          integer={column.type === 'integer'}
          onChange={onChange}
        />
      );
    case 'boolean':
      return (
        <Checkbox
          aria-label={label}
          checked={value === true}
          onCheckedChange={(checked) => onChange(checked)}
        />
      );
    default:
      return formatCell(value);
  }
}

/**
 * A numeric cell (rule 1). It holds its own draft while focused, so a half-typed `1.` or `-` is not normalised out from
 * under the caret; the value written is the number, or `undefined` for an empty or unparseable entry.
 */
function NumberCell({
  label,
  value,
  integer,
  onChange,
}: {
  label: string;
  value: unknown;
  integer: boolean;
  onChange: (value: unknown) => void;
}) {
  const shown = typeof value === 'number' ? String(value) : '';
  const [draft, setDraft] = useState(shown);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (document.activeElement !== input.current) setDraft(shown);
  }, [shown]);
  return (
    <Input
      ref={input}
      type="number"
      step={integer ? 1 : 'any'}
      aria-label={label}
      className={CELL_INPUT}
      value={draft}
      onChange={(event) => {
        const text = event.target.value;
        setDraft(text);
        const parsed = text.trim() === '' ? Number.NaN : Number(text);
        onChange(Number.isFinite(parsed) ? parsed : undefined);
      }}
      onBlur={() => setDraft(shown)}
    />
  );
}
