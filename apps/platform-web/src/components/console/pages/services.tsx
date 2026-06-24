import { Button } from '@repo/ui/button';
import { Plus } from 'lucide-react';
import { FilterChip, ListPage } from '@/components/console/list-page';

export function ServicesPage() {
  return (
    <ListPage
      toolbar={
        <>
          <FilterChip label="All statuses" />
          <FilterChip label="Category" />
        </>
      }
      actions={
        <Button size="sm" type="button">
          <Plus className="size-4" aria-hidden />
          New service
        </Button>
      }
      emptyTitle="No services yet"
      emptyDescription="Create one with the New button to group related applications."
    />
  );
}
