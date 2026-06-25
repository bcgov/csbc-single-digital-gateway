import { Button } from '@repo/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { Link } from '@tanstack/react-router';
import { FileText, Package, Plus } from 'lucide-react';

/**
 * Header "New" menu. Disabled until there is an active workspace; its items jump to the relevant
 * workspace-scoped list screen where the (placeholder) creation entry points live.
 */
export function NewMenu({ slug }: { slug: string | undefined }) {
  const disabled = slug === undefined;
  // slug is only `''` while disabled (the trigger can't open), so these links never resolve with it.
  const params = { slug: slug ?? '' };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" size="sm" disabled={disabled}>
            <Plus className="size-4" aria-hidden />
            New
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem render={<Link to="/app/$slug/services" params={params} />}>
          <Package className="size-4" aria-hidden />
          New service
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to="/app/$slug/applications" params={params} />}>
          <FileText className="size-4" aria-hidden />
          New application
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
