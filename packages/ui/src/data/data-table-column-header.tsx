import { mdiArrowDown, mdiArrowUp, mdiEyeOffOutline, mdiUnfoldMoreHorizontal } from '@mdi/js';
import { Icon } from '@mdi/react';
import type { Column, RowData } from '@tanstack/react-table';
import { Button } from '@ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ui/components/ui/dropdown-menu';
import { cn } from '@ui/lib/utils';
import type { HTMLAttributes } from 'react';
import type { DataTableFeatures } from './data-table/features';

export interface DataTableColumnHeaderProps<
  TData extends RowData,
  TValue,
> extends HTMLAttributes<HTMLDivElement> {
  column: Column<DataTableFeatures, TData, TValue>;
  title: string;
}

/**
 * A header that sorts and hides its column from a menu (doc 263 rule 5). A column that cannot sort draws its title
 * alone — a plain string header is never sortable by click.
 */
export function DataTableColumnHeader<TData extends RowData, TValue>({
  column,
  title,
  className,
  ...props
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return (
      <div className={className} {...props}>
        {title}
      </div>
    );
  }
  const sorted = column.getIsSorted();
  const icon =
    sorted === 'desc' ? mdiArrowDown : sorted === 'asc' ? mdiArrowUp : mdiUnfoldMoreHorizontal;
  return (
    <div
      data-slot="data-table-column-header"
      className={cn('flex items-center gap-2', className)}
      {...props}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="xs"
              className="-ml-2 data-popup-open:bg-muted"
              aria-label={`${title}, sort options`}
            />
          }
        >
          <span>{title}</span>
          <Icon path={icon} size="0.875rem" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="text-xs">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <Icon path={mdiArrowUp} size="0.875rem" aria-hidden />
            Ascending
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <Icon path={mdiArrowDown} size="0.875rem" aria-hidden />
            Descending
          </DropdownMenuItem>
          {column.getCanHide() && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                <Icon path={mdiEyeOffOutline} size="0.875rem" aria-hidden />
                Hide
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
