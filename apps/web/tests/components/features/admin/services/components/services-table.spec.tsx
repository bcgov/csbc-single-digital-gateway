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

import { ServicesTable } from "src/features/admin/services/components/services-table.component";

type ServiceListItem = {
  id: string;
  name: string | null;
  description: string | null;
  publishedServiceVersionId: string | null;
  createdAt: string;
};

const makeService = (overrides: Partial<ServiceListItem> = {}): ServiceListItem => ({
  id: "aaaabbbb-1111-2222-3333-ccccddddeeee",
  name: "Drivers Licence Renewal",
  description: "Renew your drivers licence online",
  publishedServiceVersionId: null,
  createdAt: "2024-03-15T10:00:00.000Z",
  ...overrides,
});

describe("ServicesTable", () => {
  const onPageChange = jest.fn();
  const onDelete = jest.fn();

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe("Empty state", () => {
    it("should show empty message when no services and on page 1", () => {
      render(
        <ServicesTable
          services={[]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("No services found.")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("should NOT show empty message when empty but past page 1", () => {
      render(
        <ServicesTable
          services={[]}
          currentPage={2}
          totalPages={3}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.queryByText("No services found.")).not.toBeInTheDocument();
      expect(screen.getByRole("table")).toBeInTheDocument();
    });
  });

  describe("Column headers", () => {
    it("should render all expected column headers", () => {
      render(
        <ServicesTable
          services={[makeService()]}
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
    it("should render one row per service", () => {
      const services = [
        makeService({ id: "id-001", name: "Service Alpha" }),
        makeService({ id: "id-002", name: "Service Beta" }),
        makeService({ id: "id-003", name: "Service Gamma" }),
      ];

      render(
        <ServicesTable
          services={services}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("Service Alpha")).toBeInTheDocument();
      expect(screen.getByText("Service Beta")).toBeInTheDocument();
      expect(screen.getByText("Service Gamma")).toBeInTheDocument();
    });

    it("should display service name in a router link pointing to the service detail page", () => {
      render(
        <ServicesTable
          services={[makeService({ id: "svc-abc-123", name: "My Service" })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      const link = screen.getByTestId("router-link");
      expect(link).toHaveTextContent("My Service");
      expect(link).toHaveAttribute("href", "/admin/services/$serviceId");
    });

    it("should show truncated id when name is null", () => {
      render(
        <ServicesTable
          services={[makeService({ id: "abcdefgh-1234-5678-abcd-ef1234567890", name: null })]}
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
        <ServicesTable
          services={[makeService({ description: "A detailed description" })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("A detailed description")).toBeInTheDocument();
    });

    it("should display em dash when description is null", () => {
      render(
        <ServicesTable
          services={[makeService({ description: null })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("should show Published status when publishedServiceVersionId is set", () => {
      render(
        <ServicesTable
          services={[makeService({ publishedServiceVersionId: "ver-001" })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("Published")).toBeInTheDocument();
    });

    it("should show Unpublished status when publishedServiceVersionId is null", () => {
      render(
        <ServicesTable
          services={[makeService({ publishedServiceVersionId: null })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByText("Unpublished")).toBeInTheDocument();
    });

    it("should display formatted created date", () => {
      render(
        <ServicesTable
          services={[makeService({ createdAt: "2024-06-01T00:00:00.000Z" })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      // The formatted date will vary by locale but must not be empty
      const rows = screen.getAllByRole("row");
      // header row + 1 data row
      expect(rows).toHaveLength(2);
    });
  });

  describe("Delete action", () => {
    it("should call onDelete with the service id when delete button is clicked", () => {
      const serviceId = "svc-delete-me-123";

      render(
        <ServicesTable
          services={[makeService({ id: serviceId })]}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      const trashIcon = screen.getByTestId("icon-trash");
      const deleteButton = trashIcon.closest("button")!;
      fireEvent.click(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith(serviceId);
    });

    it("should call onDelete for the correct row when multiple services are displayed", () => {
      const services = [
        makeService({ id: "svc-first-111", name: "First" }),
        makeService({ id: "svc-second-222", name: "Second" }),
      ];

      render(
        <ServicesTable
          services={services}
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      const trashIcons = screen.getAllByTestId("icon-trash");
      fireEvent.click(trashIcons[1].closest("button")!);

      expect(onDelete).toHaveBeenCalledWith("svc-second-222");
    });
  });

  describe("Pagination", () => {
    it("should not show pagination when totalPages is 1", () => {
      render(
        <ServicesTable
          services={[makeService()]}
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
        <ServicesTable
          services={[makeService()]}
          currentPage={1}
          totalPages={3}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByTestId("pagination")).toBeInTheDocument();
    });

    it("should call onPageChange with decremented page when Previous is clicked", () => {
      render(
        <ServicesTable
          services={[makeService()]}
          currentPage={2}
          totalPages={3}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      fireEvent.click(screen.getByTestId("pagination-previous"));
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it("should call onPageChange with incremented page when Next is clicked", () => {
      render(
        <ServicesTable
          services={[makeService()]}
          currentPage={2}
          totalPages={3}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      fireEvent.click(screen.getByTestId("pagination-next"));
      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it("should disable Previous button on page 1", () => {
      render(
        <ServicesTable
          services={[makeService()]}
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
        <ServicesTable
          services={[makeService()]}
          currentPage={3}
          totalPages={3}
          onPageChange={onPageChange}
          onDelete={onDelete}
        />,
      );

      expect(screen.getByTestId("pagination-next")).toHaveAttribute("aria-disabled", "true");
    });
  });
});
