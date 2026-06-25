import { Tabs, TabsList, TabsTrigger } from '@repo/ui/tabs';
import { ListPage } from '@/components/console/list-page';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in-review', label: 'In review' },
  { value: 'needs-changes', label: 'Needs changes' },
  { value: 'approved', label: 'Approved' },
];

export function SubmissionsPage() {
  return (
    <ListPage
      toolbar={
        <Tabs defaultValue="all">
          <TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
      emptyTitle="No submissions yet"
      emptyDescription="They appear here once applicants submit."
    />
  );
}
