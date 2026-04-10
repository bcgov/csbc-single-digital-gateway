import { createFileRoute, redirect } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";

jest.mock("@tanstack/react-router", () => ({
  Outlet: () => <div data-testid="outlet" />,
  createFileRoute: jest.fn((path: string) => {
    return (config: {
      beforeLoad: (args: {
        context: { bcscAuth: { isAuthenticated: boolean } };
      }) => void;
      component: ComponentType;
    }) => ({
      id: path,
      path,
      options: config,
    });
  }),
  redirect: jest.fn((value: { replace: boolean; to: string }) => ({
    type: "redirect",
    ...value,
  })),
}));

jest.mock(
  "src/features/app/components/authenticated-layout/authenticated-layout.component",
  () => ({
    AuthenticatedLayout: ({ children }: { children?: ReactNode }) => (
      <div data-testid="authenticated-layout">{children}</div>
    ),
  }),
);

// ─── Route import (after mocks) ───────────────────────────────────────────────

import { Route } from "src/app/routes/app/route";

type MockedRoute = {
  path: string;
  options: {
    beforeLoad: (args: {
      context: { bcscAuth: { isAuthenticated: boolean } };
    }) => void;
    component: ComponentType;
  };
};

describe("App Route Component Test", () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('Should create the route with path "/app"', () => {
    const mockedCreateFileRoute = createFileRoute as unknown as jest.Mock;
    const typedRoute = Route as unknown as MockedRoute;

    expect(mockedCreateFileRoute).toHaveBeenCalledTimes(1);
    expect(mockedCreateFileRoute).toHaveBeenCalledWith("/app");
    expect(typedRoute.path).toBe("/app");
    expect(typeof typedRoute.options.beforeLoad).toBe("function");
    expect(typeof typedRoute.options.component).toBe("function");
  });

  it("Should not redirect in beforeLoad when user is authenticated", () => {
    const typedRoute = Route as unknown as MockedRoute;
    const mockedRedirect = redirect as unknown as jest.Mock;

    expect(() =>
      typedRoute.options.beforeLoad({
        context: { bcscAuth: { isAuthenticated: true } },
      }),
    ).not.toThrow();

    expect(mockedRedirect).not.toHaveBeenCalled();
  });

  it("Should redirect in beforeLoad when user is not authenticated", () => {
    const typedRoute = Route as unknown as MockedRoute;
    const mockedRedirect = redirect as unknown as jest.Mock;

    let thrown: unknown;
    try {
      typedRoute.options.beforeLoad({
        context: { bcscAuth: { isAuthenticated: false } },
      });
    } catch (error) {
      thrown = error;
    }

    expect(mockedRedirect).toHaveBeenCalledTimes(1);
    expect(mockedRedirect).toHaveBeenCalledWith({
      replace: true,
      to: "/",
    });
    expect(thrown).toEqual({
      type: "redirect",
      replace: true,
      to: "/",
    });
  });

  it("Should render AuthenticatedLayout with Outlet inside", () => {
    const typedRoute = Route as unknown as MockedRoute;
    const RouteComponent = typedRoute.options.component;

    render(<RouteComponent />);

    const layout = screen.getByTestId("authenticated-layout");
    const outlet = screen.getByTestId("outlet");

    expect(layout).toBeInTheDocument();
    expect(outlet).toBeInTheDocument();
    expect(layout).toContainElement(outlet);
  });
});
