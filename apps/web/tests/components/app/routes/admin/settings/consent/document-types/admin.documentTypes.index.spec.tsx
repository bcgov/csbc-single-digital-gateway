import { createFileRoute } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";

let mockUseSearch: jest.Mock;
let mockNavigate: jest.Mock;
const mockUseQuery = jest.fn();
const mockDeleteMutate = jest.fn();

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
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Separator: () => <hr />,
}));
jest.mock("@tabler/icons-react", () => ({ IconPlus: () => <span /> }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("src/features/admin/consent-document-types/components/create-document-type-dialog.component", () => ({
  CreateDocumentTypeDialog: ({ trigger, onCreated }: any) => (
    <div data-testid="create-dialog">
      {trigger}
      <button onClick={() => onCreated({ id: "new-doc-type-1" })}>TriggerCreated</button>
    </div>
  ),
}));
jest.mock("src/features/admin/consent-document-types/components/delete-document-type-dialog.component", () => ({
  DeleteDocumentTypeDialog: ({ typeId, onConfirm, onCancel }: any) => (
    <div data-testid="delete-dialog" data-type-id={typeId ?? "none"}>
      <button onClick={onConfirm}>ConfirmDelete</button>
      <button onClick={onCancel}>CancelDelete</button>
    </div>
  ),
}));
jest.mock("src/features/admin/consent-document-types/components/document-types-table.component", () => ({
  DocumentTypesTable: ({ types, onPageChange, onDelete }: any) => (
    <div data-testid="types-table" data-count={types?.length ?? 0}>
      <button onClick={() => onPageChange(2)}>NextPage</button>
      <button onClick={() => onDelete("doc-type-to-delete")}>DeleteRow</button>
    </div>
  ),
}));
jest.mock("src/features/admin/consent-document-types/data/consent-document-types.mutations", () => ({
  useDeleteDocumentType: () => ({ mutate: mockDeleteMutate, isPending: false }),
}));
jest.mock("src/features/admin/consent-document-types/data/consent-document-types.query", () => ({ documentTypesQueryOptions: jest.fn() }));

const { __mockUseSearch, __mockNavigate } = jest.requireMock("@tanstack/react-router") as {
  __mockUseSearch: jest.Mock;
  __mockNavigate: jest.Mock;
};
mockUseSearch = __mockUseSearch;
mockNavigate = __mockNavigate;

import { Route } from "src/app/routes/admin/settings/consent/document-types/index";

type RouteLike = { path: string; options: { component: ComponentType; staticData: { breadcrumbs: () => unknown[] } } };
const typedRoute = Route as unknown as RouteLike;

describe("Admin Document Types Index Route", () => {
  beforeEach(() => {
    mockUseSearch.mockReturnValue({ page: 1 });
    mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: null });
  });
  afterEach(() => { cleanup(); jest.clearAllMocks(); });

  it("Should register route", () => {
    expect((createFileRoute as unknown as jest.Mock)).toHaveBeenCalledWith("/admin/settings/consent/document-types/");
  });

  it("Should return breadcrumbs", () => {
    expect(typedRoute.options.staticData.breadcrumbs()).toEqual([
      { label: "Settings", to: "/admin/settings" }, { label: "Document Types" },
    ]);
  });

  it("Should render heading and create button", () => {
    render(<typedRoute.options.component />);
    expect(screen.getByText("Consent Document Types")).toBeInTheDocument();
    expect(screen.getByText("Create Type")).toBeInTheDocument();
  });

  it("Should show loading state", () => {
    mockUseQuery.mockReturnValue({ data: null, isLoading: true, error: null });
    render(<typedRoute.options.component />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("Should show error state", () => {
    mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: { message: "Err" } });
    render(<typedRoute.options.component />);
    expect(screen.getByText("Error: Err")).toBeInTheDocument();
  });

  it("Should render types table when data available", () => {
    mockUseQuery.mockReturnValue({ data: { data: [{ id: "t1" }], page: 1, totalPages: 1 }, isLoading: false, error: null });
    render(<typedRoute.options.component />);
    expect(screen.getByTestId("types-table")).toBeInTheDocument();
  });

  describe("Interaction: goToPage", () => {
    it("Should call navigate with page 2 when DocumentTypesTable fires onPageChange(2)", () => {
      mockUseQuery.mockReturnValue({ data: { data: [{ id: "dt1" }], page: 1, totalPages: 3 }, isLoading: false, error: null });
      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("NextPage"));
      expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ replace: true }));
      const callArg = mockNavigate.mock.calls[0][0];
      const searchResult = callArg.search({ page: 1 });
      expect(searchResult.page).toBe(2);
    });

    it("Should set page to undefined when navigating to page 1", () => {
      mockUseQuery.mockReturnValue({ data: { data: [{ id: "dt1" }], page: 2, totalPages: 3 }, isLoading: false, error: null });
      jest.requireMock("src/features/admin/consent-document-types/components/document-types-table.component").DocumentTypesTable = ({ types, onPageChange, onDelete }: any) => (
        <div data-testid="types-table" data-count={types?.length ?? 0}>
          <button onClick={() => onPageChange(1)}>FirstPage</button>
          <button onClick={() => onDelete("doc-type-to-delete")}>DeleteRow</button>
        </div>
      );
      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("FirstPage"));
      const callArg = mockNavigate.mock.calls[0][0];
      const searchResult = callArg.search({ page: 2 });
      expect(searchResult.page).toBeUndefined();
    });
  });

  describe("Interaction: setDeletingTypeId via onDelete", () => {
    it("Should set typeId on DeleteDocumentTypeDialog when a row delete is triggered", () => {
      jest.requireMock("src/features/admin/consent-document-types/components/document-types-table.component").DocumentTypesTable = ({ types, onPageChange, onDelete }: any) => (
        <div data-testid="types-table" data-count={types?.length ?? 0}>
          <button onClick={() => onPageChange(2)}>NextPage</button>
          <button onClick={() => onDelete("doc-type-to-delete")}>DeleteRow</button>
        </div>
      );
      mockUseQuery.mockReturnValue({ data: { data: [{ id: "dt1" }], page: 1, totalPages: 1 }, isLoading: false, error: null });
      render(<typedRoute.options.component />);
      expect(screen.getByTestId("delete-dialog")).toHaveAttribute("data-type-id", "none");
      fireEvent.click(screen.getByText("DeleteRow"));
      expect(screen.getByTestId("delete-dialog")).toHaveAttribute("data-type-id", "doc-type-to-delete");
    });

    it("Should clear deletingTypeId when CancelDelete is clicked", () => {
      jest.requireMock("src/features/admin/consent-document-types/components/document-types-table.component").DocumentTypesTable = ({ types, onPageChange, onDelete }: any) => (
        <div data-testid="types-table" data-count={types?.length ?? 0}>
          <button onClick={() => onPageChange(2)}>NextPage</button>
          <button onClick={() => onDelete("doc-type-to-delete")}>DeleteRow</button>
        </div>
      );
      mockUseQuery.mockReturnValue({ data: { data: [{ id: "dt1" }], page: 1, totalPages: 1 }, isLoading: false, error: null });
      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("DeleteRow"));
      expect(screen.getByTestId("delete-dialog")).toHaveAttribute("data-type-id", "doc-type-to-delete");
      fireEvent.click(screen.getByText("CancelDelete"));
      expect(screen.getByTestId("delete-dialog")).toHaveAttribute("data-type-id", "none");
    });

    it("Should call deleteMutation.mutate with the correct typeId when ConfirmDelete is clicked", () => {
      jest.requireMock("src/features/admin/consent-document-types/components/document-types-table.component").DocumentTypesTable = ({ types, onPageChange, onDelete }: any) => (
        <div data-testid="types-table" data-count={types?.length ?? 0}>
          <button onClick={() => onPageChange(2)}>NextPage</button>
          <button onClick={() => onDelete("doc-type-to-delete")}>DeleteRow</button>
        </div>
      );
      mockUseQuery.mockReturnValue({ data: { data: [{ id: "dt1" }], page: 1, totalPages: 1 }, isLoading: false, error: null });
      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("DeleteRow"));
      fireEvent.click(screen.getByText("ConfirmDelete"));
      expect(mockDeleteMutate).toHaveBeenCalledWith("doc-type-to-delete", expect.any(Object));
    });

    it("Should show toast.success after successful delete and clear deletingTypeId", () => {
      const { toast } = jest.requireMock("sonner") as { toast: { success: jest.Mock; error: jest.Mock } };
      mockDeleteMutate.mockImplementation((_id: string, { onSuccess }: { onSuccess: () => void }) => {
        onSuccess();
      });
      jest.requireMock("src/features/admin/consent-document-types/components/document-types-table.component").DocumentTypesTable = ({ types, onPageChange, onDelete }: any) => (
        <div data-testid="types-table" data-count={types?.length ?? 0}>
          <button onClick={() => onPageChange(2)}>NextPage</button>
          <button onClick={() => onDelete("doc-type-to-delete")}>DeleteRow</button>
        </div>
      );
      mockUseQuery.mockReturnValue({ data: { data: [{ id: "dt1" }], page: 1, totalPages: 1 }, isLoading: false, error: null });
      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("DeleteRow"));
      fireEvent.click(screen.getByText("ConfirmDelete"));
      expect(toast.success).toHaveBeenCalledWith("Document type deleted.");
      expect(screen.getByTestId("delete-dialog")).toHaveAttribute("data-type-id", "none");
    });
  });

  describe("Interaction: handleCreated navigates to new document type", () => {
    it("Should navigate to the new document type page when CreateDocumentTypeDialog fires onCreated", () => {
      mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: null });
      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("TriggerCreated"));
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "/admin/settings/consent/document-types/$typeId",
          params: { typeId: "new-doc-type-1" },
        }),
      );
    });
  });
});
