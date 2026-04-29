import { createFileRoute } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";

jest.mock("@tanstack/react-router", () => ({
  createFileRoute: jest.fn((path: string) => {
    return (config: { component: ComponentType }) => ({
      path,
      options: config,
    });
  }),
  Link: ({ children, to }: { children?: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

jest.mock("@repo/ui", () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
  Separator: () => <hr />,
}));

jest.mock("@tabler/icons-react", () => ({
  IconBuildingCommunity: () => <span />,
  IconFileDescription: () => <span />,
  IconServer: () => <span />,
}));

import { Route } from "src/app/routes/admin/settings/index";

type RouteLike = { path: string; options: { component: ComponentType; staticData: { breadcrumbs: () => unknown[] } } };
const typedRoute = Route as unknown as RouteLike;

describe("Admin Settings Index", () => {
  afterEach(cleanup);

  it("Should register at /admin/settings/", () => {
    expect((createFileRoute as unknown as jest.Mock)).toHaveBeenCalledWith("/admin/settings/");
  });

  it("Should return breadcrumbs", () => {
    const crumbs = typedRoute.options.staticData.breadcrumbs();
    expect(crumbs).toEqual([{ label: "Settings" }]);
  });

  it("Should render heading and section titles", () => {
    render(<typedRoute.options.component />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Organization")).toBeInTheDocument();
    expect(screen.getByText("Consent")).toBeInTheDocument();
    expect(screen.getByText("Services")).toBeInTheDocument();
  });

  it("Should render card links for org-units, document-types, service-types", () => {
    render(<typedRoute.options.component />);
    expect(screen.getByText("Org Units")).toBeInTheDocument();
    expect(screen.getByText("Document Types")).toBeInTheDocument();
    expect(screen.getByText("Service Types")).toBeInTheDocument();
  });
});
