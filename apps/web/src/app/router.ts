import { createRouter } from "@tanstack/react-router";
import type { AuthState } from "../features/auth/auth.types";
import { routeTree } from "./routeTree.gen";

export interface RouterContext {
  bcscAuth: AuthState;
  idirAuth: AuthState;
}

export interface BreadcrumbItemDef {
  label: string;
  to?: string;
  params?: Record<string, string>;
}

export const router = createRouter({
  context: {
    bcscAuth: undefined!,
    idirAuth: undefined!,
  },
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }

  interface StaticDataRouteOption {
    breadcrumbs?: (loaderData: unknown) => BreadcrumbItemDef[];
  }
}
