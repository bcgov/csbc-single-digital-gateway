import { cleanup, render, screen } from "@testing-library/react";

jest.mock("@repo/ui", () => ({
  Table: ({ children }: { children?: React.ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children?: React.ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children?: React.ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children?: React.ReactNode }) => <th>{children}</th>,
  TableCell: ({ children }: { children?: React.ReactNode }) => <td>{children}</td>,
}));

jest.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params, ...props }: any) => (
    <a href={typeof to === "string" ? to : "#"} data-testid="router-link" {...props}>{children}</a>
  ),
}));

jest.mock("src/features/admin/components/version-status-badge.component", () => ({
  VersionStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

import { ServiceTypeVersionsTable } from "src/features/admin/service-types/components/service-type-versions-table.component";

type ServiceTypeVersionSummary = {
  id: string;
  name: string | null;
  description: string | null;
  version: number;
  status: "draft" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
};

const makeVersion = (overrides: Partial<ServiceTypeVersionSummary> = {}): ServiceTypeVersionSummary => ({
  id: "stver111-aaaa-bbbb-cccc-ddddeeeeffff",
  name: "Health Type v1",
  description: "First version of the health service type",
  version: 1,
  status: "draft",
  createdAt: "2024-06-15T11:00:00.000Z",
  updatedAt: "2024-06-15T11:00:00.000Z",
  publishedAt: null,
  archivedAt: null,
  ...overrides,
});

describe("ServiceTypeVersionsTable", () => {
  const typeId = "type-parent-1111-aaaa-bbbbccccdddd";

  afterEach(cleanup);

  describe("Empty state", () => {
    it("should show empty message when versions array is empty", () => {
      render(<ServiceTypeVersionsTable typeId={typeId} versions={[]} />);

      expect(screen.getByText("No versions yet.")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  describe("Column headers", () => {
    it("should render all expected column headers when versions exist", () => {
      render(<ServiceTypeVersionsTable typeId={typeId} versions={[makeVersion()]} />);

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(screen.getByText("Version")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Created")).toBeInTheDocument();
      expect(screen.getByText("Published")).toBeInTheDocument();
    });
  });

  describe("Row rendering", () => {
    it("should render one row per version", () => {
      const versions = [
        makeVersion({ id: "stver-001", name: "First Draft", version: 1 }),
        makeVersion({ id: "stver-002", name: "Second Draft", version: 2 }),
        makeVersion({ id: "stver-003", name: "Live Release", version: 3 }),
      ];

      render(<ServiceTypeVersionsTable typeId={typeId} versions={versions} />);

      expect(screen.getByText("First Draft")).toBeInTheDocument();
      expect(screen.getByText("Second Draft")).toBeInTheDocument();
      expect(screen.getByText("Live Release")).toBeInTheDocument();
    });

    it("should use version number as link text when name is null", () => {
      render(
        <ServiceTypeVersionsTable
          typeId={typeId}
          versions={[makeVersion({ name: null, version: 2 })]}
        />,
      );

      const link = screen.getByTestId("router-link");
      expect(link).toHaveTextContent("v2");
    });

    it("should render a link that targets the correct service type version route", () => {
      const versionId = "stver-link-target-7777";

      render(
        <ServiceTypeVersionsTable
          typeId={typeId}
          versions={[makeVersion({ id: versionId, name: "Approved Version" })]}
        />,
      );

      const link = screen.getByTestId("router-link");
      expect(link).toHaveAttribute(
        "href",
        "/admin/settings/services/service-types/$typeId/versions/$versionId",
      );
      expect(link).toHaveTextContent("Approved Version");
    });

    it("should display the version number formatted as v{n}", () => {
      render(
        <ServiceTypeVersionsTable
          typeId={typeId}
          versions={[makeVersion({ name: "Named Type Version", version: 9 })]}
        />,
      );

      expect(screen.getByText("v9")).toBeInTheDocument();
    });

    it("should render the status badge with the correct status value", () => {
      render(
        <ServiceTypeVersionsTable
          typeId={typeId}
          versions={[makeVersion({ status: "archived" })]}
        />,
      );

      const badge = screen.getByTestId("status-badge");
      expect(badge).toHaveTextContent("archived");
    });

    it("should show em dash for publishedAt when null", () => {
      render(
        <ServiceTypeVersionsTable
          typeId={typeId}
          versions={[makeVersion({ publishedAt: null, description: "Some description" })]}
        />,
      );

      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("should show formatted publishedAt date when set", () => {
      render(
        <ServiceTypeVersionsTable
          typeId={typeId}
          versions={[makeVersion({ publishedAt: "2024-12-01T00:00:00.000Z" })]}
        />,
      );

      expect(screen.queryByText("—")).not.toBeInTheDocument();
    });

    it("should show em dash for description when null", () => {
      render(
        <ServiceTypeVersionsTable
          typeId={typeId}
          versions={[makeVersion({ description: null, publishedAt: "2024-01-01T00:00:00.000Z" })]}
        />,
      );

      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("should render correct status badges for each version in a multi-version table", () => {
      const versions = [
        makeVersion({ id: "stv-a", status: "draft", name: "Draft Version", version: 1 }),
        makeVersion({ id: "stv-b", status: "published", name: "Live Version", version: 2 }),
      ];

      render(<ServiceTypeVersionsTable typeId={typeId} versions={versions} />);

      const badges = screen.getAllByTestId("status-badge");
      expect(badges).toHaveLength(2);
      expect(badges[0]).toHaveTextContent("draft");
      expect(badges[1]).toHaveTextContent("published");
    });
  });
});
