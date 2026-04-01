import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  type RouteComponent,
} from "@tanstack/react-router";
import { useMemo } from "react";

// Type for the navigate function options used in the navigateSpy
type TestRouterNavigateOptions = Parameters<
  ReturnType<typeof createRouter>["navigate"]
>[0];

export interface PartialCreateRoutes {
  path: string;
  component: React.FC;
}

export interface RouterProviderWrapperProps {
  component: RouteComponent | undefined;
  createRoutes: PartialCreateRoutes[];
  initialEntries?: string[];
  navigateSpy?: (options: TestRouterNavigateOptions) => void;
}

/**
 * RouterProviderWrapper is a helper component that wraps the tested component with the necessary AppSearch context
 * and router context for testing purposes. It accepts a component to be rendered, createRoutes to define the routes
 * for testing, and initialEntries to set the initial route for the memory history.
 * @param component The component to be rendered at the root route.
 * @param createRoutes An array of route definitions that will be created and added to the router for testing.
 * @param initialEntries An optional array of initial entries for the memory history (default = ["/app"]).
 * @returns A React component that provides both AppSearch context and router context to its children for testing purposes.
 */
export const RouterProviderWrapper: React.FC<RouterProviderWrapperProps> = ({
  component,
  createRoutes,
  initialEntries,
  navigateSpy,
}: RouterProviderWrapperProps) => {
  const router = useMemo(() => {
    const rootRoute = createRootRoute({
      component,
    });

    const routeList = createRoutes.map((route) =>
      createRoute({
        getParentRoute: () => rootRoute,
        path: route.path,
        component: route.component,
      }),
    );

    const routerInstance = createRouter({
      routeTree: rootRoute.addChildren(routeList),
      history: createMemoryHistory({
        initialEntries: initialEntries ?? ["/app"],
      }),
    });

    // Override the navigate function to call the navigateSpy with the navigation options.
    type NavigateOptions = Parameters<typeof routerInstance.navigate>[0];
    const originalNavigate = routerInstance.navigate.bind(routerInstance);
    routerInstance.navigate = ((options: NavigateOptions) => {
      navigateSpy?.(options);
      return originalNavigate(options);
    }) as typeof routerInstance.navigate;

    return routerInstance;
  }, [component, createRoutes, initialEntries, navigateSpy]);
  return <RouterProvider router={router} />;
};
