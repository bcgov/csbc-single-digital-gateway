import type { ColumnDef, RowData } from '@tanstack/react-table';
import { Checkbox } from '@ui/components/ui/checkbox';
import type { DataTableFeatures } from './features';

/** The id of the checkbox column `rowSelection` prepends. */
export const SELECTION_COLUMN_ID = 'select';

/** Rule 4: a leading column of checkboxes — the header selects every row on the page. Never sorts or hides. */
export function selectionColumn<TData extends RowData>(): ColumnDef<DataTableFeatures, TData> {
  return {
    id: SELECTION_COLUMN_ID,
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label="Select row"
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(checked)}
      />
    ),
  };
}
