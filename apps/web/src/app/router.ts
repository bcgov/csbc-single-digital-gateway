import { createRouter } from "@tanstack/react-router";
import type { AuthContextProps } from "react-oidc-context";
import { routeTree } from "./routeTree.gen";

export interface RouterContext {
  auth: AuthContextProps;
}

export interface BreadcrumbItemDef {
  label: string;
  to?: string;
  params?: Record<string, string>;
}

export const router = createRouter({
  context: {
    auth: undefined!,
  },
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }

  interface StaticDataRouteOption {
    breadcrumbs?: (loaderData: any) => BreadcrumbItemDef[];
  }
}
