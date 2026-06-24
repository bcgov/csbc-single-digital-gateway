import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react';

const WORKSPACE_NAME = 'Riverton';

/**
 * Workspace switcher at the top of the rail. There is only one workspace in v1 (no backend), so the
 * menu shows the current workspace and an inert "Create workspace" affordance, matching the prototype.
 */
export function WorkspaceSwitcher() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-lg border border-sidebar-border p-1.5 text-left hover:bg-sidebar-accent group-data-[collapsed=true]/rail:justify-center group-data-[collapsed=true]/rail:border-transparent">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Building2 className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 leading-tight group-data-[collapsed=true]/rail:hidden">
          <span className="block truncate text-[13px] font-semibold text-sidebar-foreground">
            {WORKSPACE_NAME}
          </span>
          <span className="block text-[11px] text-muted-foreground">Workspace</span>
        </span>
        <ChevronsUpDown
          className="size-3.5 shrink-0 text-muted-foreground group-data-[collapsed=true]/rail:hidden"
          aria-hidden
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Switch workspace
        </div>
        <DropdownMenuItem>
          <Building2 className="size-4" aria-hidden />
          <span className="flex-1">{WORKSPACE_NAME}</span>
          <Check className="size-4 text-primary" aria-hidden />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-primary">
          <Plus className="size-4" aria-hidden />
          Create workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
