import { createFileRoute } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";

let mockUseSearch: jest.Mock;
let mockNavigate: jest.Mock;
const mockUseQuery = jest.fn();
const mockSyncMutate = jest.fn();

jest.mock("@tanstack/react-router", () => {
  const _mockUseSearch = jest.fn();
  const _mockNavigate = jest.fn();
  return {
    __mockUseSearch: _mockUseSearch,
    __mockNavigate: _mockNavigate,
    createFileRoute: jest.fn((path: string) => (config: Record<string, unknown>) => ({
      path, options: config, useSearch: _mockUseSearch,
    })),
    useNavigate: () => _mockNavigate,
  };
});
jest.mock("@tanstack/react-query", () => ({ useQuery: (...args: unknown[]) => mockUseQuery(...args) }));
jest.mock("@repo/ui", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => <button onClick={onClick} disabled={disabled} {...props}>{children}</button>,
  Separator: () => <hr />,
}));
jest.mock("@tabler/icons-react", () => ({ IconRefresh: ({ className }: any) => <span className={className} /> }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("src/features/admin/org-units/components/org-units-table.component", () => ({
  OrgUnitsTable: ({ orgUnits, onPageChange }: any) => (
    <div data-testid="org-units-table" data-count={orgUnits?.length ?? 0}>
      <button onClick={() => onPageChange(2)}>NextPage</button>
    </div>
  ),
}));
jest.mock("src/features/admin/org-units/data/org-units.mutations", () => ({
  useSyncMinistries: () => ({ mutate: mockSyncMutate, isPending: false }),
}));
jest.mock("src/features/admin/org-units/data/org-units.query", () => ({ orgUnitsQueryOptions: jest.fn() }));

const { __mockUseSearch, __mockNavigate } = jest.requireMock("@tanstack/react-router") as {
  __mockUseSearch: jest.Mock;
  __mockNavigate: jest.Mock;
};
mockUseSearch = __mockUseSearch;
mockNavigate = __mockNavigate;

import { Route } from "src/app/routes/admin/settings/org-units/index";

type RouteLike = { path: string; options: { component: ComponentType; staticData: { breadcrumbs: () => unknown[] } } };
const typedRoute = Route as unknown as RouteLike;

describe("Admin Org Units Index Route", () => {
  beforeEach(() => {
    mockUseSearch.mockReturnValue({ page: 1 });
    mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: null });
  });
  afterEach(() => { cleanup(); jest.clearAllMocks(); });

  it("Should register at /admin/settings/org-units/", () => {
    expect((createFileRoute as unknown as jest.Mock)).toHaveBeenCalledWith("/admin/settings/org-units/");
  });

  it("Should return breadcrumbs", () => {
    expect(typedRoute.options.staticData.breadcrumbs()).toEqual([
      { label: "Settings", to: "/admin/settings" }, { label: "Org Units" },
    ]);
  });

  it("Should render heading and sync button", () => {
    render(<typedRoute.options.component />);
    expect(screen.getByText("Org Units")).toBeInTheDocument();
    expect(screen.getByText("Sync Ministries")).toBeInTheDocument();
  });

  it("Should show loading state", () => {
    mockUseQuery.mockReturnValue({ data: null, isLoading: true, error: null });
    render(<typedRoute.options.component />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("Should show error state", () => {
    mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: { message: "Failed" } });
    render(<typedRoute.options.component />);
    expect(screen.getByText("Error: Failed")).toBeInTheDocument();
  });

  it("Should render OrgUnitsTable when data available", () => {
    mockUseQuery.mockReturnValue({ data: { data: [{ id: "o1" }], page: 1, totalPages: 1 }, isLoading: false, error: null });
    render(<typedRoute.options.component />);
    expect(screen.getByTestId("org-units-table")).toBeInTheDocument();
  });

  describe("Interaction: handleSync", () => {
    it("Should call syncMutation.mutate when Sync Ministries button is clicked", () => {
      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("Sync Ministries"));
      expect(mockSyncMutate).toHaveBeenCalledWith(undefined, expect.any(Object));
    });

    it("Should call toast.success with synced count on successful sync", () => {
      const { toast } = jest.requireMock("sonner") as { toast: { success: jest.Mock; error: jest.Mock } };
      mockSyncMutate.mockImplementation((_: unknown, { onSuccess }: { onSuccess: (r: { synced: number }) => void }) => {
        onSuccess({ synced: 42 });
      });
      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("Sync Ministries"));
      expect(toast.success).toHaveBeenCalledWith("Synced 42 ministries");
    });

    it("Should call toast.error on sync failure", () => {
      const { toast } = jest.requireMock("sonner") as { toast: { success: jest.Mock; error: jest.Mock } };
      mockSyncMutate.mockImplementation((_: unknown, { onError }: { onError: (e: Error) => void }) => {
        onError(new Error("Network error"));
      });
      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("Sync Ministries"));
      expect(toast.error).toHaveBeenCalledWith("Sync failed: Network error");
    });
  });

  describe("Interaction: goToPage", () => {
    it("Should call navigate with page 2 when OrgUnitsTable fires onPageChange(2)", () => {
      mockUseQuery.mockReturnValue({ data: { data: [{ id: "o1" }, { id: "o2" }], page: 1, totalPages: 3 }, isLoading: false, error: null });
      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("NextPage"));
      expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ replace: true }));
      const callArg = mockNavigate.mock.calls[0][0];
      const searchResult = callArg.search({ page: 1 });
      expect(searchResult.page).toBe(2);
    });

    it("Should set page to undefined when navigating to page 1", () => {
      mockUseQuery.mockReturnValue({ data: { data: [{ id: "o1" }], page: 2, totalPages: 3 }, isLoading: false, error: null });
      // Override the mock to fire onPageChange(1)
      jest.requireMock("src/features/admin/org-units/components/org-units-table.component").OrgUnitsTable = ({ orgUnits, onPageChange }: any) => (
        <div data-testid="org-units-table" data-count={orgUnits?.length ?? 0}>
          <button onClick={() => onPageChange(1)}>FirstPage</button>
        </div>
      );
      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("FirstPage"));
      expect(mockNavigate).toHaveBeenCalled();
      const callArg = mockNavigate.mock.calls[0][0];
      const searchResult = callArg.search({ page: 2 });
      expect(searchResult.page).toBeUndefined();
    });
  });
});
