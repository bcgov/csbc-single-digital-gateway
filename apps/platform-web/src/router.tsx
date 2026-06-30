import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

/**
 * The app's shared query client — also handed to the router as context for route guards.
 * `refetchOnWindowFocus` is off and retries are capped at 1: the defaults bursted many concurrent
 * credentialed BFF requests on tab refocus, which stampeded the server token-refresh window and
 * produced flaky 401s (see bug 23-B1). Data still refetches on mount, navigation, and staleness.
 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

export const router = createRouter({ routeTree, context: { queryClient } });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
