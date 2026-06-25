import { Button } from '@repo/ui/button';
import { useParams } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { ApplicationTypeModal } from '@/components/console/application-type-modal';
import { FilterChip, ListPage } from '@/components/console/list-page';

export function ApplicationsPage() {
  const { slug } = useParams({ strict: false });
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <ListPage
        toolbar={
          <>
            <FilterChip label="All types" />
            <FilterChip label="All statuses" />
          </>
        }
        actions={
          <Button size="sm" type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            New application
          </Button>
        }
        emptyTitle="No applications yet"
        emptyDescription="Add a form or wizard with the New button."
      />
      <ApplicationTypeModal open={createOpen} onOpenChange={setCreateOpen} slug={slug} />
    </>
  );
}
