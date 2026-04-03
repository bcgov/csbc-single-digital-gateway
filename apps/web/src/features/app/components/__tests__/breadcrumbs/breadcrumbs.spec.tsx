import { render, screen } from "@testing-library/react";
import React from "react";
import { mockUseMatches } from "tests/utils/mock-functions/tankstack/mock.useMatches";
import { Breadcrumbs } from "../../breadcrumbs";

jest.mock("../../container.component", () => ({
  Container: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="container">{children}</div>
  ),
}));

jest.mock("@repo/ui", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react") as typeof import("react");

  return {
    Breadcrumb: ({ children }: { children: React.ReactNode }) => (
      <nav data-testid="breadcrumb">{children}</nav>
    ),
    BreadcrumbList: ({ children }: { children: React.ReactNode }) => (
      <ol data-testid="breadcrumb-list">{children}</ol>
    ),
    BreadcrumbItem: ({ children }: { children: React.ReactNode }) => (
      <li>{children}</li>
    ),
    BreadcrumbSeparator: () => (
      <span data-testid="breadcrumb-separator">/</span>
    ),
    BreadcrumbPage: ({ children }: { children: React.ReactNode }) => (
      <span data-testid="breadcrumb-page">{children}</span>
    ),
    BreadcrumbLink: ({
      render,
      children,
    }: {
      render: React.ReactElement;
      children: React.ReactNode;
    }) => React.cloneElement(render, {}, children),
  };
});

describe("Breadcrumbs", () => {
  beforeEach(() => {
    mockUseMatches.mockReset();
  });

  it("Should render nothing when there are no breadcrumb items", () => {
    mockUseMatches.mockReturnValue([]);

    const { container } = render(<Breadcrumbs />);

    expect(container.firstChild).toBeNull();
  });

  it("Should ignore matches without a breadcrumb resolver and flatten valid breadcrumb items", () => {
    mockUseMatches.mockReturnValue([
      {
        staticData: {},
        loaderData: { ignored: true },
      },
      {
        staticData: { breadcrumbs: "not-a-function" },
        loaderData: { ignored: true },
      },
      {
        staticData: {
          breadcrumbs: () => [{ label: "Home", to: "/" }],
        },
        loaderData: {},
      },
      {
        staticData: {
          breadcrumbs: (loaderData: { name: string }) => [
            { label: "Applications", to: "/applications" },
            { label: loaderData.name },
          ],
        },
        loaderData: { name: "Details" },
      },
    ]);

    render(<Breadcrumbs />);

    expect(screen.getByTestId("breadcrumb")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Applications")).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getAllByTestId("breadcrumb-separator")).toHaveLength(2);
  });

  it("Should render links for items with `to` and a page for items without `to`", () => {
    mockUseMatches.mockReturnValue([
      {
        staticData: {
          breadcrumbs: () => [
            { label: "Home", to: "/" },
            { label: "Current Page" },
          ],
        },
        loaderData: {},
      },
    ]);

    render(<Breadcrumbs />);

    const homeLink = screen.getByRole("link", { name: "Home" });
    expect(homeLink).toHaveAttribute("data-to", "/");

    expect(screen.getByTestId("breadcrumb-page")).toHaveTextContent(
      "Current Page",
    );
    expect(
      screen.queryByRole("link", { name: "Current Page" }),
    ).not.toBeInTheDocument();
  });

  it("Should pass explicit params and default missing params to an empty object", () => {
    mockUseMatches.mockReturnValue([
      {
        staticData: {
          breadcrumbs: () => [
            { label: "Programs", to: "/programs", params: { id: "123" } },
            { label: "Dashboard", to: "/dashboard" },
            { label: "Summary" },
          ],
        },
        loaderData: {},
      },
    ]);

    render(<Breadcrumbs />);

    const programsLink = screen.getByRole("link", { name: "Programs" });
    const dashboardLink = screen.getByRole("link", { name: "Dashboard" });

    expect(programsLink).toHaveAttribute(
      "data-params",
      JSON.stringify({ id: "123" }),
    );
    expect(dashboardLink).toHaveAttribute("data-params", JSON.stringify({}));
  });

  it("Should render one separator between each breadcrumb item", () => {
    mockUseMatches.mockReturnValue([
      {
        staticData: {
          breadcrumbs: () => [
            { label: "Home", to: "/" },
            { label: "Section", to: "/section" },
            { label: "Details" },
          ],
        },
        loaderData: {},
      },
    ]);

    render(<Breadcrumbs />);

    expect(screen.getAllByTestId("breadcrumb-separator")).toHaveLength(2);
  });
});
