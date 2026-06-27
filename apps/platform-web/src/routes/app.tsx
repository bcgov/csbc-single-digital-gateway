import { useQuery } from '@tanstack/react-query';
import { Outlet, createFileRoute, redirect, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { ConsoleBreadcrumbBar } from '@/components/console/console-breadcrumb-bar';
import { ConsoleHeader } from '@/components/console/console-header';
import { ConsoleSidebar } from '@/components/console/console-sidebar';
import { authQueryOptions } from '@/lib/auth';
import { PageChromeProvider } from '@/lib/page-chrome';
import { loginUrl } from '@/lib/bff';
import { useWorkspaces, workspaceBySlugQueryOptions } from '@/lib/workspaces';

export const Route = createFileRoute('/app')({
  // Fail-closed guard: resolve the session once, redirect anonymous visitors to the BFF login.
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(authQueryOptions());
    if (!user) {
      throw redirect({ href: loginUrl });
    }
    return { user };
  },
  component: ConsoleLayout,
});

function ConsoleLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { data: workspaces = [] } = useWorkspaces();
  const params = useParams({ strict: false });
  const routedSlug = params.slug;
  // Resolve the routed slug against the workspace the $slug loader fetched (cached). A 404 slug
  // resolves to null, so nav/topbar disable exactly as they do with no workspace.
  const { data: routedWorkspace } = useQuery({
    ...workspaceBySlugQueryOptions(routedSlug ?? ''),
    enabled: routedSlug !== undefined,
  });
  // Active workspace: the (valid) routed one, else fall back to the first (for user-scoped /app/account).
  // Undefined ⇒ no active workspace ⇒ nav + topbar actions disabled (switcher + profile stay live).
  const activeSlug = routedSlug ? (routedWorkspace?.slug ?? undefined) : workspaces[0]?.slug;

  return (
    <PageChromeProvider>
      <div className="flex h-svh w-full overflow-hidden bg-background text-foreground">
        <ConsoleSidebar collapsed={collapsed} slug={activeSlug} />
        <div className="flex min-w-0 flex-1 flex-col">
          <ConsoleHeader
            onToggleSidebar={() => setCollapsed((value) => !value)}
            slug={activeSlug}
          />
          <ConsoleBreadcrumbBar />
          <main className="min-h-0 flex-1 overflow-auto bg-muted p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </PageChromeProvider>
  );
}
