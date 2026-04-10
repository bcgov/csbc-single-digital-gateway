import { createFileRoute } from "@tanstack/react-router";
import { cleanup, render } from "@testing-library/react";
import type { ComponentType } from "react";

jest.mock("@tanstack/react-router", () => ({
  createFileRoute: jest.fn((path: string) => {
    return (config: { component: ComponentType }) => ({
      path,
      options: config,
    });
  }),
}));

// ─── Route import (after mocks) ───────────────────────────────────────────────

import { Route } from "src/app/routes/(public)/index";

type MockedRoute = {
  path: string;
  options: {
    component: ComponentType;
  };
};

describe("Public Index Route Test", () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('Should create the route with path "/(public)/"', () => {
    const mockedCreateFileRoute = createFileRoute as unknown as jest.Mock;

    expect(mockedCreateFileRoute).toHaveBeenCalledTimes(1);
    expect(mockedCreateFileRoute).toHaveBeenCalledWith("/(public)/");
    expect(Route).toBeDefined();

    const typedRoute = Route as unknown as MockedRoute;
    expect(typedRoute.path).toBe("/(public)/");
    expect(typeof typedRoute.options.component).toBe("function");
  });

  it("Should render an empty fragment for the route component", () => {
    const typedRoute = Route as unknown as MockedRoute;
    const RouteComponent = typedRoute.options.component;

    const { container } = render(<RouteComponent />);

    expect(container.firstChild).toBeNull();
    expect(container.innerHTML).toBe("");
  });
});
