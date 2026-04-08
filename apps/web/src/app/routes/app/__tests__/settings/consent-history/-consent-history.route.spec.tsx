import { TextDecoder, TextEncoder } from "node:util";
import type { RouteLike } from "tests/utils/types/app/routes/routes.type";

if (!globalThis.TextEncoder) {
  Object.defineProperty(globalThis, "TextEncoder", {
    value: TextEncoder,
    writable: true,
  });
}

if (!globalThis.TextDecoder) {
  Object.defineProperty(globalThis, "TextDecoder", {
    value: TextDecoder as unknown as typeof globalThis.TextDecoder,
    writable: true,
  });
}

import { createFileRoute } from "@tanstack/react-router";
import "@testing-library/jest-dom";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";

jest.mock("@tanstack/react-router", () => ({
  createFileRoute: jest.fn((path: string) =>
    jest.fn((options: { component: ComponentType }) => ({
      path,
      options,
    })),
  ),
  Outlet: () => <div data-testid="outlet" />,
}));

// ─── Route import (after mocks) ───────────────────────────────────────────────

import { Route } from "src/app/routes/app/settings/consent-history/route";

describe("ConsentHistory Route Test", () => {
  const typedRoute = Route as unknown as RouteLike;

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('Should register route with path "/app/settings/consent-history"', () => {
    expect(createFileRoute).toHaveBeenCalledTimes(1);
    expect(createFileRoute).toHaveBeenCalledWith(
      "/app/settings/consent-history",
    );
    expect(typedRoute.path).toBe("/app/settings/consent-history");
    expect(typeof typedRoute.options.component).toBe("function");
  });

  it("Should render Outlet in route component", () => {
    const Component = typedRoute.options.component;
    render(<Component />);

    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });
});
