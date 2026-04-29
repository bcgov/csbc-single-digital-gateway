import { createFileRoute } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";

const mockNavigate = jest.fn();

jest.mock("@tanstack/react-router", () => ({
  createFileRoute: jest.fn((path: string) => {
    return (config: { component: ComponentType }) => ({
      path,
      options: config,
    });
  }),
  Outlet: () => <div data-testid="outlet" />,
  useNavigate: () => mockNavigate,
}));

const mockUseIdirAuth = jest.fn();
jest.mock("src/features/auth/auth.context", () => ({
  useIdirAuth: () => mockUseIdirAuth(),
}));

import { Route } from "src/app/routes/admin/settings/route";

type RouteLike = { path: string; options: { component: ComponentType } };
const typedRoute = Route as unknown as RouteLike;

describe("Admin Settings Route", () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it("Should register with /admin/settings path", () => {
    expect((createFileRoute as unknown as jest.Mock)).toHaveBeenCalledWith("/admin/settings");
  });

  it("Should render Outlet when user has admin role", () => {
    mockUseIdirAuth.mockReturnValue({ user: { roles: ["admin"] } });
    render(<typedRoute.options.component />);
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });

  it("Should render Outlet when user has org-admin role", () => {
    mockUseIdirAuth.mockReturnValue({ user: { roles: ["org-admin"] } });
    render(<typedRoute.options.component />);
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });

  it("Should render nothing and navigate when user lacks access", () => {
    mockUseIdirAuth.mockReturnValue({ user: { roles: ["staff"] } });
    render(<typedRoute.options.component />);
    expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/admin" });
  });

  it("Should handle null user", () => {
    mockUseIdirAuth.mockReturnValue({ user: null });
    render(<typedRoute.options.component />);
    expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
  });
});
