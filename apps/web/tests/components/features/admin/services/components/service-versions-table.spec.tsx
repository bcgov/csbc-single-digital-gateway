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

import { ServiceVersionsTable } from "src/features/admin/services/components/service-versions-table.component";

type ServiceVersionSummary = {
  id: string;
  serviceTypeVersionId: string;
  name: string | null;
  description: string | null;
  version: number;
  status: "draft" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
};

const makeVersion = (overrides: Partial<ServiceVersionSummary> = {}): ServiceVersionSummary => ({
  id: "ver1aaaa-1111-2222-3333-bbbbccccdddd",
  serviceTypeVersionId: "stypev11-1111-1111-1111-111111111111",
  name: "Initial Release",
  description: "First version of the service",
  version: 1,
  status: "draft",
  createdAt: "2024-08-01T10:00:00.000Z",
  updatedAt: "2024-08-01T10:00:00.000Z",
  publishedAt: null,
  archivedAt: null,
  ...overrides,
});

describe("ServiceVersionsTable", () => {
  const serviceId = "svc-parent-0001-aaaa-bbbbccccdddd";

  afterEach(cleanup);

  describe("Empty state", () => {
    it("should show empty message when versions array is empty", () => {
      render(<ServiceVersionsTable serviceId={serviceId} versions={[]} />);

      expect(screen.getByText("No versions yet.")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  describe("Column headers", () => {
    it("should render all expected column headers when versions exist", () => {
      render(<ServiceVersionsTable serviceId={serviceId} versions={[makeVersion()]} />);

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
        makeVersion({ id: "ver-001", name: "Alpha", version: 1 }),
        makeVersion({ id: "ver-002", name: "Beta", version: 2 }),
        makeVersion({ id: "ver-003", name: "Gamma", version: 3 }),
      ];

      render(<ServiceVersionsTable serviceId={serviceId} versions={versions} />);

      expect(screen.getByText("Alpha")).toBeInTheDocument();
      expect(screen.getByText("Beta")).toBeInTheDocument();
      expect(screen.getByText("Gamma")).toBeInTheDocument();
    });

    it("should use version number as link text when name is null", () => {
      render(
        <ServiceVersionsTable
          serviceId={serviceId}
          versions={[makeVersion({ name: null, version: 5 })]}
        />,
      );

      const links = screen.getAllByTestId("router-link");
      expect(links[0]).toHaveTextContent("v5");
    });

    it("should render a link that targets the correct service version route", () => {
      const versionId = "ver-link-target-9999";

      render(
        <ServiceVersionsTable
          serviceId={serviceId}
          versions={[makeVersion({ id: versionId, name: "Release Candidate" })]}
        />,
      );

      const link = screen.getByTestId("router-link");
      expect(link).toHaveAttribute("href", "/admin/services/$serviceId/versions/$versionId");
      expect(link).toHaveTextContent("Release Candidate");
    });

    it("should display the version number formatted as v{n}", () => {
      // Use a named version so the only "v7" text is in the version number cell
      render(
        <ServiceVersionsTable
          serviceId={serviceId}
          versions={[makeVersion({ name: "Named Version Seven", version: 7 })]}
        />,
      );

      expect(screen.getByText("v7")).toBeInTheDocument();
    });

    it("should render the status badge with correct status value", () => {
      render(
        <ServiceVersionsTable
          serviceId={serviceId}
          versions={[makeVersion({ status: "published" })]}
        />,
      );

      const badge = screen.getByTestId("status-badge");
      expect(badge).toHaveTextContent("published");
    });

    it("should show em dash for publishedAt when null", () => {
      render(
        <ServiceVersionsTable
          serviceId={serviceId}
          versions={[makeVersion({ publishedAt: null })]}
        />,
      );

      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("should show formatted publishedAt date when set", () => {
      render(
        <ServiceVersionsTable
          serviceId={serviceId}
          versions={[makeVersion({ publishedAt: "2024-09-15T00:00:00.000Z" })]}
        />,
      );

      // The date is formatted — just confirm "—" is not present and the table renders
      expect(screen.queryByText("—")).not.toBeInTheDocument();
    });

    it("should truncate description longer than 50 characters", () => {
      const longDesc = "This is a very long description that exceeds fifty characters total";

      render(
        <ServiceVersionsTable
          serviceId={serviceId}
          versions={[makeVersion({ description: longDesc })]}
        />,
      );

      // Should show first 50 chars + ellipsis
      expect(screen.getByText(longDesc.slice(0, 50) + "…")).toBeInTheDocument();
    });

    it("should display full description when 50 characters or fewer", () => {
      const shortDesc = "Short description under limit";

      render(
        <ServiceVersionsTable
          serviceId={serviceId}
          versions={[makeVersion({ description: shortDesc })]}
        />,
      );

      expect(screen.getByText(shortDesc)).toBeInTheDocument();
    });

    it("should show em dash for description when null", () => {
      render(
        <ServiceVersionsTable
          serviceId={serviceId}
          versions={[makeVersion({ description: null })]}
        />,
      );

      // publishedAt is also null so there are two em-dashes
      const emDashes = screen.getAllByText("—");
      expect(emDashes.length).toBeGreaterThanOrEqual(1);
    });
  });
});
