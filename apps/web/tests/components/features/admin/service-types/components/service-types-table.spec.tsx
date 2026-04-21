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

import { ServiceTypesTable } from "src/features/admin/service-types/components/service-types-table.component";

type ServiceTypeListItem = {
  id: string;
  name: string | null;
  description: string | null;
  publishedServiceTypeVersionId: string | null;
  updatesPending: boolean;
  createdAt: string;
};

const makeServiceType = (overrides: Partial<ServiceTypeListItem> = {}): ServiceTypeListItem => ({
  id: "tttt1111-aaaa-bbbb-cccc-ddddeeeeffff",
  name: "Health Services",
  description: "Types of health-related services",
  publishedServiceTypeVersionId: null,
  updatesPending: false,
  createdAt: "2024-05-10T12:00:00.000Z",
  ...overrides,
});

describe("ServiceTypesTable", () => {
  const onPageChange = jest.fn();
  const onDelete = jest.fn();

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe("Empty state", () => {
    it("should show empty message when no types and on page 1", () => {
      render(
        <ServiceTypesTable
          types={[]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("No service types found.")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("should NOT show empty message when empty but past page 1", () => {
      render(
        <ServiceTypesTable
          types={[]}
          currentPage={2}
          totalPages={3}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.queryByText("No service types found.")).not.toBeInTheDocument();
      expect(screen.getByRole("table")).toBeInTheDocument();
    });
  });

  describe("Column headers", () => {
    it("should render all expected column headers", () => {
      render(
        <ServiceTypesTable
          types={[makeServiceType()]}
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
    it("should render one row per type", () => {
      const types = [
        makeServiceType({ id: "type-001", name: "Health" }),
        makeServiceType({ id: "type-002", name: "Education" }),
        makeServiceType({ id: "type-003", name: "Transport" }),
      ];

      render(
        <ServiceTypesTable
          types={types}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("Health")).toBeInTheDocument();
      expect(screen.getByText("Education")).toBeInTheDocument();
      expect(screen.getByText("Transport")).toBeInTheDocument();
    });

    it("should display type name in a router link pointing to the service type detail page", () => {
      render(
        <ServiceTypesTable
          types={[makeServiceType({ id: "type-detail-id", name: "Justice Services" })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      const link = screen.getByTestId("router-link");
      expect(link).toHaveTextContent("Justice Services");
      expect(link).toHaveAttribute("href", "/admin/settings/services/service-types/$typeId");
    });

    it("should show truncated id when name is null", () => {
      render(
        <ServiceTypesTable
          types={[makeServiceType({ id: "abcdefgh-1111-2222-3333-444455556666", name: null })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      // Source slices 0-8 without the ellipsis for service-types
      expect(screen.getByTestId("router-link")).toHaveTextContent("abcdefgh");
    });

    it("should display description when present", () => {
      render(
        <ServiceTypesTable
          types={[makeServiceType({ description: "Social support services" })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("Social support services")).toBeInTheDocument();
    });

    it("should display em dash when description is null", () => {
      render(
        <ServiceTypesTable
          types={[makeServiceType({ description: null })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("should show Published status when publishedServiceTypeVersionId is set", () => {
      render(
        <ServiceTypesTable
          types={[makeServiceType({ publishedServiceTypeVersionId: "stv-published-001" })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("Published")).toBeInTheDocument();
    });

    it("should show Draft status when publishedServiceTypeVersionId is null", () => {
      render(
        <ServiceTypesTable
          types={[makeServiceType({ publishedServiceTypeVersionId: null })]}
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
        <ServiceTypesTable
          types={[makeServiceType({ publishedServiceTypeVersionId: "stv-001", updatesPending: true })]}
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
        <ServiceTypesTable
          types={[makeServiceType({ updatesPending: false })]}
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
      const typeId = "type-delete-target-789";

      render(
        <ServiceTypesTable
          types={[makeServiceType({ id: typeId })]}
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
        makeServiceType({ id: "type-row-one", name: "Row One" }),
        makeServiceType({ id: "type-row-two", name: "Row Two" }),
        makeServiceType({ id: "type-row-three", name: "Row Three" }),
      ];

      render(
        <ServiceTypesTable
          types={types}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      const trashIcons = screen.getAllByTestId("icon-trash");
      fireEvent.click(trashIcons[2].closest("button")!);

      expect(onDelete).toHaveBeenCalledWith("type-row-three");
    });
  });

  describe("Pagination", () => {
    it("should not show pagination when totalPages is 1", () => {
      render(
        <ServiceTypesTable
          types={[makeServiceType()]}
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
        <ServiceTypesTable
          types={[makeServiceType()]}
          currentPage={2}
          totalPages={5}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByTestId("pagination")).toBeInTheDocument();
    });

    it("should call onPageChange with decremented page when Previous is clicked", () => {
      render(
        <ServiceTypesTable
          types={[makeServiceType()]}
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
        <ServiceTypesTable
          types={[makeServiceType()]}
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
        <ServiceTypesTable
          types={[makeServiceType()]}
          currentPage={1}
          totalPages={3}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByTestId("pagination-previous")).toHaveAttribute("aria-disabled", "true");
    });

    it("should disable Next button on the last page", () => {
      render(
        <ServiceTypesTable
          types={[makeServiceType()]}
          currentPage={5}
          totalPages={5}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByTestId("pagination-next")).toHaveAttribute("aria-disabled", "true");
    });
  });
});
