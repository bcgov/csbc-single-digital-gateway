import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { Link, useParams } from '@tanstack/react-router';
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { CreateWorkspaceModal } from '@/components/console/create-workspace-modal';
import { useWorkspaces } from '@/lib/workspaces';

/** Workspace switcher at the top of the rail — lists the caller's workspaces and creates new ones. */
export function WorkspaceSwitcher() {
  const { data: workspaces = [] } = useWorkspaces();
  const params = useParams({ strict: false });
  const activeSlug = params.slug;
  const active = workspaces.find((workspace) => workspace.slug === activeSlug);
  const [createOpen, setCreateOpen] = useState(false);

  const label = active?.name ?? (workspaces.length === 0 ? 'No workspace' : 'Select workspace');

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-lg border border-sidebar-border p-1.5 text-left hover:bg-sidebar-accent group-data-[collapsed=true]/rail:justify-center group-data-[collapsed=true]/rail:border-transparent">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 leading-tight group-data-[collapsed=true]/rail:hidden">
            <span className="block truncate text-[13px] font-semibold text-sidebar-foreground">
              {label}
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
          {workspaces.length === 0 ? (
            <div className="px-2 py-2 text-sm text-muted-foreground">No workspaces yet</div>
          ) : (
            workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                render={<Link to="/app/$slug" params={{ slug: workspace.slug }} />}
              >
                <Building2 className="size-4" aria-hidden />
                <span className="flex-1 truncate">{workspace.name}</span>
                {workspace.slug === activeSlug ? (
                  <Check className="size-4 text-primary" aria-hidden />
                ) : null}
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-primary" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {createOpen ? (
        <CreateWorkspaceModal dismissable open={createOpen} onOpenChange={setCreateOpen} />
      ) : null}
    </>
  );
}
