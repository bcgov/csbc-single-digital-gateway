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

/** Workspace switcher in the top bar — lists the caller's workspaces and creates new ones. */
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
        <DropdownMenuTrigger className="flex max-w-[220px] items-center gap-2 rounded-md border border-border px-2 py-1.5 text-left hover:bg-accent">
          <span className="flex size-6 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground">
            <Building2 className="size-3.5" aria-hidden />
          </span>
          <span className="min-w-0 truncate text-[13px] font-medium text-foreground">{label}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
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
