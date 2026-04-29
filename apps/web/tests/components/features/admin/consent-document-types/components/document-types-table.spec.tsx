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

import { DocumentTypesTable } from "src/features/admin/consent-document-types/components/document-types-table.component";

type ConsentDocumentTypeListItem = {
  id: string;
  name: string | null;
  description: string | null;
  publishedConsentDocumentTypeVersionId: string | null;
  updatesPending: boolean;
  createdAt: string;
  updatedAt: string;
};

const makeDocumentType = (overrides: Partial<ConsentDocumentTypeListItem> = {}): ConsentDocumentTypeListItem => ({
  id: "dtype111-aaaa-bbbb-cccc-ddddeeeeffff",
  name: "Standard Consent",
  description: "Standard consent document type",
  publishedConsentDocumentTypeVersionId: null,
  updatesPending: false,
  createdAt: "2024-07-01T09:00:00.000Z",
  updatedAt: "2024-07-01T09:00:00.000Z",
  ...overrides,
});

describe("DocumentTypesTable", () => {
  const onPageChange = jest.fn();
  const onDelete = jest.fn();

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe("Empty state", () => {
    it("should show empty message when no types and on page 1", () => {
      render(
        <DocumentTypesTable
          types={[]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("No document types found.")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("should NOT show empty message when empty but past page 1", () => {
      render(
        <DocumentTypesTable
          types={[]}
          currentPage={2}
          totalPages={4}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.queryByText("No document types found.")).not.toBeInTheDocument();
      expect(screen.getByRole("table")).toBeInTheDocument();
    });
  });

  describe("Column headers", () => {
    it("should render all expected column headers", () => {
      render(
        <DocumentTypesTable
          types={[makeDocumentType()]}
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
    it("should render one row per document type", () => {
      const types = [
        makeDocumentType({ id: "dtype-001", name: "General Consent" }),
        makeDocumentType({ id: "dtype-002", name: "Medical Consent" }),
        makeDocumentType({ id: "dtype-003", name: "Financial Consent" }),
      ];

      render(
        <DocumentTypesTable
          types={types}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("General Consent")).toBeInTheDocument();
      expect(screen.getByText("Medical Consent")).toBeInTheDocument();
      expect(screen.getByText("Financial Consent")).toBeInTheDocument();
    });

    it("should display type name in a router link pointing to the document type detail page", () => {
      render(
        <DocumentTypesTable
          types={[makeDocumentType({ id: "dtype-nav-id", name: "Legal Consent" })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      const link = screen.getByTestId("router-link");
      expect(link).toHaveTextContent("Legal Consent");
      expect(link).toHaveAttribute("href", "/admin/settings/consent/document-types/$typeId");
    });

    it("should show truncated id when name is null", () => {
      render(
        <DocumentTypesTable
          types={[makeDocumentType({ id: "abcdefgh-1234-5678-abcd-ef0011223344", name: null })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      // Source slices 0-8 without ellipsis for document-types
      expect(screen.getByTestId("router-link")).toHaveTextContent("abcdefgh");
    });

    it("should display description when present", () => {
      render(
        <DocumentTypesTable
          types={[makeDocumentType({ description: "A special consent document type" })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("A special consent document type")).toBeInTheDocument();
    });

    it("should display em dash when description is null", () => {
      render(
        <DocumentTypesTable
          types={[makeDocumentType({ description: null })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("should show Published status when publishedConsentDocumentTypeVersionId is set", () => {
      render(
        <DocumentTypesTable
          types={[makeDocumentType({ publishedConsentDocumentTypeVersionId: "cdtv-pub-001" })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("Published")).toBeInTheDocument();
    });

    it("should show Draft status when publishedConsentDocumentTypeVersionId is null", () => {
      render(
        <DocumentTypesTable
          types={[makeDocumentType({ publishedConsentDocumentTypeVersionId: null })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("Draft")).toBeInTheDocument();
    });

    it("should show Updates pending badge when updatesPending is true", () => {
      render(
        <DocumentTypesTable
          types={[makeDocumentType({ publishedConsentDocumentTypeVersionId: "cdtv-001", updatesPending: true })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("Updates pending")).toBeInTheDocument();
    });

    it("should NOT show Updates pending badge when updatesPending is false", () => {
      render(
        <DocumentTypesTable
          types={[makeDocumentType({ updatesPending: false })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.queryByText("Updates pending")).not.toBeInTheDocument();
    });
  });

  describe("Delete action", () => {
    it("should call onDelete with the type id when delete button is clicked", () => {
      const typeId = "dtype-delete-target-abc";

      render(
        <DocumentTypesTable
          types={[makeDocumentType({ id: typeId })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      const trashIcon = screen.getByTestId("icon-trash");
      fireEvent.click(trashIcon.closest("button")!);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith(typeId);
    });

    it("should call onDelete for the correct type when multiple are displayed", () => {
      const types = [
        makeDocumentType({ id: "dtype-row-alpha", name: "Alpha Type" }),
        makeDocumentType({ id: "dtype-row-beta", name: "Beta Type" }),
      ];

      render(
        <DocumentTypesTable
          types={types}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      const trashIcons = screen.getAllByTestId("icon-trash");
      fireEvent.click(trashIcons[1].closest("button")!);

      expect(onDelete).toHaveBeenCalledWith("dtype-row-beta");
    });
  });

  describe("Pagination", () => {
    it("should not show pagination when totalPages is 1", () => {
      render(
        <DocumentTypesTable
          types={[makeDocumentType()]}
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
        <DocumentTypesTable
          types={[makeDocumentType()]}
          currentPage={1}
          totalPages={2}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByTestId("pagination")).toBeInTheDocument();
    });

    it("should call onPageChange with decremented page when Previous is clicked", () => {
      render(
        <DocumentTypesTable
          types={[makeDocumentType()]}
          currentPage={4}
          totalPages={6}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      fireEvent.click(screen.getByTestId("pagination-previous"));
      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it("should call onPageChange with incremented page when Next is clicked", () => {
      render(
        <DocumentTypesTable
          types={[makeDocumentType()]}
          currentPage={4}
          totalPages={6}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      fireEvent.click(screen.getByTestId("pagination-next"));
      expect(onPageChange).toHaveBeenCalledWith(5);
    });

    it("should disable Previous button on page 1", () => {
      render(
        <DocumentTypesTable
          types={[makeDocumentType()]}
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
        <DocumentTypesTable
          types={[makeDocumentType()]}
          currentPage={6}
          totalPages={6}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByTestId("pagination-next")).toHaveAttribute("aria-disabled", "true");
    });
  });
});
