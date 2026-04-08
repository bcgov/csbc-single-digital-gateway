import { createFileRoute } from "@tanstack/react-router";
import "@testing-library/jest-dom";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";

jest.mock("@tanstack/react-router", () => ({
  Outlet: () => <div data-testid="outlet" />,
  createFileRoute: jest.fn((path: string) => {
    return (config: { component: ComponentType }) => ({
      id: path,
      path,
      options: config,
    });
  }),
}));

// ─── Route import (after mocks) ───────────────────────────────────────────────

import { Route } from "src/app/routes/app/settings/route";

type MockedRoute = {
  path: string;
  options: {
    component: ComponentType;
  };
};

describe("Settings Route Component Test", () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('Should create the route with path "/app/settings"', () => {
    const mockedCreateFileRoute = createFileRoute as unknown as jest.Mock;
    const typedRoute = Route as unknown as MockedRoute;

    expect(mockedCreateFileRoute).toHaveBeenCalledTimes(1);
    expect(mockedCreateFileRoute).toHaveBeenCalledWith("/app/settings");
    expect(typedRoute.path).toBe("/app/settings");
    expect(typeof typedRoute.options.component).toBe("function");
  });

  it("Should render Outlet in route component", () => {
    const typedRoute = Route as unknown as MockedRoute;
    const RouteComponent = typedRoute.options.component;

    render(<RouteComponent />);

    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });
});
