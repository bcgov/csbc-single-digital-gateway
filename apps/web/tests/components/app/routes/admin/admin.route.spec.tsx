import { createFileRoute } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { useIdirAuth } from "src/features/auth/auth.context";
import type { RouteLike } from "tests/utils/types/app/routes/routes.type";

const mockUseSearch = jest.fn();

jest.mock("@tanstack/react-router", () => ({
  Outlet: () => <div data-testid="outlet" />,
  createFileRoute: jest.fn((path: string) => {
    return (config: Record<string, unknown>) => ({
      id: path,
      path,
      options: config,
      useSearch: mockUseSearch,
    });
  }),
  createRootRouteWithContext: jest.fn(() => {
    return (config: { component: ComponentType }) => ({
      id: "__root__",
      path: "/",
      fullPath: "/",
      options: config,
    });
  }),
}));

jest.mock("@tanstack/react-query-devtools", () => ({
  ReactQueryDevtools: () => <div data-testid="react-query-devtools" />,
}));

jest.mock("@tanstack/react-router-devtools", () => ({
  TanStackRouterDevtools: () => <div data-testid="tanstack-router-devtools" />,
}));

jest.mock("@repo/ui", () => ({
  Card: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => <h1 className={className}>{children}</h1>,
  CardDescription: ({ children }: { children?: React.ReactNode }) => (
    <p>{children}</p>
  ),
  CardContent: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("src/features/auth/auth.context", () => ({
  useIdirAuth: jest.fn(),
}));

jest.mock("src/assets/brand/icon.svg", () => "mocked-icon.svg");

import { Route as AdminRoute } from "src/app/routes/admin/route";

type RootRouteLike = {
  options: {
    component: ComponentType;
  };
};

describe("Admin Route Component Test", () => {
  const mockedUseIdirAuth = useIdirAuth as unknown as jest.Mock;
  const mockedCreateFileRoute = createFileRoute as unknown as jest.Mock;

  const getRouteComponent = () =>
    (AdminRoute as unknown as RouteLike).options.component;

  beforeEach(() => {
    (AdminRoute as unknown as RouteLike).useSearch = mockUseSearch;
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
    mockUseSearch.mockReset();
  });

  it('Should register route with path "/admin" and validateSearch schema', () => {
    const typedRoute = AdminRoute as unknown as RouteLike;

    expect(mockedCreateFileRoute).toHaveBeenCalledTimes(1);
    expect(mockedCreateFileRoute).toHaveBeenCalledWith("/admin");
    expect(typedRoute.path).toBe("/admin");
    expect(typeof typedRoute.options.component).toBe("function");

    expect(typedRoute.options.validateSearch.safeParse({}).success).toBe(true);
    expect(
      typedRoute.options.validateSearch.safeParse({ returnTo: "/admin/users" })
        .success,
    ).toBe(true);
    expect(
      typedRoute.options.validateSearch.safeParse({ returnTo: 123 }).success,
    ).toBe(false);
  });

  it("Should render sign-in card and logo when user is not authenticated", () => {
    mockedUseIdirAuth.mockReturnValue({
      isAuthenticated: false,
      login: jest.fn(),
    });
    mockUseSearch.mockReturnValue({ returnTo: "/admin" });

    const Component = getRouteComponent();
    render(<Component />);

    expect(screen.getByRole("img", { name: "Logo" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Admin Sign In" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Sign in with your IDIR account to access the admin area.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Get Started" }),
    ).toBeInTheDocument();
  });

  it("Should call login with returnTo when provided", () => {
    const login = jest.fn();

    mockedUseIdirAuth.mockReturnValue({
      isAuthenticated: false,
      login,
    });
    mockUseSearch.mockReturnValue({ returnTo: "/admin/users" });

    const Component = getRouteComponent();
    render(<Component />);

    fireEvent.click(screen.getByRole("button", { name: "Get Started" }));

    expect(login).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledWith("/admin/users");
  });

  it('Should call login with "/admin" when returnTo is missing', () => {
    const login = jest.fn();

    mockedUseIdirAuth.mockReturnValue({
      isAuthenticated: false,
      login,
    });
    mockUseSearch.mockReturnValue({});

    const Component = getRouteComponent();
    render(<Component />);

    fireEvent.click(screen.getByRole("button", { name: "Get Started" }));

    expect(login).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledWith("/admin");
  });

  it("Should render outlet when user is authenticated", () => {
    mockedUseIdirAuth.mockReturnValue({
      isAuthenticated: true,
      login: jest.fn(),
    });
    mockUseSearch.mockReturnValue({ returnTo: "/admin" });

    const Component = getRouteComponent();
    render(<Component />);

    expect(screen.getByTestId("outlet")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Admin Sign In" }),
    ).not.toBeInTheDocument();
  });
});

describe("Root Route Component Test", () => {
  let mockedCreateRootRouteWithContext: jest.Mock;
  let RootRoute: RootRouteLike;

  beforeEach(() => {
    jest.resetModules();

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mockedCreateRootRouteWithContext = require("@tanstack/react-router")
      .createRootRouteWithContext as jest.Mock;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    RootRoute = require("src/app/routes/__root").Route as RootRouteLike;
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it("Should create the root route with a component", () => {
    expect(mockedCreateRootRouteWithContext).toHaveBeenCalledTimes(1);
    expect(RootRoute).toBeDefined();
    expect(typeof RootRoute.options.component).toBe("function");
  });

  it("Should render the skip to main content link", () => {
    const RootComponent = RootRoute.options.component;

    render(<RootComponent />);

    const skipLink = screen.getByRole("link", {
      name: /skip to main content/i,
    });

    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  it("Should render outlet and devtools", () => {
    const RootComponent = RootRoute.options.component;

    render(<RootComponent />);

    expect(screen.getByTestId("outlet")).toBeInTheDocument();
    expect(screen.getByTestId("react-query-devtools")).toBeInTheDocument();
    expect(screen.getByTestId("tanstack-router-devtools")).toBeInTheDocument();
  });
});
