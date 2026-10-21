import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
} from '@tanstack/react-table';
import type { DataTableAlign } from './presentation';

/** What a column may tell the table's own controls about itself. */
export interface DataTableColumnMeta {
  /** The column's name in the view options menu; absent: its id. */
  title?: string;
  /** Its header and cells' text alignment (doc 267 rule 2); absent: left. */
  align?: DataTableAlign;
  /** Its body cells are row headers, `<th scope="row">` (doc 267 rule 2). */
  rowHeader?: boolean;
  /** Pinned to the right edge while the other columns scroll horizontally (doc 270). */
  pin?: 'right';
}

/**
 * The ONE TanStack Table v9 feature set every DataTable runs with (doc 263 rule 3). Module-level, so its identity is
 * stable; which features a table SHOWS is decided by its props, not by building a different set.
 */
export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
  columnMeta: {} as DataTableColumnMeta,
});

export type DataTableFeatures = typeof dataTableFeatures;
