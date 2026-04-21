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

import { TypeVersionsTable } from "src/features/admin/consent-document-types/components/type-versions-table.component";

type ConsentDocumentTypeVersionSummary = {
  id: string;
  name: string | null;
  description: string | null;
  version: number;
  status: string;
  createdAt: string;
  publishedAt: string | null;
};

const makeVersion = (overrides: Partial<ConsentDocumentTypeVersionSummary> = {}): ConsentDocumentTypeVersionSummary => ({
  id: "cdtver11-aaaa-bbbb-cccc-ddddeeeeffff",
  name: "Consent Type v1",
  description: "Initial version of consent document type",
  version: 1,
  status: "draft",
  createdAt: "2024-07-10T14:00:00.000Z",
  publishedAt: null,
  ...overrides,
});

describe("TypeVersionsTable", () => {
  const typeId = "cdtype-parent-1111-aaaa-bbbbccccdddd";

  afterEach(cleanup);

  describe("Empty state", () => {
    it("should show empty message when versions array is empty", () => {
      render(<TypeVersionsTable typeId={typeId} versions={[]} />);

      expect(screen.getByText("No versions yet.")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  describe("Column headers", () => {
    it("should render all expected column headers when versions exist", () => {
      render(<TypeVersionsTable typeId={typeId} versions={[makeVersion()]} />);

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
        makeVersion({ id: "cdtver-001", name: "First Version", version: 1 }),
        makeVersion({ id: "cdtver-002", name: "Second Version", version: 2 }),
      ];

      render(<TypeVersionsTable typeId={typeId} versions={versions} />);

      expect(screen.getByText("First Version")).toBeInTheDocument();
      expect(screen.getByText("Second Version")).toBeInTheDocument();
    });

    it("should use version number as link text when name is null", () => {
      render(
        <TypeVersionsTable
          typeId={typeId}
          versions={[makeVersion({ name: null, version: 6 })]}
        />,
      );

      const link = screen.getByTestId("router-link");
      expect(link).toHaveTextContent("v6");
    });

    it("should render a link that targets the correct consent document type version route", () => {
      const versionId = "cdtver-link-target-5555";

      render(
        <TypeVersionsTable
          typeId={typeId}
          versions={[makeVersion({ id: versionId, name: "Ratified Version" })]}
        />,
      );

      const link = screen.getByTestId("router-link");
      expect(link).toHaveAttribute(
        "href",
        "/admin/settings/consent/document-types/$typeId/versions/$versionId",
      );
      expect(link).toHaveTextContent("Ratified Version");
    });

    it("should display the version number formatted as v{n}", () => {
      render(
        <TypeVersionsTable
          typeId={typeId}
          versions={[makeVersion({ name: "Named Type Version", version: 12 })]}
        />,
      );

      expect(screen.getByText("v12")).toBeInTheDocument();
    });

    it("should render the status badge with the correct status value", () => {
      render(
        <TypeVersionsTable
          typeId={typeId}
          versions={[makeVersion({ status: "published" })]}
        />,
      );

      const badge = screen.getByTestId("status-badge");
      expect(badge).toHaveTextContent("published");
    });

    it("should show em dash for publishedAt when null", () => {
      render(
        <TypeVersionsTable
          typeId={typeId}
          versions={[makeVersion({ publishedAt: null, description: "Has description" })]}
        />,
      );

      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("should show formatted publishedAt date when set", () => {
      render(
        <TypeVersionsTable
          typeId={typeId}
          versions={[makeVersion({ publishedAt: "2025-01-20T00:00:00.000Z" })]}
        />,
      );

      expect(screen.queryByText("—")).not.toBeInTheDocument();
    });

    it("should show em dash for description when null", () => {
      render(
        <TypeVersionsTable
          typeId={typeId}
          versions={[makeVersion({ description: null, publishedAt: "2025-01-01T00:00:00.000Z" })]}
        />,
      );

      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("should render correct status badges for each version when multiple versions exist", () => {
      const versions = [
        makeVersion({ id: "cdtv-a", status: "archived", name: "Archived", version: 1 }),
        makeVersion({ id: "cdtv-b", status: "draft", name: "Draft", version: 2 }),
        makeVersion({ id: "cdtv-c", status: "published", name: "Live", version: 3 }),
      ];

      render(<TypeVersionsTable typeId={typeId} versions={versions} />);

      const badges = screen.getAllByTestId("status-badge");
      expect(badges).toHaveLength(3);
      expect(badges[0]).toHaveTextContent("archived");
      expect(badges[1]).toHaveTextContent("draft");
      expect(badges[2]).toHaveTextContent("published");
    });
  });
});
