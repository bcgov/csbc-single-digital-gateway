import { ListPage } from '@/components/console/list-page';

export function ReportsPage() {
  return (
    <ListPage
      toolbar={
        <span className="text-sm text-muted-foreground">Saved reports for this workspace</span>
      }
      emptyTitle="No saved reports yet"
      emptyDescription="Reports you save will appear here."
    />
  );
}
