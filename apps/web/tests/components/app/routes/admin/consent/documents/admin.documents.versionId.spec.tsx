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
  "src/features/admin/consent-document-types/data/consent-document-types.query",
  () => ({
    documentTypeVersionQueryOptions: jest.fn((typeId: string, versionId: string) => ({
      queryKey: ["consent-document-types", typeId, "versions", versionId],
    })),
  }),
);
jest.mock(
  "src/features/admin/consent-documents/components/add-doc-translation-dialog.component",
  () => ({
    AddDocTranslationDialog: ({ docId, versionId, trigger }: any) => (
      <div
        data-testid="add-translation-dialog"
        data-doc-id={docId}
        data-version-id={versionId}
      >
        {trigger}
      </div>
    ),
  }),
);
jest.mock(
  "src/features/admin/consent-documents/components/doc-translation-form.component",
  () => ({
    DocTranslationForm: ({ locale, translation }: any) => (
      <div data-testid={`translation-form-${locale}`} data-locale={locale}>
        {translation.name}
      </div>
    ),
  }),
);
jest.mock("src/features/admin/consent-documents/data/consent-documents.mutations", () => ({
  useArchiveDocVersion: () => ({ mutate: jest.fn(), isPending: false }),
  usePublishDocVersion: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("src/features/admin/consent-documents/data/consent-documents.query", () => ({
  consentDocumentQueryOptions: jest.fn((id: string) => ({ queryKey: ["consent-documents", id] })),
  consentDocumentVersionQueryOptions: jest.fn((docId: string, vId: string) => ({
    queryKey: ["consent-documents", docId, "versions", vId],
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

import { Route } from "src/app/routes/admin/consent/documents/$docId/versions/$versionId";

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
  id: "dver-001",
  version: 2,
  status: "draft",
  consentDocumentTypeVersionId: "dtv-1",
  translations: [
    { locale: "en", name: "Terms of Service", content: {} },
    { locale: "fr", name: "Conditions d'utilisation", content: {} },
  ],
};

const publishedVersion = { ...draftVersion, status: "published" };
const archivedVersion = { ...draftVersion, status: "archived" };

describe("Admin Consent Document Version Detail Route", () => {
  beforeEach(() => {
    mockRouteUseParams.mockReturnValue({
      docId: "doc-abc-123",
      versionId: "dver-001",
    });
    mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: null });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe("Route registration", () => {
    it("Should register at /admin/consent/documents/$docId/versions/$versionId", () => {
      expect(createFileRoute as unknown as jest.Mock).toHaveBeenCalledWith(
        "/admin/consent/documents/$docId/versions/$versionId",
      );
    });
  });

  describe("Loader", () => {
    it("Should call ensureQueryData twice in parallel for version and doc", async () => {
      mockEnsureQueryData
        .mockResolvedValueOnce({ version: 2, id: "dver-001" }) // version
        .mockResolvedValueOnce({ name: "Privacy Policy", id: "doc-abc-123" }); // doc

      const result = await typedRoute.options.loader({
        params: { docId: "doc-abc-123", versionId: "dver-001" },
      });
      expect(mockEnsureQueryData).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        docId: "doc-abc-123",
        docName: "Privacy Policy",
        versionNumber: 2,
      });
    });
  });

  describe("Breadcrumbs", () => {
    it("Should return three breadcrumb levels", () => {
      const crumbs = typedRoute.options.staticData.breadcrumbs({
        docId: "doc-abc-123",
        docName: "Privacy Policy",
        versionNumber: 2,
      });
      expect(crumbs).toHaveLength(3);
      expect(crumbs[0]).toEqual({
        label: "Consent Documents",
        to: "/admin/consent/documents",
      });
      expect(crumbs[1]).toEqual({
        label: "Privacy Policy",
        to: "/admin/consent/documents/doc-abc-123",
      });
      expect(crumbs[2]).toEqual({ label: "Version 2" });
    });

    it("Should fall back to 'Detail' for docName when null", () => {
      const crumbs = typedRoute.options.staticData.breadcrumbs({
        docId: "doc-abc-123",
        docName: null,
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
        error: { message: "Version not found" },
      });
      render(<typedRoute.options.component />);
      expect(screen.getByText("Error: Version not found")).toBeInTheDocument();
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
        .mockReturnValueOnce({ data: draftVersion, isLoading: false, error: null })
        .mockReturnValue({ data: undefined });
    });

    it("Should render version title with english translation name", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Terms of Service - Version 2",
      );
    });

    it("Should render status badge as draft", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByTestId("status-badge")).toHaveAttribute("data-status", "draft");
    });

    it("Should show Publish button for draft", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByRole("button", { name: /Publish/i })).toBeInTheDocument();
    });

    it("Should not show Archive button for draft", () => {
      render(<typedRoute.options.component />);
      expect(screen.queryByRole("button", { name: /Archive/i })).not.toBeInTheDocument();
    });

    it("Should show Add Translation dialog for draft", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByTestId("add-translation-dialog")).toHaveAttribute(
        "data-doc-id",
        "doc-abc-123",
      );
    });

    it("Should render translation forms for all locales", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByTestId("translation-form-en")).toBeInTheDocument();
      expect(screen.getByTestId("translation-form-fr")).toBeInTheDocument();
    });

    it("Should open publish dialog when Publish is clicked", () => {
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

    it("Should open archive dialog when Archive is clicked", () => {
      // Use mockReturnValue (not Once) so re-renders after click still have version data
      mockUseQuery.mockReturnValue({ data: publishedVersion, isLoading: false, error: null });
      render(<typedRoute.options.component />);
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

    it("Should show neither Publish nor Archive buttons for archived status", () => {
      render(<typedRoute.options.component />);
      expect(screen.queryByRole("button", { name: /^Publish$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Archive/i })).not.toBeInTheDocument();
    });
  });

  describe("No translations", () => {
    it("Should show empty translations message", () => {
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

    it("Should render 'Version N' title when no translations exist", () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: { ...draftVersion, version: 7, translations: [] },
          isLoading: false,
          error: null,
        })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Version 7");
    });
  });
});
