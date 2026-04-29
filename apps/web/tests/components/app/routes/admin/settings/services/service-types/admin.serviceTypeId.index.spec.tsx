import { createFileRoute } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
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
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
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
  "src/features/admin/service-types/components/service-type-versions-table.component",
  () => ({
    ServiceTypeVersionsTable: ({ versions }: any) => (
      <div data-testid="versions-table" data-count={versions?.length ?? 0} />
    ),
  }),
);
jest.mock("src/features/admin/service-types/data/service-types.mutations", () => ({
  useCreateServiceTypeVersion: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("src/features/admin/service-types/data/service-types.query", () => ({
  serviceTypeQueryOptions: jest.fn((id: string) => ({ queryKey: ["service-types", id] })),
}));
jest.mock("src/features/admin/components/version-status-badge.component", () => ({
  VersionStatusBadge: ({ status }: any) => (
    <span data-testid="status-badge" data-status={status}>
      {status}
    </span>
  ),
}));


const { __mockRouteUseParams } = jest.requireMock("@tanstack/react-router") as {
  __mockRouteUseParams: jest.Mock;
};
mockRouteUseParams = __mockRouteUseParams;
const { __mockEnsureQueryData } = jest.requireMock("src/lib/react-query.client") as {
  __mockEnsureQueryData: jest.Mock;
};
mockEnsureQueryData = __mockEnsureQueryData;

import { Route } from "src/app/routes/admin/settings/services/service-types/$typeId/index";

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

const baseType = {
  id: "stype-001",
  createdAt: "2024-01-10T00:00:00Z",
  publishedServiceTypeVersionId: null,
  publishedVersion: null,
  versions: [],
};

describe("Admin Service Type Detail Route (/admin/settings/services/service-types/$typeId/)", () => {
  beforeEach(() => {
    mockRouteUseParams.mockReturnValue({ typeId: "stype-001" });
    mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: null });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe("Route registration", () => {
    it("Should register at /admin/settings/services/service-types/$typeId/", () => {
      expect(createFileRoute as unknown as jest.Mock).toHaveBeenCalledWith(
        "/admin/settings/services/service-types/$typeId/",
      );
    });
  });

  describe("Loader", () => {
    it("Should call ensureQueryData and return typeId", async () => {
      mockEnsureQueryData.mockResolvedValue({ id: "stype-001" });
      const result = await typedRoute.options.loader({ params: { typeId: "stype-001" } });
      expect(mockEnsureQueryData).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ typeId: "stype-001" });
    });
  });

  describe("Breadcrumbs", () => {
    it("Should return static breadcrumbs with Settings, Service Types, and Detail", () => {
      const crumbs = typedRoute.options.staticData.breadcrumbs();
      expect(crumbs).toEqual([
        { label: "Settings", to: "/admin/settings" },
        { label: "Service Types", to: "/admin/settings/services/service-types" },
        { label: "Detail" },
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
        error: { message: "Type not found" },
      });
      render(<typedRoute.options.component />);
      expect(screen.getByText("Error: Type not found")).toBeInTheDocument();
    });
  });

  describe("Null state", () => {
    it("Should render nothing when type is null", () => {
      mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: null });
      const { container } = render(<typedRoute.options.component />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("Unpublished type", () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue({ data: baseType, isLoading: false, error: null });
    });

    it("Should render fallback heading 'Service Type' when no publishedVersion", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Service Type");
    });

    it("Should render type ID in the page", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByText(`ID: ${baseType.id}`)).toBeInTheDocument();
    });

    it("Should show 'Unpublished' status in details grid", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByText("Unpublished")).toBeInTheDocument();
    });

    it("Should not render Published Version section when no publishedVersion", () => {
      render(<typedRoute.options.component />);
      expect(screen.queryByText("Published Version")).not.toBeInTheDocument();
    });

    it("Should render All Versions section with Create Version button", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByText("All Versions")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Create Version/i })).toBeInTheDocument();
    });

    it("Should render versions table with empty versions", () => {
      render(<typedRoute.options.component />);
      const table = screen.getByTestId("versions-table");
      expect(table).toBeInTheDocument();
      expect(table).toHaveAttribute("data-count", "0");
    });
  });

  describe("Published type", () => {
    const publishedType = {
      ...baseType,
      publishedServiceTypeVersionId: "stv-published",
      publishedVersion: {
        version: 2,
        status: "published",
        translations: [
          { locale: "en", name: "Digital Service Type", description: "A digital service" },
        ],
      },
      versions: [
        { id: "stv-1", version: 1, status: "archived" },
        { id: "stv-published", version: 2, status: "published" },
      ],
    };

    beforeEach(() => {
      mockUseQuery.mockReturnValue({ data: publishedType, isLoading: false, error: null });
    });

    it("Should render published name as heading", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Digital Service Type");
    });

    it("Should show 'Published' status in details grid", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByText("Published")).toBeInTheDocument();
    });

    it("Should render Published Version section", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByText("Published Version")).toBeInTheDocument();
    });

    it("Should render translation name and description in published version section", () => {
      render(<typedRoute.options.component />);
      // The name appears in both the h1 and the published version section
      const nameElements = screen.getAllByText("Digital Service Type");
      expect(nameElements.length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("A digital service")).toBeInTheDocument();
    });

    it("Should render status badge in published version section", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByTestId("status-badge")).toHaveAttribute("data-status", "published");
    });

    it("Should render versions table with correct count", () => {
      render(<typedRoute.options.component />);
      const table = screen.getByTestId("versions-table");
      expect(table).toHaveAttribute("data-count", "2");
    });
  });
});
