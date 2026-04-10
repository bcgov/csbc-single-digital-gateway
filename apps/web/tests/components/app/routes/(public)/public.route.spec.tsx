import { createFileRoute } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";

jest.mock("@tanstack/react-router", () => ({
  Outlet: () => <div data-testid="outlet" />,
  createFileRoute: jest.fn((path: string) => {
    // IMPORTANT: createFileRoute is curried: createFileRoute(path)(config)
    return (config: { component: ComponentType }) => ({
      id: path,
      path,
      options: config,
    });
  }),
}));

jest.mock(
  "src/features/app/components/public-layout/public-layout.component",
  () => ({
    PublicLayout: ({ children }: { children?: ReactNode }) => (
      <div data-testid="public-layout">{children}</div>
    ),
  }),
);

// ─── Route import (after mocks) ───────────────────────────────────────────────

import { Route } from "src/app/routes/(public)/route";

type MockedRoute = {
  path: string;
  options: {
    component: ComponentType;
  };
};

describe("Public Route Component Test", () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('Should create the route with path "/(public)"', () => {
    const mockedCreateFileRoute = createFileRoute as unknown as jest.Mock;

    expect(mockedCreateFileRoute).toHaveBeenCalledTimes(1);
    expect(mockedCreateFileRoute).toHaveBeenCalledWith("/(public)");

    const typedRoute = Route as unknown as MockedRoute;
    expect(typedRoute).toBeDefined();
    expect(typedRoute.path).toBe("/(public)");
    expect(typeof typedRoute.options.component).toBe("function");
  });

  it("Should render PublicLayout with Outlet inside", () => {
    const typedRoute = Route as unknown as MockedRoute;
    const RouteComponent = typedRoute.options.component;

    render(<RouteComponent />);

    const layout = screen.getByTestId("public-layout");
    const outlet = screen.getByTestId("outlet");

    expect(layout).toBeInTheDocument();
    expect(outlet).toBeInTheDocument();
    expect(layout).toContainElement(outlet);
  });
});
