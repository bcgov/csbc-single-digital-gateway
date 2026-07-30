import { Button } from '@repo/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ListPaginationProps {
  /** Total matching rows (across all pages). */
  total: number;
  /** Page size. */
  limit: number;
  /** Zero-based row offset of the current page. */
  offset: number;
  /** Navigate to a 1-based page. */
  onPageChange: (page: number) => void;
}

/**
 * Offset pager (initiative `staff-list-query`): a "showing X–Y of N" range with Prev/Next controls.
 * Renders nothing when everything fits on one page. Reused by every staff list surface.
 */
export function ListPagination({ total, limit, offset, onPageChange }: ListPaginationProps) {
  if (total <= limit) return null;
  const page = Math.floor(offset / limit) + 1;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2 text-sm text-muted-foreground">
      <span>
        Showing <span className="text-foreground">{from}</span>–
        <span className="text-foreground">{to}</span> of{' '}
        <span className="text-foreground">{total}</span>
      </span>
      <div className="flex items-center gap-2">
        <span>
          Page {page} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" aria-hidden />
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
