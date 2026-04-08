import { createRootRouteWithContext } from "@tanstack/react-router";
import "@testing-library/jest-dom";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";

jest.mock("@tanstack/react-router", () => ({
  Outlet: () => <div data-testid="outlet" />,
  createRootRouteWithContext: jest.fn(() => {
    return (config: { component: ComponentType }) => ({
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

// ─── Route import (after mocks) ───────────────────────────────────────────────

import { Route } from "../__root";

describe("RoutesRoot Component Test", () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it("Should create the root route with a component", () => {
    const createRootRouteWithContextMock =
      createRootRouteWithContext as unknown as jest.Mock;

    expect(createRootRouteWithContextMock).toHaveBeenCalledTimes(1);
    expect(Route).toBeDefined();
    expect(
      typeof (Route as { options: { component: ComponentType } }).options
        .component,
    ).toBe("function");
  });

  it("Should render the skip to main content link with expected href and classes", () => {
    const RootComponent = (Route as { options: { component: ComponentType } })
      .options.component;
    render(<RootComponent />);

    const skipLink = screen.getByRole("link", {
      name: "Skip to main content",
    });

    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main-content");
    expect(skipLink).toHaveClass(
      "sr-only",
      "focus:not-sr-only",
      "focus:fixed",
      "focus:top-4",
      "focus:left-4",
      "focus:z-50",
      "focus:px-4",
      "focus:py-2",
      "focus:bg-white",
      "focus:text-black",
      "focus:rounded",
      "focus:shadow",
    );
  });

  it("Should render the outlet and both devtools components", () => {
    const RootComponent = (Route as { options: { component: ComponentType } })
      .options.component;
    render(<RootComponent />);

    expect(screen.getByTestId("outlet")).toBeInTheDocument();
    expect(screen.getByTestId("react-query-devtools")).toBeInTheDocument();
    expect(screen.getByTestId("tanstack-router-devtools")).toBeInTheDocument();
  });
});
