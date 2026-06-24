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
 * Header "New" menu. The creation wizards are not built yet (v1), so each item jumps to the relevant
 * list screen where the (placeholder) creation entry points live.
 */
export function NewMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" size="sm">
            <Plus className="size-4" aria-hidden />
            New
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem render={<Link to="/app/services" />}>
          <Package className="size-4" aria-hidden />
          New service
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to="/app/applications" />}>
          <FileText className="size-4" aria-hidden />
          New application
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
