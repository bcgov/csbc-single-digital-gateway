import { createFileRoute } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";

let mockUseSearch: jest.Mock;
let mockNavigate: jest.Mock;
const mockUseQuery = jest.fn();

jest.mock("@tanstack/react-router", () => {
  const _mockUseSearch = jest.fn();
  const _mockNavigate = jest.fn();
  return {
    __mockUseSearch: _mockUseSearch,
    __mockNavigate: _mockNavigate,
    createFileRoute: jest.fn((path: string) => {
      return (config: Record<string, unknown>) => ({
        path,
        options: config,
        useSearch: _mockUseSearch,
      });
    }),
    useNavigate: () => _mockNavigate,
  };
});

// Extract the mocks after module loading
const routerMock = jest.requireMock("@tanstack/react-router") as {
  __mockUseSearch: jest.Mock;
  __mockNavigate: jest.Mock;
};
mockUseSearch = routerMock.__mockUseSearch;
mockNavigate = routerMock.__mockNavigate;

jest.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock("@repo/ui", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Separator: () => <hr />,
}));

jest.mock("@tabler/icons-react", () => ({
  IconPlus: () => <span data-testid="icon-plus" />,
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("src/features/admin/services/components/create-service-dialog.component", () => ({
  CreateServiceDialog: ({ trigger, onCreated }: any) => (
    <div data-testid="create-dialog">
      {trigger}
      <button onClick={() => onCreated({ id: "new-svc-1" })}>TriggerCreated</button>
    </div>
  ),
}));
jest.mock("src/features/admin/services/components/delete-service-dialog.component", () => ({
  DeleteServiceDialog: ({ serviceId, onConfirm, onCancel }: any) => (
    <div data-testid="delete-dialog" data-service-id={serviceId ?? "none"}>
      <button onClick={onConfirm}>ConfirmDelete</button>
      <button onClick={onCancel}>CancelDelete</button>
    </div>
  ),
}));
jest.mock("src/features/admin/services/components/services-filter-bar.component", () => ({
  ServicesFilterBar: ({ onOrgUnitIdChange }: any) => (
    <div data-testid="filter-bar">
      <button onClick={() => onOrgUnitIdChange("org-1")}>FilterChange</button>
    </div>
  ),
}));
jest.mock("src/features/admin/services/components/services-table.component", () => ({
  ServicesTable: ({ services, onPageChange, onDelete }: any) => (
    <div data-testid="services-table" data-count={services?.length ?? 0}>
      <button onClick={() => onPageChange(2)}>NextPage</button>
      <button onClick={() => onDelete("s1")}>DeleteRow</button>
    </div>
  ),
}));
jest.mock("src/features/admin/services/data/services.mutations", () => ({
  useDeleteService: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("src/features/admin/services/data/services.query", () => ({
  servicesQueryOptions: jest.fn(),
}));

import { Route } from "src/app/routes/admin/services/index";

type RouteLike = { path: string; options: { component: ComponentType; staticData: { breadcrumbs: () => unknown[] } } };
const typedRoute = Route as unknown as RouteLike;

describe("Admin Services Index Route", () => {
  beforeEach(() => {
    mockUseSearch.mockReturnValue({ page: 1 });
    mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: null });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it("Should register at /admin/services/", () => {
    expect((createFileRoute as unknown as jest.Mock)).toHaveBeenCalledWith("/admin/services/");
  });

  it("Should return breadcrumbs", () => {
    expect(typedRoute.options.staticData.breadcrumbs()).toEqual([{ label: "Services" }]);
  });

  it("Should render heading and create button", () => {
    render(<typedRoute.options.component />);
    expect(screen.getByText("Services")).toBeInTheDocument();
    expect(screen.getByText("Manage services across org units.")).toBeInTheDocument();
    expect(screen.getByText("Create Service")).toBeInTheDocument();
  });

  it("Should show loading state", () => {
    mockUseQuery.mockReturnValue({ data: null, isLoading: true, error: null });
    render(<typedRoute.options.component />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("Should show error state", () => {
    mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: { message: "Network error" } });
    render(<typedRoute.options.component />);
    expect(screen.getByText("Error: Network error")).toBeInTheDocument();
  });

  it("Should render ServicesTable when data is available", () => {
    mockUseQuery.mockReturnValue({
      data: { data: [{ id: "s1" }], page: 1, totalPages: 1 },
      isLoading: false,
      error: null,
    });
    render(<typedRoute.options.component />);
    expect(screen.getByTestId("services-table")).toBeInTheDocument();
  });

  it("Should render filter bar and delete dialog", () => {
    render(<typedRoute.options.component />);
    expect(screen.getByTestId("filter-bar")).toBeInTheDocument();
    expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
  });

  it("Should handle page change and invoke search callback", () => {
    mockUseQuery.mockReturnValue({
      data: { data: [{ id: "s1" }], page: 1, totalPages: 3 },
      isLoading: false,
      error: null,
    });
    render(<typedRoute.options.component />);
    fireEvent.click(screen.getByText("NextPage"));
    expect(mockNavigate).toHaveBeenCalled();
    const callArg = mockNavigate.mock.calls[0][0];
    const searchResult = callArg.search({ page: 1 });
    expect(searchResult.page).toBe(2);
  });

  it("Should handle filter change via FilterBar with debounce", () => {
    jest.useFakeTimers();
    render(<typedRoute.options.component />);
    fireEvent.click(screen.getByText("FilterChange"));
    jest.advanceTimersByTime(500);
    expect(mockNavigate).toHaveBeenCalled();
    const callArg = mockNavigate.mock.calls[0][0];
    const searchResult = callArg.search({});
    expect(searchResult.orgUnitId).toBe("org-1");
    jest.useRealTimers();
  });

  it("Should set deleting service id via table delete", () => {
    mockUseQuery.mockReturnValue({
      data: { data: [{ id: "s1" }], page: 1, totalPages: 1 },
      isLoading: false,
      error: null,
    });
    render(<typedRoute.options.component />);
    fireEvent.click(screen.getByText("DeleteRow"));
    expect(screen.getByTestId("delete-dialog")).toHaveAttribute("data-service-id", "s1");
  });

  it("Should navigate to new service on handleCreated", () => {
    render(<typedRoute.options.component />);
    fireEvent.click(screen.getByText("TriggerCreated"));
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/admin/services/$serviceId",
      params: { serviceId: "new-svc-1" },
    });
  });

  it("Should invoke delete confirm callback", () => {
    mockUseQuery.mockReturnValue({
      data: { data: [{ id: "s1" }], page: 1, totalPages: 1 },
      isLoading: false,
      error: null,
    });
    render(<typedRoute.options.component />);
    fireEvent.click(screen.getByText("DeleteRow"));
    fireEvent.click(screen.getByText("ConfirmDelete"));
  });

  it("Should cancel delete", () => {
    mockUseQuery.mockReturnValue({
      data: { data: [{ id: "s1" }], page: 1, totalPages: 1 },
      isLoading: false,
      error: null,
    });
    render(<typedRoute.options.component />);
    fireEvent.click(screen.getByText("DeleteRow"));
    expect(screen.getByTestId("delete-dialog")).toHaveAttribute("data-service-id", "s1");
    fireEvent.click(screen.getByText("CancelDelete"));
    expect(screen.getByTestId("delete-dialog")).toHaveAttribute("data-service-id", "none");
  });
});
