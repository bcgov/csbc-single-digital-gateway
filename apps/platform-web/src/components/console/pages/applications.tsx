import { Button } from '@repo/ui/button';
import { Plus } from 'lucide-react';
import { FilterChip, ListPage } from '@/components/console/list-page';

export function ApplicationsPage() {
  return (
    <ListPage
      toolbar={
        <>
          <FilterChip label="All types" />
          <FilterChip label="All statuses" />
        </>
      }
      actions={
        <Button size="sm" type="button">
          <Plus className="size-4" aria-hidden />
          New application
        </Button>
      }
      emptyTitle="No applications yet"
      emptyDescription="Add a form or wizard with the New button."
    />
  );
}
