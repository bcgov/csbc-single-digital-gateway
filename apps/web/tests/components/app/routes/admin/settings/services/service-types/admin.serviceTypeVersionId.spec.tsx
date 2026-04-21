import { createFileRoute } from "@tanstack/react-router";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import type { ComponentType } from "react";

const mockUseQuery = jest.fn();
let mockEnsureQueryData: jest.Mock;
let mockRouteUseParams: jest.Mock;

jest.mock("@tanstack/react-router", () => {
  const _mockRouteUseParams = jest.fn();
  return {
    __mockRouteUseParams: _mockRouteUseParams,
    createFileRoute: jest.fn((path: string) => {
      return (config: Record<string, unknown>) => ({
        path,
        options: config,
        useParams: _mockRouteUseParams,
      });
    }),
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
  Button: ({ children, onClick, disabled, variant, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} {...props}>
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
  "src/features/admin/service-types/components/add-service-type-translation-dialog.component",
  () => ({
    AddServiceTypeTranslationDialog: ({ typeId, versionId, trigger }: any) => (
      <div
        data-testid="add-translation-dialog"
        data-type-id={typeId}
        data-version-id={versionId}
      >
        {trigger}
      </div>
    ),
  }),
);
jest.mock(
  "src/features/admin/service-types/components/service-type-version-translation-form.component",
  () => ({
    ServiceTypeVersionTranslationForm: ({ locale }: any) => (
      <div data-testid={`translation-form-${locale}`} data-locale={locale} />
    ),
  }),
);
jest.mock("src/features/admin/service-types/data/service-types.mutations", () => ({
  useArchiveServiceTypeVersion: () => ({ mutate: jest.fn(), isPending: false }),
  usePublishServiceTypeVersion: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("src/features/admin/service-types/data/service-types.query", () => ({
  serviceTypeVersionQueryOptions: jest.fn((typeId: string, versionId: string) => ({
    queryKey: ["service-types", typeId, "versions", versionId],
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

import { Route } from "src/app/routes/admin/settings/services/service-types/$typeId/versions/$versionId";

type RouteLike = {
  path: string;
  options: {
    component: ComponentType;
    loader: (ctx: { params: Record<string, string> }) => Promise<unknown>;
    staticData: { breadcrumbs: () => unknown[] };
  };
  useParams: jest.Mock;
};
const typedRoute = Route as unknown as RouteLike;

const draftVersion = {
  id: "stv-001",
  version: 1,
  status: "draft",
  translations: [
    { locale: "en", name: "Residential Service", description: "Housing services" },
    { locale: "fr", name: "Service résidentiel", description: "Services d'habitation" },
  ],
};

const publishedVersion = { ...draftVersion, status: "published" };
const archivedVersion = { ...draftVersion, status: "archived" };

describe("Admin Service Type Version Detail Route", () => {
  beforeEach(() => {
    mockRouteUseParams.mockReturnValue({ typeId: "stype-001", versionId: "stv-001" });
    mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: null });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe("Route registration", () => {
    it("Should register at /admin/settings/services/service-types/$typeId/versions/$versionId", () => {
      expect(createFileRoute as unknown as jest.Mock).toHaveBeenCalledWith(
        "/admin/settings/services/service-types/$typeId/versions/$versionId",
      );
    });
  });

  describe("Loader", () => {
    it("Should call ensureQueryData for the version and return undefined", async () => {
      mockEnsureQueryData.mockResolvedValue({ version: 1, id: "stv-001" });
      await typedRoute.options.loader({
        params: { typeId: "stype-001", versionId: "stv-001" },
      });
      expect(mockEnsureQueryData).toHaveBeenCalledTimes(1);
    });
  });

  describe("Breadcrumbs", () => {
    it("Should return static breadcrumbs with Settings, Service Types, and Version", () => {
      const crumbs = typedRoute.options.staticData.breadcrumbs();
      expect(crumbs).toEqual([
        { label: "Settings", to: "/admin/settings" },
        { label: "Service Types", to: "/admin/settings/services/service-types" },
        { label: "Version" },
      ]);
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
        error: { message: "Version load failed" },
      });
      render(<typedRoute.options.component />);
      expect(screen.getByText("Error: Version load failed")).toBeInTheDocument();
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
      mockUseQuery.mockReturnValue({ data: draftVersion, isLoading: false, error: null });
    });

    it("Should render 'Version N' as heading", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Version 1");
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

    it("Should show Add Translation dialog for draft status with correct typeId", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByTestId("add-translation-dialog")).toHaveAttribute(
        "data-type-id",
        "stype-001",
      );
    });

    it("Should render translation forms for each locale", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByTestId("translation-form-en")).toBeInTheDocument();
      expect(screen.getByTestId("translation-form-fr")).toBeInTheDocument();
    });

    it("Should open publish dialog on Publish button click", () => {
      render(<typedRoute.options.component />);
      expect(screen.queryByTestId("publish-dialog")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Publish/i }));
      expect(screen.getByTestId("publish-dialog")).toBeInTheDocument();
    });
  });

  describe("Published version", () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue({ data: publishedVersion, isLoading: false, error: null });
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

    it("Should open archive dialog on Archive button click", () => {
      render(<typedRoute.options.component />);
      expect(screen.queryByTestId("archive-dialog")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Archive/i }));
      expect(screen.getByTestId("archive-dialog")).toBeInTheDocument();
    });
  });

  describe("Archived version", () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue({ data: archivedVersion, isLoading: false, error: null });
    });

    it("Should show neither Publish nor Archive button for archived", () => {
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
    it("Should show empty translations message", () => {
      mockUseQuery.mockReturnValue({
        data: { ...draftVersion, translations: [] },
        isLoading: false,
        error: null,
      });
      render(<typedRoute.options.component />);
      expect(
        screen.getByText("No translations yet. Add one to get started."),
      ).toBeInTheDocument();
    });
  });
});
