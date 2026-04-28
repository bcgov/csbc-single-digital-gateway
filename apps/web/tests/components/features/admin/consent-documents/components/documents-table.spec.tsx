import { cleanup, fireEvent, render, screen } from "@testing-library/react";

jest.mock("@repo/ui", () => ({
  Table: ({ children }: { children?: React.ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children?: React.ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <tr className={className}>{children}</tr>
  ),
  TableHead: ({ children }: { children?: React.ReactNode }) => <th>{children}</th>,
  TableCell: ({ children }: { children?: React.ReactNode }) => <td>{children}</td>,
  Button: ({ children, onClick }: { children?: React.ReactNode; onClick?: React.MouseEventHandler }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
  Pagination: ({ children }: { children?: React.ReactNode }) => <nav data-testid="pagination">{children}</nav>,
  PaginationContent: ({ children }: { children?: React.ReactNode }) => <ul>{children}</ul>,
  PaginationItem: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  PaginationLink: ({ children, onClick, isActive }: { children?: React.ReactNode; onClick?: () => void; isActive?: boolean }) => (
    <button type="button" onClick={onClick} data-active={isActive}>{children}</button>
  ),
  PaginationPrevious: ({ onClick, "aria-disabled": ariaDisabled }: { onClick?: () => void; "aria-disabled"?: boolean }) => (
    <button type="button" onClick={onClick} data-testid="pagination-previous" aria-disabled={ariaDisabled}>Previous</button>
  ),
  PaginationNext: ({ onClick, "aria-disabled": ariaDisabled }: { onClick?: () => void; "aria-disabled"?: boolean }) => (
    <button type="button" onClick={onClick} data-testid="pagination-next" aria-disabled={ariaDisabled}>Next</button>
  ),
}));

jest.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params, ...props }: any) => (
    <a href={typeof to === "string" ? to : "#"} data-testid="router-link" {...props}>{children}</a>
  ),
}));

jest.mock("@tabler/icons-react", () => ({
  IconTrash: () => <span data-testid="icon-trash" />,
}));

import { DocumentsTable } from "src/features/admin/consent-documents/components/documents-table.component";

type ConsentDocumentListItem = {
  id: string;
  consentDocumentTypeId: string;
  orgUnitId: string;
  name: string | null;
  description: string | null;
  publishedConsentDocumentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
};

const makeDocument = (overrides: Partial<ConsentDocumentListItem> = {}): ConsentDocumentListItem => ({
  id: "ddddeeee-1111-2222-3333-aabbccddeeff",
  consentDocumentTypeId: "cdtype11-1111-1111-1111-111111111111",
  orgUnitId: "orgu1111-1111-1111-1111-111111111111",
  name: "Privacy Consent Form",
  description: "Standard privacy consent for BC services",
  publishedConsentDocumentVersionId: null,
  createdAt: "2024-04-20T08:00:00.000Z",
  updatedAt: "2024-04-20T08:00:00.000Z",
  ...overrides,
});

describe("DocumentsTable", () => {
  const onPageChange = jest.fn();
  const onDelete = jest.fn();

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe("Empty state", () => {
    it("should show empty message when no documents and on page 1", () => {
      render(
        <DocumentsTable
          documents={[]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("No documents found.")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("should NOT show empty message when empty but past page 1", () => {
      render(
        <DocumentsTable
          documents={[]}
          currentPage={2}
          totalPages={3}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.queryByText("No documents found.")).not.toBeInTheDocument();
      expect(screen.getByRole("table")).toBeInTheDocument();
    });
  });

  describe("Column headers", () => {
    it("should render all expected column headers", () => {
      render(
        <DocumentsTable
          documents={[makeDocument()]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Created")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });
  });

  describe("Row rendering", () => {
    it("should render one row per document", () => {
      const documents = [
        makeDocument({ id: "doc-001", name: "Consent Form Alpha" }),
        makeDocument({ id: "doc-002", name: "Consent Form Beta" }),
        makeDocument({ id: "doc-003", name: "Consent Form Gamma" }),
      ];

      render(
        <DocumentsTable
          documents={documents}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("Consent Form Alpha")).toBeInTheDocument();
      expect(screen.getByText("Consent Form Beta")).toBeInTheDocument();
      expect(screen.getByText("Consent Form Gamma")).toBeInTheDocument();
    });

    it("should display document name in a router link pointing to the document detail page", () => {
      render(
        <DocumentsTable
          documents={[makeDocument({ id: "doc-xyz-123", name: "My Consent Doc" })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      const link = screen.getByTestId("router-link");
      expect(link).toHaveTextContent("My Consent Doc");
      expect(link).toHaveAttribute("href", "/admin/consent/documents/$docId");
    });

    it("should show truncated id when name is null", () => {
      render(
        <DocumentsTable
          documents={[makeDocument({ id: "abcdefgh-9999-8888-7777-000011112222", name: null })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByTestId("router-link")).toHaveTextContent("abcdefgh…");
    });

    it("should display description when present", () => {
      render(
        <DocumentsTable
          documents={[makeDocument({ description: "Detailed consent description" })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("Detailed consent description")).toBeInTheDocument();
    });

    it("should display em dash when description is null", () => {
      render(
        <DocumentsTable
          documents={[makeDocument({ description: null })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("should show Published status when publishedConsentDocumentVersionId is set", () => {
      render(
        <DocumentsTable
          documents={[makeDocument({ publishedConsentDocumentVersionId: "cdv-001" })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("Published")).toBeInTheDocument();
    });

    it("should show Unpublished status when publishedConsentDocumentVersionId is null", () => {
      render(
        <DocumentsTable
          documents={[makeDocument({ publishedConsentDocumentVersionId: null })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("Unpublished")).toBeInTheDocument();
    });
  });

  describe("Delete action", () => {
    it("should call onDelete with the document id when delete button is clicked", () => {
      const docId = "doc-delete-me-456";

      render(
        <DocumentsTable
          documents={[makeDocument({ id: docId })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      const trashIcon = screen.getByTestId("icon-trash");
      fireEvent.click(trashIcon.closest("button")!);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith(docId);
    });

    it("should call onDelete for the correct document when multiple are displayed", () => {
      const documents = [
        makeDocument({ id: "doc-first-aaa", name: "First Doc" }),
        makeDocument({ id: "doc-second-bbb", name: "Second Doc" }),
      ];

      render(
        <DocumentsTable
          documents={documents}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      const trashIcons = screen.getAllByTestId("icon-trash");
      fireEvent.click(trashIcons[0].closest("button")!);

      expect(onDelete).toHaveBeenCalledWith("doc-first-aaa");
    });
  });

  describe("Pagination", () => {
    it("should not show pagination when totalPages is 1", () => {
      render(
        <DocumentsTable
          documents={[makeDocument()]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
    });

    it("should show pagination when totalPages is greater than 1", () => {
      render(
        <DocumentsTable
          documents={[makeDocument()]}
          currentPage={1}
          totalPages={4}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByTestId("pagination")).toBeInTheDocument();
    });

    it("should call onPageChange with decremented page when Previous is clicked", () => {
      render(
        <DocumentsTable
          documents={[makeDocument()]}
          currentPage={3}
          totalPages={5}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      fireEvent.click(screen.getByTestId("pagination-previous"));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it("should call onPageChange with incremented page when Next is clicked", () => {
      render(
        <DocumentsTable
          documents={[makeDocument()]}
          currentPage={3}
          totalPages={5}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      fireEvent.click(screen.getByTestId("pagination-next"));
      expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it("should disable Previous button on page 1", () => {
      render(
        <DocumentsTable
          documents={[makeDocument()]}
          currentPage={1}
          totalPages={2}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByTestId("pagination-previous")).toHaveAttribute("aria-disabled", "true");
    });

    it("should disable Next button on the last page", () => {
      render(
        <DocumentsTable
          documents={[makeDocument()]}
          currentPage={4}
          totalPages={4}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByTestId("pagination-next")).toHaveAttribute("aria-disabled", "true");
    });
  });
});
