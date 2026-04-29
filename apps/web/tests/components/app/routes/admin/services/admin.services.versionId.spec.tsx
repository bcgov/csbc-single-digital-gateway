import { createFileRoute } from "@tanstack/react-router";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import type { ComponentType } from "react";

const mockUseQuery = jest.fn();
let mockEnsureQueryData: jest.Mock;
let mockRouteUseParams: jest.Mock;

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
  Button: ({ children, onClick, disabled, className, variant, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} className={className} {...props}>
      {children}
    </button>
  ),
  Separator: () => <hr />,
}));

jest.mock("@tabler/icons-react", () => ({
  IconPlus: () => <span data-testid="icon-plus" />,
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock(
  "src/features/admin/components/archive-version-dialog.component",
  () => ({
    ArchiveVersionDialog: ({ open, onConfirm, onCancel }: any) =>
      open ? (
        <div data-testid="archive-dialog">
          <button onClick={onConfirm}>Confirm Archive</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      ) : null,
  }),
);
jest.mock(
  "src/features/admin/components/publish-version-dialog.component",
  () => ({
    PublishVersionDialog: ({ open, onConfirm, onCancel }: any) =>
      open ? (
        <div data-testid="publish-dialog">
          <button onClick={onConfirm}>Confirm Publish</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      ) : null,
  }),
);
jest.mock(
  "src/features/admin/components/version-status-badge.component",
  () => ({
    VersionStatusBadge: ({ status }: any) => (
      <span data-testid="status-badge" data-status={status}>
        {status}
      </span>
    ),
  }),
);
jest.mock(
  "src/features/admin/service-types/data/service-types.query",
  () => ({
    serviceTypeVersionQueryOptions: jest.fn((typeId: string, versionId: string) => ({
      queryKey: ["service-types", typeId, "versions", versionId],
    })),
  }),
);
jest.mock(
  "src/features/admin/services/components/add-service-translation-dialog.component",
  () => ({
    AddServiceTranslationDialog: ({ serviceId, versionId, trigger }: any) => (
      <div
        data-testid="add-translation-dialog"
        data-service-id={serviceId}
        data-version-id={versionId}
      >
        {trigger}
      </div>
    ),
  }),
);
jest.mock(
  "src/features/admin/services/components/service-translation-form.component",
  () => ({
    ServiceTranslationForm: ({ locale, translation }: any) => (
      <div data-testid={`translation-form-${locale}`} data-locale={locale}>
        {translation.name}
      </div>
    ),
  }),
);
jest.mock("src/features/admin/services/data/services.mutations", () => ({
  useArchiveServiceVersion: () => ({ mutate: jest.fn(), isPending: false }),
  usePublishServiceVersion: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("src/features/admin/services/data/services.query", () => ({
  serviceQueryOptions: jest.fn((id: string) => ({ queryKey: ["services", id] })),
  serviceVersionQueryOptions: jest.fn((svcId: string, vId: string) => ({
    queryKey: ["services", svcId, "versions", vId],
  })),
}));


const { __mockRouteUseParams } = jest.requireMock("@tanstack/react-router") as {
  __mockRouteUseParams: jest.Mock;
};
mockRouteUseParams = __mockRouteUseParams;
const { __mockEnsureQueryData } = jest.requireMock("src/lib/react-query.client") as {
  __mockEnsureQueryData: jest.Mock;
};
mockEnsureQueryData = __mockEnsureQueryData;

import { Route } from "src/app/routes/admin/services/$serviceId/versions/$versionId";

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

const draftVersion = {
  id: "ver-001",
  version: 3,
  status: "draft",
  serviceTypeVersionId: "stv-1",
  translations: [
    { locale: "en", name: "English Name", content: {} },
    { locale: "fr", name: "Nom Français", content: {} },
  ],
};

const publishedVersion = {
  ...draftVersion,
  status: "published",
};

const archivedVersion = {
  ...draftVersion,
  status: "archived",
};

describe("Admin Service Version Detail Route", () => {
  beforeEach(() => {
    mockRouteUseParams.mockReturnValue({
      serviceId: "svc-abc-123",
      versionId: "ver-001",
    });
    mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: null });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe("Route registration", () => {
    it("Should register at /admin/services/$serviceId/versions/$versionId", () => {
      expect(createFileRoute as unknown as jest.Mock).toHaveBeenCalledWith(
        "/admin/services/$serviceId/versions/$versionId",
      );
    });
  });

  describe("Loader", () => {
    it("Should call ensureQueryData twice (version + service) in parallel and return shape", async () => {
      mockEnsureQueryData
        .mockResolvedValueOnce({ version: 3, id: "ver-001" }) // version
        .mockResolvedValueOnce({ name: "My Service", id: "svc-abc-123" }); // service

      const result = await typedRoute.options.loader({
        params: { serviceId: "svc-abc-123", versionId: "ver-001" },
      });
      expect(mockEnsureQueryData).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        serviceId: "svc-abc-123",
        serviceName: "My Service",
        versionNumber: 3,
      });
    });
  });

  describe("Breadcrumbs", () => {
    it("Should return three breadcrumb levels", () => {
      const crumbs = typedRoute.options.staticData.breadcrumbs({
        serviceId: "svc-abc-123",
        serviceName: "My Service",
        versionNumber: 3,
      });
      expect(crumbs).toHaveLength(3);
      expect(crumbs[0]).toEqual({ label: "Services", to: "/admin/services" });
      expect(crumbs[1]).toEqual({ label: "My Service", to: "/admin/services/svc-abc-123" });
      expect(crumbs[2]).toEqual({ label: "Version 3" });
    });

    it("Should fall back to 'Detail' for serviceName when null", () => {
      const crumbs = typedRoute.options.staticData.breadcrumbs({
        serviceId: "svc-abc-123",
        serviceName: null,
        versionNumber: 1,
      });
      expect((crumbs[1] as any).label).toBe("Detail");
    });
  });

  describe("Loading state", () => {
    it("Should show loading indicator", () => {
      mockUseQuery.mockReturnValue({ data: null, isLoading: true, error: null });
      render(<typedRoute.options.component />);
      expect(screen.getByText("Loading…")).toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("Should show error message", () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: { message: "Version fetch failed" },
      });
      render(<typedRoute.options.component />);
      expect(screen.getByText("Error: Version fetch failed")).toBeInTheDocument();
    });
  });

  describe("Null state", () => {
    it("Should render nothing when version is null", () => {
      mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: null });
      const { container } = render(<typedRoute.options.component />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("Draft version", () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({ data: draftVersion, isLoading: false, error: null }) // version
        .mockReturnValue({ data: undefined });
    });

    it("Should render version title with translation name", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "English Name - Version 3",
      );
    });

    it("Should render status badge with draft status", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByTestId("status-badge")).toHaveAttribute("data-status", "draft");
    });

    it("Should show Publish button for draft status", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByRole("button", { name: /Publish/i })).toBeInTheDocument();
    });

    it("Should not show Archive button for draft status", () => {
      render(<typedRoute.options.component />);
      expect(screen.queryByRole("button", { name: /Archive/i })).not.toBeInTheDocument();
    });

    it("Should show Add Translation dialog for draft status", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByTestId("add-translation-dialog")).toBeInTheDocument();
    });

    it("Should render translation forms for each locale", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByTestId("translation-form-en")).toBeInTheDocument();
      expect(screen.getByTestId("translation-form-fr")).toBeInTheDocument();
    });

    it("Should open publish dialog when Publish button is clicked", () => {
      // Use mockReturnValue (not Once) so re-renders after click still have version data
      mockUseQuery.mockReturnValue({ data: draftVersion, isLoading: false, error: null });
      render(<typedRoute.options.component />);
      expect(screen.queryByTestId("publish-dialog")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Publish/i }));
      expect(screen.getByTestId("publish-dialog")).toBeInTheDocument();
    });
  });

  describe("Published version", () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({ data: publishedVersion, isLoading: false, error: null })
        .mockReturnValue({ data: undefined });
    });

    it("Should show Archive button for published status", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByRole("button", { name: /Archive/i })).toBeInTheDocument();
    });

    it("Should not show Publish button for published status", () => {
      render(<typedRoute.options.component />);
      expect(screen.queryByRole("button", { name: /^Publish$/i })).not.toBeInTheDocument();
    });

    it("Should not show Add Translation dialog for published status", () => {
      render(<typedRoute.options.component />);
      expect(screen.queryByTestId("add-translation-dialog")).not.toBeInTheDocument();
    });

    it("Should open archive dialog when Archive button is clicked", () => {
      // Use mockReturnValue (not Once) so re-renders after click still have version data
      mockUseQuery.mockReturnValue({ data: publishedVersion, isLoading: false, error: null });
      render(<typedRoute.options.component />);
      expect(screen.queryByTestId("archive-dialog")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Archive/i }));
      expect(screen.getByTestId("archive-dialog")).toBeInTheDocument();
    });
  });

  describe("Archived version", () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({ data: archivedVersion, isLoading: false, error: null })
        .mockReturnValue({ data: undefined });
    });

    it("Should show neither Publish nor Archive button for archived status", () => {
      render(<typedRoute.options.component />);
      expect(screen.queryByRole("button", { name: /^Publish$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Archive/i })).not.toBeInTheDocument();
    });

    it("Should render status badge with archived status", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByTestId("status-badge")).toHaveAttribute("data-status", "archived");
    });
  });

  describe("No translations", () => {
    it("Should show empty translations message when translations array is empty", () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: { ...draftVersion, translations: [] },
          isLoading: false,
          error: null,
        })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      expect(
        screen.getByText("No translations yet. Add one to get started."),
      ).toBeInTheDocument();
    });

    it("Should render fallback title when no english translation exists", () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: { ...draftVersion, version: 5, translations: [] },
          isLoading: false,
          error: null,
        })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Version 5");
    });
  });
});
