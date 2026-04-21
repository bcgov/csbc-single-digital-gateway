import { createFileRoute } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";

jest.mock("@tanstack/react-router", () => {
  const _mockUseSearch = jest.fn();
  return {
    __mockUseSearch: _mockUseSearch,
    createFileRoute: jest.fn((path: string) => {
      return (config: Record<string, unknown>) => ({
        path,
        options: config,
        useSearch: _mockUseSearch,
      });
    }),
  };
});

jest.mock("src/features/admin/jsonforms-studio/components/studio.component", () => ({
  Studio: ({ handoffId }: { handoffId: string | null }) => (
    <div data-testid="studio" data-handoff-id={handoffId ?? "none"} />
  ),
}));

const { __mockUseSearch: mockUseSearch } = jest.requireMock("@tanstack/react-router") as { __mockUseSearch: jest.Mock };

import { Route } from "src/app/routes/admin/studio";

type RouteLike = { path: string; options: { component: ComponentType } };
const typedRoute = Route as unknown as RouteLike;

describe("Admin Studio Route", () => {
  afterEach(() => { cleanup(); jest.clearAllMocks(); });

  it("Should register at /admin/studio", () => {
    expect((createFileRoute as unknown as jest.Mock)).toHaveBeenCalledWith("/admin/studio");
  });

  it("Should render Studio with handoff param", () => {
    mockUseSearch.mockReturnValue({ handoff: "abc-123" });
    render(<typedRoute.options.component />);
    expect(screen.getByTestId("studio")).toHaveAttribute("data-handoff-id", "abc-123");
  });

  it("Should render Studio with null when no handoff", () => {
    mockUseSearch.mockReturnValue({});
    render(<typedRoute.options.component />);
    expect(screen.getByTestId("studio")).toHaveAttribute("data-handoff-id", "none");
  });
});
