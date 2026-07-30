import { TableHead } from '@repo/ui/table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type { SortOrder } from '@/lib/list-search';

interface SortableHeaderProps<S extends string> {
  /** The sort key this column sorts by. */
  column: S;
  label: string;
  /** The currently-active sort key + direction (from `useListSearch`). */
  active: S;
  order: SortOrder;
  onSort: (column: S) => void;
  /** Right-align (e.g. numeric columns). */
  align?: 'left' | 'right';
  className?: string;
}

/**
 * A sortable column header (initiative `staff-list-query`). Renders a `TableHead` whose label is a
 * button; clicking sorts by this column (active column flips direction). Reused by every staff list.
 */
export function SortableHeader<S extends string>({
  column,
  label,
  active,
  order,
  onSort,
  align = 'left',
  className,
}: SortableHeaderProps<S>) {
  const isActive = active === column;
  const Icon = isActive ? (order === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(column)}
        aria-label={`Sort by ${label}`}
        className={`-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 font-medium transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none ${
          isActive ? 'text-foreground' : 'text-muted-foreground'
        } ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {label}
        <Icon className={`size-3.5 ${isActive ? 'opacity-100' : 'opacity-50'}`} aria-hidden />
      </button>
    </TableHead>
  );
}
