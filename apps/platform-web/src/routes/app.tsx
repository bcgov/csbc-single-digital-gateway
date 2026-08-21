import { useQuery } from '@tanstack/react-query';
import { Outlet, createFileRoute, redirect, useParams } from '@tanstack/react-router';
import { ConsoleBreadcrumbBar } from '@/components/console/console-breadcrumb-bar';
import { ConsoleHeader } from '@/components/console/console-header';
import { authQueryOptions } from '@/lib/auth';
import { PageChromeProvider } from '@/lib/page-chrome';
import { loginUrlFor } from '@/lib/bff';
import { workspaceBySlugQueryOptions } from '@/lib/workspaces';

export const Route = createFileRoute('/app')({
  // Fail-closed guard: resolve the session once, redirect anonymous visitors to the BFF login,
  // carrying the requested path so they land back here after logging in (feature 67).
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient.ensureQueryData(authQueryOptions());
    if (!user) {
      throw redirect({ href: loginUrlFor(location.href) });
    }
    return { user };
  },
  component: ConsoleLayout,
});

function ConsoleLayout() {
  const params = useParams({ strict: false });
  const routedSlug = params.slug;
  // Resolve the routed slug against the workspace the $slug loader fetched (cached). A 404 slug
  // resolves to null, so nav/topbar disable (full header, disabled) rather than going minimal.
  const { data: routedWorkspace } = useQuery({
    ...workspaceBySlugQueryOptions(routedSlug ?? ''),
    enabled: routedSlug !== undefined,
  });
  const activeSlug = routedSlug ? (routedWorkspace?.slug ?? undefined) : undefined;
  // No routed workspace (`/app` selection, `/app/account`) ⇒ minimal header (feature 161): brand +
  // notifications + avatar only. A 404 slug keeps `routedSlug` set ⇒ full (disabled) header.
  const minimal = routedSlug === undefined;

  return (
    <PageChromeProvider>
      {/* `overflow-clip`, NOT `overflow-hidden`. `hidden` still creates a scroll container — it only
          hides the scrollbar — so `scrollIntoView` (any anchor jump) happily scrolls it and the whole
          app slides out of view. `clip` creates no scroll container at all, so the shell can never
          be scrolled by anything. Pair this with `relative` on the real scroll containers: see the
          note there for why `sr-only` is what generates the overflow in the first place. */}
      <div className="flex h-svh w-full flex-col overflow-clip bg-background text-foreground">
        <ConsoleHeader slug={activeSlug} minimal={minimal} />
        <ConsoleBreadcrumbBar />
        <main className="min-h-0 flex-1 overflow-auto bg-muted p-6">
          <Outlet />
        </main>
      </div>
    </PageChromeProvider>
  );
}
