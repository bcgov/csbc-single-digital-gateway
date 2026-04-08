import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { mockedUseBcscAuth } from "tests/utils/mocks/auth/mock.auth.context.useBcscAuth";
import { NavigationBar, type NavItem } from "../../navigation-bar";

jest.mock("../../container.component", () => ({
  Container: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="container">{children}</div>
  ),
}));

jest.mock("@tabler/icons-react", () => ({
  IconChevronDown: () => <svg data-testid="icon-chevron-down" />,
}));

jest.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...props
  }: {
    to: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("@repo/ui", () => ({
  Button: ({
    children,
    render,
  }: {
    children?: React.ReactNode;
    render?: () => React.ReactNode;
  }) => <>{render ? render() : <button>{children}</button>}</>,
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({
    render,
    children,
  }: {
    render?: React.ReactNode;
    children?: React.ReactNode;
  }) => <>{render ?? children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("NavigationBar Component Test", () => {
  const navigationItems = [
    {
      type: "link",
      label: "Dashboard",
      to: "/dashboard",
      icon: <svg data-testid="dashboard-icon" />,
    },
    {
      type: "menu",
      label: "Services",
      icon: <svg data-testid="services-icon" />,
      children: [
        { label: "Applications", to: "/applications" },
        { label: "Settings", to: "/settings" },
      ],
    },
  ];

  const renderNavigationBar = (isAuthenticated: boolean) => {
    mockedUseBcscAuth.mockReturnValue({
      isAuthenticated,
    });

    render(
      <NavigationBar
        title="Service Portal"
        items={navigationItems as NavItem[]}
        extras={<button>Sign out</button>}
      />,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("Should render the title as a homepage link when authenticated", () => {
    renderNavigationBar(true);

    const homeLink = screen.getByRole("link", {
      name: "Go to the Service Portal homepage",
    });

    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute("href", "/app");
    expect(screen.getByText("Service Portal")).toBeInTheDocument();
    expect(screen.getByTestId("container")).toBeInTheDocument();
  });

  it("Should render the title as plain text when unauthenticated", () => {
    renderNavigationBar(false);

    expect(screen.getByText("Service Portal")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: "Go to the Service Portal homepage",
      }),
    ).not.toBeInTheDocument();
  });

  it("Should render link and menu navigation items", () => {
    renderNavigationBar(true);

    const dashboardLink = screen.getByRole("link", { name: "Dashboard" });
    const applicationsLink = screen.getByRole("link", {
      name: "Applications",
    });
    const settingsLink = screen.getByRole("link", { name: "Settings" });

    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");
    expect(screen.getByText("Services")).toBeInTheDocument();
    expect(applicationsLink).toHaveAttribute("href", "/applications");
    expect(settingsLink).toHaveAttribute("href", "/settings");
    expect(screen.getByTestId("icon-chevron-down")).toBeInTheDocument();
  });

  it("Should render extras when provided", () => {
    renderNavigationBar(true);

    expect(
      screen.getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
  });
});
