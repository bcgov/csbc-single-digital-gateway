import { createFileRoute } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";

let mockNavigate: jest.Mock;
const mockUseQuery = jest.fn();
let mockEnsureQueryData: jest.Mock;
let mockRouteUseParams: jest.Mock;

const mockCreateVersionMutate = jest.fn();
const mockRemoveMutate = jest.fn();

jest.mock("@tanstack/react-router", () => {
  const _mockRouteUseParams = jest.fn();
  const _mockNavigate = jest.fn();
  return {
    __mockRouteUseParams: _mockRouteUseParams,
    __mockNavigate: _mockNavigate,
    createFileRoute: jest.fn((path: string) => {
      return (config: Record<string, unknown>) => ({
        path,
        options: config,
        useParams: _mockRouteUseParams,
      });
    }),
    useNavigate: () => _mockNavigate,
  };
});

jest.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock("src/lib/react-query.client", () => {
  const _mockEnsureQueryData = jest.fn();
  return {
    __mockEnsureQueryData: _mockEnsureQueryData,
    queryClient: { ensureQueryData: _mockEnsureQueryData },
  };
});

jest.mock("@repo/ui", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  Separator: () => <hr />,
  Spinner: ({ className }: any) => <span data-testid="spinner" className={className} />,
}));

jest.mock("@tabler/icons-react", () => ({
  IconPlus: () => <span data-testid="icon-plus" />,
  IconUserPlus: () => <span data-testid="icon-user-plus" />,
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("src/api/api.client", () => ({ api: { get: jest.fn() } }));

jest.mock(
  "src/features/admin/services/components/add-service-contributor-dialog.component",
  () => ({
    AddServiceContributorDialog: ({ serviceId, trigger }: any) => (
      <div data-testid="add-contributor-dialog" data-service-id={serviceId}>
        {trigger}
      </div>
    ),
  }),
);
jest.mock(
  "src/features/admin/services/components/service-contributors-table.component",
  () => ({
    ServiceContributorsTable: ({ contributors, onRemove }: any) => (
      <div data-testid="contributors-table" data-count={contributors?.length ?? 0}>
        {contributors?.map((c: any) => (
          <button key={c.userId} onClick={() => onRemove(c)}>
            Remove-{c.userId}
          </button>
        ))}
      </div>
    ),
  }),
);
jest.mock(
  "src/features/admin/services/components/service-versions-table.component",
  () => ({
    ServiceVersionsTable: ({ versions }: any) => (
      <div data-testid="versions-table" data-count={versions?.length ?? 0} />
    ),
  }),
);
jest.mock(
  "src/features/admin/services/components/remove-service-contributor-dialog.component",
  () => ({
    RemoveServiceContributorDialog: ({ contributor, onConfirm, onCancel }: any) => (
      <div
        data-testid="remove-contributor-dialog"
        data-has-contributor={String(!!contributor)}
        data-contributor-id={contributor?.userId ?? "none"}
      >
        <button onClick={onConfirm}>ConfirmRemove</button>
        <button onClick={onCancel}>CancelRemove</button>
      </div>
    ),
  }),
);
jest.mock("src/features/admin/services/data/services.mutations", () => ({
  useCreateServiceVersion: () => ({ mutate: mockCreateVersionMutate, isPending: false }),
  useRemoveServiceContributor: () => ({ mutate: mockRemoveMutate, isPending: false }),
}));
jest.mock("src/features/admin/services/data/services.query", () => ({
  serviceQueryOptions: jest.fn((id: string) => ({ queryKey: ["services", id] })),
  serviceContributorsQueryOptions: jest.fn((id: string) => ({
    queryKey: ["services", id, "contributors"],
  })),
}));


const { __mockRouteUseParams, __mockNavigate } = jest.requireMock("@tanstack/react-router") as {
  __mockRouteUseParams: jest.Mock;
  __mockNavigate: jest.Mock;
};
mockRouteUseParams = __mockRouteUseParams;
mockNavigate = __mockNavigate;
const { __mockEnsureQueryData } = jest.requireMock("src/lib/react-query.client") as {
  __mockEnsureQueryData: jest.Mock;
};
mockEnsureQueryData = __mockEnsureQueryData;

import { Route } from "src/app/routes/admin/services/$serviceId/index";

type RouteLike = {
  path: string;
  options: {
    component: ComponentType;
    loader: (ctx: { params: Record<string, string> }) => Promise<unknown>;
    staticData: { breadcrumbs: (loaderData: unknown) => unknown[] };
  };
  useParams: jest.Mock;
};
const typedRoute = Route as unknown as RouteLike;

const baseSvc = {
  id: "svc-abc-123",
  name: "My Service",
  orgUnitId: "ou-1",
  serviceTypeId: "st-1",
  createdAt: "2024-03-15T10:00:00Z",
  versions: [],
  publishedVersion: null,
};

/**
 * Sets up useQuery to return stable data across re-renders.
 * The component calls useQuery 4 times per render cycle:
 * [0] svc, [1] contributors, [2] orgUnit, [3] svcType
 * Using mockImplementation with a cyclic counter ensures data
 * persists through React state updates that cause re-renders.
 */
function setupStableQueryMock(
  svc: object,
  contributors: object[] | undefined = undefined,
) {
  let callCount = 0;
  mockUseQuery.mockImplementation(() => {
    const slot = callCount % 4;
    callCount++;
    if (slot === 0) return { data: svc, isLoading: false, error: null };
    if (slot === 1) return { data: contributors, isLoading: false, error: null };
    return { data: undefined, isLoading: false, error: null };
  });
}

describe("Admin Service Detail Route (/admin/services/$serviceId/)", () => {
  beforeEach(() => {
    mockRouteUseParams.mockReturnValue({ serviceId: "svc-abc-123" });
    mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: null });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe("Route registration", () => {
    it("Should register at /admin/services/$serviceId/", () => {
      expect(createFileRoute as unknown as jest.Mock).toHaveBeenCalledWith(
        "/admin/services/$serviceId/",
      );
    });
  });

  describe("Loader", () => {
    it("Should call ensureQueryData with service query options and return serviceName", async () => {
      mockEnsureQueryData.mockResolvedValue({ name: "My Service", id: "svc-abc-123" });
      const result = await typedRoute.options.loader({ params: { serviceId: "svc-abc-123" } });
      expect(mockEnsureQueryData).toHaveBeenCalled();
      expect(result).toEqual({ serviceName: "My Service" });
    });
  });

  describe("Breadcrumbs", () => {
    it("Should return breadcrumbs with serviceName from loaderData", () => {
      const crumbs = typedRoute.options.staticData.breadcrumbs({ serviceName: "My Service" });
      expect(crumbs).toEqual([
        { label: "Services", to: "/admin/services" },
        { label: "My Service" },
      ]);
    });

    it("Should fall back to 'Detail' when serviceName is null", () => {
      const crumbs = typedRoute.options.staticData.breadcrumbs({ serviceName: null });
      expect(crumbs).toEqual([
        { label: "Services", to: "/admin/services" },
        { label: "Detail" },
      ]);
    });
  });

  describe("Loading state", () => {
    it("Should show loading indicator when isLoading is true", () => {
      mockUseQuery.mockReturnValue({ data: null, isLoading: true, error: null });
      render(<typedRoute.options.component />);
      expect(screen.getByText("Loading…")).toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("Should show error message when query fails", () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: { message: "Service not found" },
      });
      render(<typedRoute.options.component />);
      expect(screen.getByText("Error: Service not found")).toBeInTheDocument();
    });
  });

  describe("Null state", () => {
    it("Should render nothing when data is null and not loading", () => {
      mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: null });
      const { container } = render(<typedRoute.options.component />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("Data state", () => {
    it("Should render title from publishedVersion.name when available", () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: { ...baseSvc, publishedVersion: { name: "Published Name" } },
          isLoading: false,
          error: null,
        })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Published Name");
    });

    it("Should render title from latestVersion.name when publishedVersion is null", () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: {
            ...baseSvc,
            publishedVersion: null,
            versions: [{ version: 1, name: "Latest Version Name", id: "v1" }],
          },
          isLoading: false,
          error: null,
        })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Latest Version Name");
    });

    it("Should render title from svc.name as final fallback", () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: { ...baseSvc, publishedVersion: null, versions: [] },
          isLoading: false,
          error: null,
        })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("My Service");
    });

    it("Should render service ID in the page", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseSvc, isLoading: false, error: null })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      expect(screen.getByText(`ID: ${baseSvc.id}`)).toBeInTheDocument();
    });

    it("Should render Details, Versions, and Contributors section headings", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseSvc, isLoading: false, error: null })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      expect(screen.getByText("Details")).toBeInTheDocument();
      expect(screen.getByText("Versions")).toBeInTheDocument();
      expect(screen.getByText("Contributors")).toBeInTheDocument();
    });

    it("Should render versions table with versions from service", () => {
      const svcWithVersions = {
        ...baseSvc,
        versions: [
          { id: "v1", version: 1, name: "V1" },
          { id: "v2", version: 2, name: "V2" },
        ],
      };
      mockUseQuery
        .mockReturnValueOnce({ data: svcWithVersions, isLoading: false, error: null })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      const versionsTable = screen.getByTestId("versions-table");
      expect(versionsTable).toBeInTheDocument();
      expect(versionsTable).toHaveAttribute("data-count", "2");
    });

    it("Should render spinner while orgUnit is loading", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseSvc, isLoading: false, error: null })
        .mockReturnValueOnce({ data: undefined }) // contributors
        .mockReturnValueOnce({ data: undefined }) // orgUnit - not loaded yet
        .mockReturnValueOnce({ data: undefined }); // svcType

      render(<typedRoute.options.component />);
      expect(screen.getAllByTestId("spinner").length).toBeGreaterThanOrEqual(1);
    });

    it("Should render orgUnit name when orgUnit data is available", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseSvc, isLoading: false, error: null })
        .mockReturnValueOnce({ data: undefined }) // contributors
        .mockReturnValueOnce({ data: { id: "ou-1", name: "Ministry of Finance" } }) // orgUnit
        .mockReturnValueOnce({ data: undefined }); // svcType

      render(<typedRoute.options.component />);
      expect(screen.getByText("Ministry of Finance")).toBeInTheDocument();
    });

    it("Should render service type name when svcType data is available", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseSvc, isLoading: false, error: null })
        .mockReturnValueOnce({ data: undefined }) // contributors
        .mockReturnValueOnce({ data: undefined }) // orgUnit
        .mockReturnValueOnce({ data: { id: "st-1", name: "Digital Service" } }); // svcType

      render(<typedRoute.options.component />);
      expect(screen.getByText("Digital Service")).toBeInTheDocument();
    });

    it("Should render contributors table when contributors data is available", () => {
      const contributors = [
        { userId: "u1", name: "Alice", email: "alice@example.com" },
        { userId: "u2", name: "Bob", email: "bob@example.com" },
      ];
      mockUseQuery
        .mockReturnValueOnce({ data: baseSvc, isLoading: false, error: null })
        .mockReturnValueOnce({ data: contributors })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      const table = screen.getByTestId("contributors-table");
      expect(table).toBeInTheDocument();
      expect(table).toHaveAttribute("data-count", "2");
    });

    it("Should not render contributors table when contributors is undefined", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseSvc, isLoading: false, error: null })
        .mockReturnValueOnce({ data: undefined }) // contributors undefined
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      expect(screen.queryByTestId("contributors-table")).not.toBeInTheDocument();
    });

    it("Should render Create Version button", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseSvc, isLoading: false, error: null })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      expect(screen.getByRole("button", { name: /Create Version/i })).toBeInTheDocument();
    });

    it("Should render Add Contributor dialog", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseSvc, isLoading: false, error: null })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      expect(screen.getByTestId("add-contributor-dialog")).toHaveAttribute(
        "data-service-id",
        "svc-abc-123",
      );
    });
  });

  describe("Interaction: handleCreateVersion", () => {
    it("Should call createVersionMutation.mutate when Create Version button is clicked", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseSvc, isLoading: false, error: null })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByRole("button", { name: /Create Version/i }));
      expect(mockCreateVersionMutate).toHaveBeenCalledWith(undefined, expect.any(Object));
    });

    it("Should show toast.success and navigate to new version on success", () => {
      const { toast } = jest.requireMock("sonner") as { toast: { success: jest.Mock; error: jest.Mock } };
      mockCreateVersionMutate.mockImplementation((_: unknown, { onSuccess }: { onSuccess: (r: { version: number; id: string }) => void }) => {
        onSuccess({ version: 3, id: "v3-id" });
      });
      mockUseQuery
        .mockReturnValueOnce({ data: baseSvc, isLoading: false, error: null })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByRole("button", { name: /Create Version/i }));
      expect(toast.success).toHaveBeenCalledWith("Version v3 created");
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "/admin/services/$serviceId/versions/$versionId",
          params: { serviceId: "svc-abc-123", versionId: "v3-id" },
        }),
      );
    });

    it("Should show toast.error when createVersion fails", () => {
      const { toast } = jest.requireMock("sonner") as { toast: { success: jest.Mock; error: jest.Mock } };
      mockCreateVersionMutate.mockImplementation((_: unknown, { onError }: { onError: (e: Error) => void }) => {
        onError(new Error("Version creation failed"));
      });
      mockUseQuery
        .mockReturnValueOnce({ data: baseSvc, isLoading: false, error: null })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByRole("button", { name: /Create Version/i }));
      expect(toast.error).toHaveBeenCalledWith("Failed to create version: Version creation failed");
    });
  });

  describe("Interaction: handleRemoveConfirm via contributor table", () => {
    const contributors = [
      { userId: "u1", name: "Alice Smith", email: "alice@example.com" },
    ];

    it("Should render remove contributor dialog", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseSvc, isLoading: false, error: null })
        .mockReturnValue({ data: undefined });
      render(<typedRoute.options.component />);
      expect(screen.getByTestId("remove-contributor-dialog")).toBeInTheDocument();
    });

    it("Should not call removeMutation.mutate when ConfirmRemove is clicked with no contributor set", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseSvc, isLoading: false, error: null })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("ConfirmRemove"));
      expect(mockRemoveMutate).not.toHaveBeenCalled();
    });

    it("Should show RemoveServiceContributorDialog with contributor set when Remove button is clicked", () => {
      setupStableQueryMock(baseSvc, contributors);
      render(<typedRoute.options.component />);
      expect(screen.getByTestId("remove-contributor-dialog")).toHaveAttribute("data-has-contributor", "false");
      fireEvent.click(screen.getByText("Remove-u1"));
      expect(screen.getByTestId("remove-contributor-dialog")).toHaveAttribute("data-has-contributor", "true");
      expect(screen.getByTestId("remove-contributor-dialog")).toHaveAttribute("data-contributor-id", "u1");
    });

    it("Should call removeMutation.mutate with userId on ConfirmRemove", () => {
      setupStableQueryMock(baseSvc, contributors);
      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("Remove-u1"));
      fireEvent.click(screen.getByText("ConfirmRemove"));
      expect(mockRemoveMutate).toHaveBeenCalledWith("u1", expect.any(Object));
    });

    it("Should show toast.success and clear contributor on successful removal", () => {
      const { toast } = jest.requireMock("sonner") as { toast: { success: jest.Mock; error: jest.Mock } };
      mockRemoveMutate.mockImplementation((_: string, { onSuccess }: { onSuccess: () => void }) => {
        onSuccess();
      });
      setupStableQueryMock(baseSvc, contributors);
      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("Remove-u1"));
      fireEvent.click(screen.getByText("ConfirmRemove"));
      expect(toast.success).toHaveBeenCalledWith("Removed Alice Smith");
      expect(screen.getByTestId("remove-contributor-dialog")).toHaveAttribute("data-has-contributor", "false");
    });

    it("Should show toast.error when removal fails", () => {
      const { toast } = jest.requireMock("sonner") as { toast: { success: jest.Mock; error: jest.Mock } };
      mockRemoveMutate.mockImplementation((_: string, { onError }: { onError: (e: Error) => void }) => {
        onError(new Error("Permission denied"));
      });
      setupStableQueryMock(baseSvc, contributors);
      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("Remove-u1"));
      fireEvent.click(screen.getByText("ConfirmRemove"));
      expect(toast.error).toHaveBeenCalledWith("Failed to remove: Permission denied");
    });

    it("Should clear contributorToRemove when CancelRemove is clicked", () => {
      setupStableQueryMock(baseSvc, contributors);
      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("Remove-u1"));
      expect(screen.getByTestId("remove-contributor-dialog")).toHaveAttribute("data-has-contributor", "true");
      fireEvent.click(screen.getByText("CancelRemove"));
      expect(screen.getByTestId("remove-contributor-dialog")).toHaveAttribute("data-has-contributor", "false");
    });
  });
});
