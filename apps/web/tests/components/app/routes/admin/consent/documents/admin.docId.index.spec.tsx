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
  "src/features/admin/consent-documents/components/add-contributor-dialog.component",
  () => ({
    AddContributorDialog: ({ docId, trigger }: any) => (
      <div data-testid="add-contributor-dialog" data-doc-id={docId}>
        {trigger}
      </div>
    ),
  }),
);
jest.mock(
  "src/features/admin/consent-documents/components/contributors-table.component",
  () => ({
    ContributorsTable: ({ contributors, onRemove }: any) => (
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
  "src/features/admin/consent-documents/components/doc-versions-table.component",
  () => ({
    DocVersionsTable: ({ versions }: any) => (
      <div data-testid="versions-table" data-count={versions?.length ?? 0} />
    ),
  }),
);
jest.mock(
  "src/features/admin/consent-documents/components/remove-contributor-dialog.component",
  () => ({
    RemoveContributorDialog: ({ contributor, onConfirm, onCancel }: any) => (
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
jest.mock("src/features/admin/consent-documents/data/consent-documents.mutations", () => ({
  useCreateDocVersion: () => ({ mutate: mockCreateVersionMutate, isPending: false }),
  useRemoveContributor: () => ({ mutate: mockRemoveMutate, isPending: false }),
}));
jest.mock("src/features/admin/consent-documents/data/consent-documents.query", () => ({
  consentDocumentQueryOptions: jest.fn((id: string) => ({ queryKey: ["consent-documents", id] })),
  consentDocumentContributorsQueryOptions: jest.fn((id: string) => ({
    queryKey: ["consent-documents", id, "contributors"],
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

import { Route } from "src/app/routes/admin/consent/documents/$docId/index";

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

const baseDoc = {
  id: "doc-abc-123",
  name: "My Consent Document",
  orgUnitId: "ou-1",
  consentDocumentTypeId: "dt-1",
  createdAt: "2024-06-01T10:00:00Z",
  versions: [],
  publishedVersion: null,
};

/**
 * Sets up useQuery to return stable data across re-renders.
 * The component calls useQuery 4 times per render cycle:
 * [0] doc, [1] contributors, [2] orgUnit, [3] docType
 * Using mockImplementation with a cyclic counter ensures data
 * persists through React state updates that cause re-renders.
 */
function setupStableQueryMock(
  doc: object,
  contributors: object[] | undefined = undefined,
) {
  let callCount = 0;
  mockUseQuery.mockImplementation(() => {
    const slot = callCount % 4;
    callCount++;
    if (slot === 0) return { data: doc, isLoading: false, error: null };
    if (slot === 1) return { data: contributors, isLoading: false, error: null };
    return { data: undefined, isLoading: false, error: null };
  });
}

describe("Admin Consent Document Detail Route (/admin/consent/documents/$docId/)", () => {
  beforeEach(() => {
    mockRouteUseParams.mockReturnValue({ docId: "doc-abc-123" });
    mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: null });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe("Route registration", () => {
    it("Should register at /admin/consent/documents/$docId/", () => {
      expect(createFileRoute as unknown as jest.Mock).toHaveBeenCalledWith(
        "/admin/consent/documents/$docId/",
      );
    });
  });

  describe("Loader", () => {
    it("Should call ensureQueryData with doc query options and return docName", async () => {
      mockEnsureQueryData.mockResolvedValue({ name: "Privacy Policy", id: "doc-abc-123" });
      const result = await typedRoute.options.loader({ params: { docId: "doc-abc-123" } });
      expect(mockEnsureQueryData).toHaveBeenCalled();
      expect(result).toEqual({ docName: "Privacy Policy" });
    });
  });

  describe("Breadcrumbs", () => {
    it("Should return breadcrumbs with docName from loaderData", () => {
      const crumbs = typedRoute.options.staticData.breadcrumbs({ docName: "Privacy Policy" });
      expect(crumbs).toEqual([
        { label: "Consent Documents", to: "/admin/consent/documents" },
        { label: "Privacy Policy" },
      ]);
    });

    it("Should fall back to 'Detail' when docName is null", () => {
      const crumbs = typedRoute.options.staticData.breadcrumbs({ docName: null });
      expect(crumbs).toEqual([
        { label: "Consent Documents", to: "/admin/consent/documents" },
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
        error: { message: "Document not found" },
      });
      render(<typedRoute.options.component />);
      expect(screen.getByText("Error: Document not found")).toBeInTheDocument();
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
          data: { ...baseDoc, publishedVersion: { name: "Published Doc" } },
          isLoading: false,
          error: null,
        })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Published Doc");
    });

    it("Should render title from latestVersion.name when publishedVersion is null", () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: {
            ...baseDoc,
            publishedVersion: null,
            versions: [{ version: 1, name: "Version One", id: "v1" }],
          },
          isLoading: false,
          error: null,
        })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Version One");
    });

    it("Should render title from doc.name as final fallback", () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: { ...baseDoc, publishedVersion: null, versions: [] },
          isLoading: false,
          error: null,
        })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("My Consent Document");
    });

    it("Should render document ID in the page", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseDoc, isLoading: false, error: null })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      expect(screen.getByText(`ID: ${baseDoc.id}`)).toBeInTheDocument();
    });

    it("Should render Details, Versions, and Contributors section headings", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseDoc, isLoading: false, error: null })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      expect(screen.getByText("Details")).toBeInTheDocument();
      expect(screen.getByText("Versions")).toBeInTheDocument();
      expect(screen.getByText("Contributors")).toBeInTheDocument();
    });

    it("Should render versions table with versions from document", () => {
      const docWithVersions = {
        ...baseDoc,
        versions: [
          { id: "v1", version: 1, name: "V1" },
          { id: "v2", version: 2, name: "V2" },
          { id: "v3", version: 3, name: "V3" },
        ],
      };
      mockUseQuery
        .mockReturnValueOnce({ data: docWithVersions, isLoading: false, error: null })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      const versionsTable = screen.getByTestId("versions-table");
      expect(versionsTable).toBeInTheDocument();
      expect(versionsTable).toHaveAttribute("data-count", "3");
    });

    it("Should render spinner while orgUnit is loading", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseDoc, isLoading: false, error: null })
        .mockReturnValueOnce({ data: undefined }) // contributors
        .mockReturnValueOnce({ data: undefined }) // orgUnit not yet loaded
        .mockReturnValueOnce({ data: undefined }); // docType

      render(<typedRoute.options.component />);
      expect(screen.getAllByTestId("spinner").length).toBeGreaterThanOrEqual(1);
    });

    it("Should render orgUnit name when loaded", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseDoc, isLoading: false, error: null })
        .mockReturnValueOnce({ data: undefined }) // contributors
        .mockReturnValueOnce({ data: { id: "ou-1", name: "Ministry of Health" } }) // orgUnit
        .mockReturnValueOnce({ data: undefined }); // docType

      render(<typedRoute.options.component />);
      expect(screen.getByText("Ministry of Health")).toBeInTheDocument();
    });

    it("Should render document type name when loaded", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseDoc, isLoading: false, error: null })
        .mockReturnValueOnce({ data: undefined }) // contributors
        .mockReturnValueOnce({ data: undefined }) // orgUnit
        .mockReturnValueOnce({ data: { id: "dt-1", name: "Terms of Service" } }); // docType

      render(<typedRoute.options.component />);
      expect(screen.getByText("Terms of Service")).toBeInTheDocument();
    });

    it("Should render contributors table when contributors data is available", () => {
      const contributors = [
        { userId: "u1", name: "Alice", email: "alice@gov.bc.ca" },
      ];
      mockUseQuery
        .mockReturnValueOnce({ data: baseDoc, isLoading: false, error: null })
        .mockReturnValueOnce({ data: contributors })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      const table = screen.getByTestId("contributors-table");
      expect(table).toBeInTheDocument();
      expect(table).toHaveAttribute("data-count", "1");
    });

    it("Should not render contributors table when contributors is undefined", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseDoc, isLoading: false, error: null })
        .mockReturnValueOnce({ data: undefined })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      expect(screen.queryByTestId("contributors-table")).not.toBeInTheDocument();
    });

    it("Should render Add Contributor dialog with correct docId", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseDoc, isLoading: false, error: null })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      expect(screen.getByTestId("add-contributor-dialog")).toHaveAttribute(
        "data-doc-id",
        "doc-abc-123",
      );
    });
  });

  describe("Interaction: handleCreateVersion", () => {
    it("Should call createVersionMutation.mutate when Create Version button is clicked", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseDoc, isLoading: false, error: null })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByRole("button", { name: /Create Version/i }));
      expect(mockCreateVersionMutate).toHaveBeenCalledWith(undefined, expect.any(Object));
    });

    it("Should show toast.success and navigate to new version on success", () => {
      const { toast } = jest.requireMock("sonner") as { toast: { success: jest.Mock; error: jest.Mock } };
      mockCreateVersionMutate.mockImplementation((_: unknown, { onSuccess }: { onSuccess: (r: { version: number; id: string }) => void }) => {
        onSuccess({ version: 2, id: "v2-id" });
      });
      mockUseQuery
        .mockReturnValueOnce({ data: baseDoc, isLoading: false, error: null })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByRole("button", { name: /Create Version/i }));
      expect(toast.success).toHaveBeenCalledWith("Version v2 created");
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "/admin/consent/documents/$docId/versions/$versionId",
          params: { docId: "doc-abc-123", versionId: "v2-id" },
        }),
      );
    });

    it("Should show toast.error when createVersion fails", () => {
      const { toast } = jest.requireMock("sonner") as { toast: { success: jest.Mock; error: jest.Mock } };
      mockCreateVersionMutate.mockImplementation((_: unknown, { onError }: { onError: (e: Error) => void }) => {
        onError(new Error("Conflict error"));
      });
      mockUseQuery
        .mockReturnValueOnce({ data: baseDoc, isLoading: false, error: null })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByRole("button", { name: /Create Version/i }));
      expect(toast.error).toHaveBeenCalledWith("Failed to create version: Conflict error");
    });
  });

  describe("Interaction: handleRemoveConfirm via contributors table", () => {
    const contributors = [
      { userId: "u1", name: "Alice Gov", email: "alice@gov.bc.ca" },
    ];

    it("Should render remove contributor dialog", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseDoc, isLoading: false, error: null })
        .mockReturnValue({ data: undefined });
      render(<typedRoute.options.component />);
      expect(screen.getByTestId("remove-contributor-dialog")).toBeInTheDocument();
    });

    it("Should not call removeMutation.mutate when ConfirmRemove is clicked with no contributor set", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseDoc, isLoading: false, error: null })
        .mockReturnValue({ data: undefined });

      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("ConfirmRemove"));
      expect(mockRemoveMutate).not.toHaveBeenCalled();
    });

    it("Should show RemoveContributorDialog with contributor set when Remove button is clicked", () => {
      setupStableQueryMock(baseDoc, contributors);
      render(<typedRoute.options.component />);
      expect(screen.getByTestId("remove-contributor-dialog")).toHaveAttribute("data-has-contributor", "false");
      fireEvent.click(screen.getByText("Remove-u1"));
      expect(screen.getByTestId("remove-contributor-dialog")).toHaveAttribute("data-has-contributor", "true");
      expect(screen.getByTestId("remove-contributor-dialog")).toHaveAttribute("data-contributor-id", "u1");
    });

    it("Should call removeMutation.mutate with userId on ConfirmRemove", () => {
      setupStableQueryMock(baseDoc, contributors);
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
      setupStableQueryMock(baseDoc, contributors);
      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("Remove-u1"));
      fireEvent.click(screen.getByText("ConfirmRemove"));
      expect(toast.success).toHaveBeenCalledWith("Removed Alice Gov");
      expect(screen.getByTestId("remove-contributor-dialog")).toHaveAttribute("data-has-contributor", "false");
    });

    it("Should show toast.error when removal fails", () => {
      const { toast } = jest.requireMock("sonner") as { toast: { success: jest.Mock; error: jest.Mock } };
      mockRemoveMutate.mockImplementation((_: string, { onError }: { onError: (e: Error) => void }) => {
        onError(new Error("Forbidden"));
      });
      setupStableQueryMock(baseDoc, contributors);
      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("Remove-u1"));
      fireEvent.click(screen.getByText("ConfirmRemove"));
      expect(toast.error).toHaveBeenCalledWith("Failed to remove: Forbidden");
    });

    it("Should clear contributorToRemove when CancelRemove is clicked", () => {
      setupStableQueryMock(baseDoc, contributors);
      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("Remove-u1"));
      expect(screen.getByTestId("remove-contributor-dialog")).toHaveAttribute("data-has-contributor", "true");
      fireEvent.click(screen.getByText("CancelRemove"));
      expect(screen.getByTestId("remove-contributor-dialog")).toHaveAttribute("data-has-contributor", "false");
    });
  });
});
