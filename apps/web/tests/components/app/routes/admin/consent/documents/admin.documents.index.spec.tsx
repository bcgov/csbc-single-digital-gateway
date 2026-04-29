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

jest.mock("@tanstack/react-query", () => ({ useQuery: (...args: unknown[]) => mockUseQuery(...args) }));
jest.mock("@repo/ui", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Separator: () => <hr />,
}));
jest.mock("@tabler/icons-react", () => ({ IconPlus: () => <span /> }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("src/features/admin/consent-documents/components/create-document-dialog.component", () => ({
  CreateDocumentDialog: ({ trigger, onCreated }: any) => (
    <div data-testid="create-dialog">
      {trigger}
      <button onClick={() => onCreated({ id: "new-doc-1" })}>TriggerCreated</button>
    </div>
  ),
}));
jest.mock("src/features/admin/consent-documents/components/delete-document-dialog.component", () => ({
  DeleteDocumentDialog: ({ docId, onConfirm, onCancel }: any) => (
    <div data-testid="delete-dialog" data-doc-id={docId ?? "none"}>
      <button onClick={onConfirm}>ConfirmDelete</button>
      <button onClick={onCancel}>CancelDelete</button>
    </div>
  ),
}));
jest.mock("src/features/admin/consent-documents/components/documents-filter-bar.component", () => ({
  DocumentsFilterBar: ({ orgUnitId, onOrgUnitIdChange }: any) => (
    <div data-testid="filter-bar">
      <input
        data-testid="org-unit-input"
        value={orgUnitId}
        onChange={(e) => onOrgUnitIdChange(e.target.value)}
      />
    </div>
  ),
}));
jest.mock("src/features/admin/consent-documents/components/documents-table.component", () => ({
  DocumentsTable: ({ documents, onPageChange, onDelete }: any) => (
    <div data-testid="documents-table" data-count={documents?.length ?? 0}>
      <button onClick={() => onPageChange(2)}>NextPage</button>
      <button onClick={() => onDelete("doc-to-delete")}>DeleteRow</button>
    </div>
  ),
}));
jest.mock("src/features/admin/consent-documents/data/consent-documents.mutations", () => ({
  useDeleteConsentDocument: () => ({ mutate: mockDeleteMutate, isPending: false }),
}));
jest.mock("src/features/admin/consent-documents/data/consent-documents.query", () => ({
  consentDocumentsQueryOptions: jest.fn(),
}));

const mockDeleteMutate = jest.fn();

const { __mockUseSearch, __mockNavigate } = jest.requireMock("@tanstack/react-router") as {
  __mockUseSearch: jest.Mock;
  __mockNavigate: jest.Mock;
};
mockUseSearch = __mockUseSearch;
mockNavigate = __mockNavigate;

import { Route } from "src/app/routes/admin/consent/documents/index";

type RouteLike = { path: string; options: { component: ComponentType; staticData: { breadcrumbs: () => unknown[] } } };
const typedRoute = Route as unknown as RouteLike;

describe("Admin Consent Documents Index Route", () => {
  beforeEach(() => {
    mockUseSearch.mockReturnValue({ page: 1 });
    mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: null });
  });
  afterEach(() => { cleanup(); jest.clearAllMocks(); });

  it("Should register at /admin/consent/documents/", () => {
    expect((createFileRoute as unknown as jest.Mock)).toHaveBeenCalledWith("/admin/consent/documents/");
  });

  it("Should return breadcrumbs", () => {
    expect(typedRoute.options.staticData.breadcrumbs()).toEqual([{ label: "Consent Documents" }]);
  });

  it("Should render heading and create button", () => {
    render(<typedRoute.options.component />);
    expect(screen.getByText("Consent Documents")).toBeInTheDocument();
    expect(screen.getByText("Create Document")).toBeInTheDocument();
  });

  it("Should show loading state", () => {
    mockUseQuery.mockReturnValue({ data: null, isLoading: true, error: null });
    render(<typedRoute.options.component />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("Should show error state", () => {
    mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: { message: "Fetch failed" } });
    render(<typedRoute.options.component />);
    expect(screen.getByText("Error: Fetch failed")).toBeInTheDocument();
  });

  it("Should render DocumentsTable when data is available", () => {
    mockUseQuery.mockReturnValue({ data: { data: [{ id: "d1" }], page: 1, totalPages: 1 }, isLoading: false, error: null });
    render(<typedRoute.options.component />);
    expect(screen.getByTestId("documents-table")).toBeInTheDocument();
  });

  describe("Interaction: goToPage", () => {
    it("Should call navigate with page 2 when NextPage is clicked", () => {
      mockUseQuery.mockReturnValue({ data: { data: [{ id: "d1" }], page: 1, totalPages: 3 }, isLoading: false, error: null });
      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("NextPage"));
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({ replace: true }),
      );
      const callArg = mockNavigate.mock.calls[0][0];
      const searchResult = callArg.search({ page: 1 });
      expect(searchResult.page).toBe(2);
    });

    it("Should set page to undefined when navigating to page 1", () => {
      mockUseQuery.mockReturnValue({ data: { data: [{ id: "d1" }], page: 2, totalPages: 3 }, isLoading: false, error: null });
      // Mock a table that calls onPageChange(1)
      jest.requireMock("src/features/admin/consent-documents/components/documents-table.component").DocumentsTable = ({ documents, onPageChange, onDelete }: any) => (
        <div data-testid="documents-table" data-count={documents?.length ?? 0}>
          <button onClick={() => onPageChange(1)}>FirstPage</button>
          <button onClick={() => onDelete("doc-to-delete")}>DeleteRow</button>
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

  describe("Interaction: setDeletingDocId via onDelete", () => {
    it("Should pass docId to DeleteDocumentDialog when a row's delete is triggered", () => {
      // Restore original mock
      jest.requireMock("src/features/admin/consent-documents/components/documents-table.component").DocumentsTable = ({ documents, onPageChange, onDelete }: any) => (
        <div data-testid="documents-table" data-count={documents?.length ?? 0}>
          <button onClick={() => onPageChange(2)}>NextPage</button>
          <button onClick={() => onDelete("doc-to-delete")}>DeleteRow</button>
        </div>
      );
      mockUseQuery.mockReturnValue({ data: { data: [{ id: "d1" }], page: 1, totalPages: 1 }, isLoading: false, error: null });
      render(<typedRoute.options.component />);
      expect(screen.getByTestId("delete-dialog")).toHaveAttribute("data-doc-id", "none");
      fireEvent.click(screen.getByText("DeleteRow"));
      expect(screen.getByTestId("delete-dialog")).toHaveAttribute("data-doc-id", "doc-to-delete");
    });

    it("Should clear deletingDocId when CancelDelete is clicked", () => {
      jest.requireMock("src/features/admin/consent-documents/components/documents-table.component").DocumentsTable = ({ documents, onPageChange, onDelete }: any) => (
        <div data-testid="documents-table" data-count={documents?.length ?? 0}>
          <button onClick={() => onPageChange(2)}>NextPage</button>
          <button onClick={() => onDelete("doc-to-delete")}>DeleteRow</button>
        </div>
      );
      mockUseQuery.mockReturnValue({ data: { data: [{ id: "d1" }], page: 1, totalPages: 1 }, isLoading: false, error: null });
      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("DeleteRow"));
      expect(screen.getByTestId("delete-dialog")).toHaveAttribute("data-doc-id", "doc-to-delete");
      fireEvent.click(screen.getByText("CancelDelete"));
      expect(screen.getByTestId("delete-dialog")).toHaveAttribute("data-doc-id", "none");
    });

    it("Should call deleteMutation.mutate when ConfirmDelete is clicked with a docId set", () => {
      jest.requireMock("src/features/admin/consent-documents/components/documents-table.component").DocumentsTable = ({ documents, onPageChange, onDelete }: any) => (
        <div data-testid="documents-table" data-count={documents?.length ?? 0}>
          <button onClick={() => onPageChange(2)}>NextPage</button>
          <button onClick={() => onDelete("doc-to-delete")}>DeleteRow</button>
        </div>
      );
      mockUseQuery.mockReturnValue({ data: { data: [{ id: "d1" }], page: 1, totalPages: 1 }, isLoading: false, error: null });
      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("DeleteRow"));
      fireEvent.click(screen.getByText("ConfirmDelete"));
      expect(mockDeleteMutate).toHaveBeenCalledWith("doc-to-delete", expect.any(Object));
    });
  });

  describe("Interaction: handleOrgUnitChange with debounce", () => {
    it("Should update orgUnitFilter immediately on input change and debounce navigate call", () => {
      jest.useFakeTimers();
      mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: null });
      render(<typedRoute.options.component />);
      const input = screen.getByTestId("org-unit-input");
      fireEvent.change(input, { target: { value: "ministry-of-health" } });
      // navigate should NOT have been called yet (debounce)
      expect(mockNavigate).not.toHaveBeenCalled();
      // Advance timers past the 400ms debounce
      jest.advanceTimersByTime(400);
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({ replace: true }),
      );
      jest.useRealTimers();
    });

    it("Should call navigate with orgUnitId undefined when filter is cleared", () => {
      jest.useFakeTimers();
      mockUseSearch.mockReturnValue({ page: 1, orgUnitId: "ou-old" });
      mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: null });
      render(<typedRoute.options.component />);
      const input = screen.getByTestId("org-unit-input");
      fireEvent.change(input, { target: { value: "" } });
      jest.advanceTimersByTime(400);
      expect(mockNavigate).toHaveBeenCalled();
      const callArg = mockNavigate.mock.calls[0][0];
      const searchResult = callArg.search({ page: 1, orgUnitId: "ou-old" });
      expect(searchResult.orgUnitId).toBeUndefined();
      jest.useRealTimers();
    });
  });

  describe("Interaction: handleCreated navigates to new document", () => {
    it("Should navigate to the new document page when CreateDocumentDialog fires onCreated", () => {
      mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: null });
      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("TriggerCreated"));
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "/admin/consent/documents/$docId",
          params: { docId: "new-doc-1" },
        }),
      );
    });
  });
});
