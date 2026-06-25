import { Button } from '@repo/ui/button';
import { UserPlus } from 'lucide-react';
import { ListPage } from '@/components/console/list-page';

export function TeamPage() {
  return (
    <ListPage
      toolbar={
        <span className="text-sm text-muted-foreground">People with access to this workspace</span>
      }
      actions={
        <Button variant="outline" size="sm" type="button">
          <UserPlus className="size-4" aria-hidden />
          Invite member
        </Button>
      }
      emptyTitle="Just you so far"
      emptyDescription="Use Invite member to add teammates."
    />
  );
}
