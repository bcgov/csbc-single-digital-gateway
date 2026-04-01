import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { useMemo } from "react";
import type { AuthProviderProps } from "src/features/auth/auth.context";
import type { AuthState } from "src/features/auth/auth.types";
import { AuthProviderWrapper } from "./auth-provider-wrapper";

// Type for the navigate function options used in the navigateSpy
type TestRouterNavigateOptions = Parameters<
  ReturnType<typeof createRouter>["navigate"]
>[0];

/**
 * Props for the RouterWrapper component.
 */
interface RouterWrapperProps {
  authState: AuthState;
  authProvider: AuthProviderProps;
  appPath?: string;
  navigateSpy?: (options: TestRouterNavigateOptions) => void;
}

/**
 * AuthRouterWrapper is a helper component that wraps the tested component with the necessary authentication
 * context and router context for testing purposes. It accepts an authState prop to set the authentication
 * state, a authProvider prop to provide the application context, and a navigateSpy prop to track navigation
 * events during tests.
 * @param authState The authentication state to be provided to the context.
 * @param authProvider The props to be passed to the AuthProvider component.
 * @param appPath An optional path for the app route that can be navigated to in tests (default ="/app").
 * @param navigateSpy An optional function to spy on navigation events.
 * @param children The child components that will be wrapped by the AuthRouterWrapper.
 * @returns  A React component that provides both authentication and router context to its children for testing purposes.
 */
export const AuthRouterWrapper: React.FC<RouterWrapperProps> = ({
  authState,
  authProvider,
  appPath,
  navigateSpy,
}: RouterWrapperProps) => {
  const router = useMemo(() => {
    // Create a route component that provides the authentication context to its children
    const routeComponent = () => (
      <AuthProviderWrapper
        authState={authState}
        authProvider={{ ...authProvider, children: <Outlet /> }}
      />
    );
    const rootRoute = createRootRoute({
      component: routeComponent,
    });

    // Create a route for the index page that renders the children passed to the RouterWrapper.
    const indexRouteComponent = () => <>{authProvider?.children}</>;
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: indexRouteComponent,
    });

    // Create a route for the app page that can be navigated to in tests.
    const cyName = appPath ? appPath.slice(1) + "-route" : "app-route";
    const appRouteComponent = () => <div data-cy={cyName} />;
    const appRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: appPath ?? "/app",
      component: appRouteComponent,
    });

    // Create the router instance with the defined routes and a memory history.
    const routerInstance = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, appRoute]),
      history: createMemoryHistory({
        initialEntries: ["/"],
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
  }, [authState, authProvider, appPath, navigateSpy]);

  return <RouterProvider router={router} />;
};
