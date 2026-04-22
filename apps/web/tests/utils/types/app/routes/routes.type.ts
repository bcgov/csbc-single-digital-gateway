/**
 * This file defines TypeScript types for the services route and its related components.
 * It includes types for route parameters, service data structure, and a RouteLike type that
 * mimics the structure of a TanStack Router route. These types are used in the tests for the
 * services route to ensure type safety and consistency with the actual route implementation.
 */
import type { ComponentType } from "react";

export type Params = {
  serviceId?: string;
  applicationId?: string;
  statementId?: string;
};

export type Application = {
  id: string;
  label?: string;
  description?: string;
  type?: "external" | "workflow";
  formId?: string;
  apiKey?: string;
  url?: string;
  blockType?: "chefs" | "workflow";
};

export type ConsentSetting = {
  documentId: string;
};

export type Service = {
  id: string;
  name: string;
  settings?: {
    consent?: ConsentSetting[];
  };
  categories?: string[];
  applications?: Application[];
  application?: {
    applications?: Application[];
  };
  description?: string | null;
  content?: unknown;
};

export type RouteLike = {
  path: string;
  options: {
    beforeLoad: (args: { params: Params }) => Promise<void>;
    loader: (args: { params: Params }) => Promise<{
      service: Service;
      application: Application;
    }>;
    staticData: {
      breadcrumbs: (loaderData?: unknown) => Array<Record<string, unknown>>;
    };
    validateSearch: {
      safeParse: (value: unknown) => { success: boolean };
    };
    component: ComponentType;
    notFoundComponent: ComponentType;
  };
  useLoaderData: () => { service: Service; application: Application };
  useParams: () => Params;
  useSearch: () => { returnTo?: string };
};
