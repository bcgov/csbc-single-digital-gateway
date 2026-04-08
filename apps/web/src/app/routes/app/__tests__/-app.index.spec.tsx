import { createFileRoute } from "@tanstack/react-router";
import "@testing-library/jest-dom";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { mockedUseBcscAuth } from "tests/utils/mocks/auth/mock.useBcscAuth";

jest.mock("@tanstack/react-router", () => ({
  createFileRoute: jest.fn((path: string) => {
    return (config: { component: ComponentType }) => ({
      id: path,
      path,
      options: config,
    });
  }),
}));

jest.mock("@repo/ui", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

// ─── Route import (after mocks) ───────────────────────────────────────────────

import { Route } from "src/app/routes/app/index";

type MockedRoute = {
  path: string;
  options: {
    component: ComponentType;
  };
};

describe("App Index Route Component Test", () => {
  const mockedCreateFileRoute = createFileRoute as unknown as jest.Mock;
  const typedRoute = Route as unknown as MockedRoute;

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('Should register route with path "/app/"', () => {
    expect(mockedCreateFileRoute).toHaveBeenCalledTimes(1);
    expect(mockedCreateFileRoute).toHaveBeenCalledWith("/app/");
    expect(typedRoute.path).toBe("/app/");
    expect(typeof typedRoute.options.component).toBe("function");
  });

  it("Should render greeting with authenticated user given name", () => {
    mockedUseBcscAuth.mockReturnValue({
      user: { given_name: "Lewis" },
    });

    const RouteComponent = typedRoute.options.component;
    render(<RouteComponent />);

    expect(
      screen.getByRole("heading", { name: "Hello, Lewis" }),
    ).toBeInTheDocument();
  });

  it("Should render greeting fallback when user is missing", () => {
    mockedUseBcscAuth.mockReturnValue({
      user: undefined,
    });

    const RouteComponent = typedRoute.options.component;
    render(<RouteComponent />);

    expect(
      screen.getByRole("heading", { name: /hello,/i }),
    ).toBeInTheDocument();
  });

  it("Should render expected skeleton layout count and class distribution", () => {
    mockedUseBcscAuth.mockReturnValue({
      user: { given_name: "Lewis" },
    });

    const RouteComponent = typedRoute.options.component;
    const { container } = render(<RouteComponent />);

    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons).toHaveLength(20);

    expect(container.querySelectorAll(".h-30").length).toBe(4);
    expect(container.querySelectorAll(".h-60").length).toBe(1);
    expect(container.querySelectorAll(".h-10").length).toBe(2);
    expect(container.querySelectorAll(".h-4").length).toBe(6);
    expect(container.querySelectorAll(".h-8").length).toBe(7);
  });
});
