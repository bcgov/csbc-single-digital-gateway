import { Toaster } from '@repo/ui/sonner';
import type { QueryClient } from '@tanstack/react-query';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';

/** Context every route receives — the shared query client powers the console auth guard. */
export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

/**
 * Doc 209 rule 17: the app's ONE `Toaster`. `@repo/ui` has shipped and exported it since the component set
 * landed, but nothing in either app had ever mounted one — so every `toast()` in this codebase was a silent
 * no-op. It sits at the root rather than in the studio page: a toast host is app chrome, and one per app is
 * what sonner expects.
 */
function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster position="bottom-right" />
    </>
  );
}
