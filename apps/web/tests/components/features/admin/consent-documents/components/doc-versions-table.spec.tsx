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

import { DocVersionsTable } from "src/features/admin/consent-documents/components/doc-versions-table.component";

type ConsentDocumentVersionSummary = {
  id: string;
  name: string | null;
  description: string | null;
  version: number;
  status: string;
  createdAt: string;
  publishedAt: string | null;
};

const makeVersion = (overrides: Partial<ConsentDocumentVersionSummary> = {}): ConsentDocumentVersionSummary => ({
  id: "cdver111-aaaa-bbbb-cccc-ddddeeeeffff",
  name: "Version One",
  description: "First version of the consent document",
  version: 1,
  status: "draft",
  createdAt: "2024-05-20T09:00:00.000Z",
  publishedAt: null,
  ...overrides,
});

describe("DocVersionsTable", () => {
  const docId = "doc-parent-1111-aaaa-bbbbccccdddd";

  afterEach(cleanup);

  describe("Empty state", () => {
    it("should show empty message when versions array is empty", () => {
      render(<DocVersionsTable docId={docId} versions={[]} />);

      expect(screen.getByText("No versions yet.")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  describe("Column headers", () => {
    it("should render all expected column headers when versions exist", () => {
      render(<DocVersionsTable docId={docId} versions={[makeVersion()]} />);

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
        makeVersion({ id: "cdver-001", name: "Draft v1", version: 1 }),
        makeVersion({ id: "cdver-002", name: "Draft v2", version: 2 }),
      ];

      render(<DocVersionsTable docId={docId} versions={versions} />);

      expect(screen.getByText("Draft v1")).toBeInTheDocument();
      expect(screen.getByText("Draft v2")).toBeInTheDocument();
    });

    it("should use version number as link text when name is null", () => {
      render(
        <DocVersionsTable
          docId={docId}
          versions={[makeVersion({ name: null, version: 3 })]}
        />,
      );

      const link = screen.getByTestId("router-link");
      expect(link).toHaveTextContent("v3");
    });

    it("should render a link that targets the correct consent document version route", () => {
      const versionId = "cdver-link-target-9999";

      render(
        <DocVersionsTable
          docId={docId}
          versions={[makeVersion({ id: versionId, name: "Published Release" })]}
        />,
      );

      const link = screen.getByTestId("router-link");
      expect(link).toHaveAttribute("href", "/admin/consent/documents/$docId/versions/$versionId");
      expect(link).toHaveTextContent("Published Release");
    });

    it("should display the version number formatted as v{n}", () => {
      render(
        <DocVersionsTable
          docId={docId}
          versions={[makeVersion({ name: "Named Doc Version", version: 4 })]}
        />,
      );

      expect(screen.getByText("v4")).toBeInTheDocument();
    });

    it("should render the status badge with correct status value", () => {
      render(
        <DocVersionsTable
          docId={docId}
          versions={[makeVersion({ status: "published" })]}
        />,
      );

      const badge = screen.getByTestId("status-badge");
      expect(badge).toHaveTextContent("published");
    });

    it("should show em dash for publishedAt when null", () => {
      render(
        <DocVersionsTable
          docId={docId}
          versions={[makeVersion({ publishedAt: null, description: "Has desc" })]}
        />,
      );

      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("should show formatted publishedAt date when set", () => {
      render(
        <DocVersionsTable
          docId={docId}
          versions={[makeVersion({ publishedAt: "2024-11-30T00:00:00.000Z" })]}
        />,
      );

      expect(screen.queryByText("—")).not.toBeInTheDocument();
    });

    it("should truncate description longer than 50 characters with ellipsis", () => {
      const longDesc = "This description is definitely longer than fifty characters when you count";

      render(
        <DocVersionsTable
          docId={docId}
          versions={[makeVersion({ description: longDesc })]}
        />,
      );

      expect(screen.getByText(longDesc.slice(0, 50) + "…")).toBeInTheDocument();
    });

    it("should display full description when 50 characters or fewer", () => {
      const shortDesc = "Brief description";

      render(
        <DocVersionsTable
          docId={docId}
          versions={[makeVersion({ description: shortDesc })]}
        />,
      );

      expect(screen.getByText(shortDesc)).toBeInTheDocument();
    });

    it("should render correct status badge for each version in a multi-version table", () => {
      const versions = [
        makeVersion({ id: "v-archived", status: "archived", name: "Old Version", version: 1 }),
        makeVersion({ id: "v-published", status: "published", name: "Current Version", version: 2 }),
        makeVersion({ id: "v-draft", status: "draft", name: "New Draft", version: 3 }),
      ];

      render(<DocVersionsTable docId={docId} versions={versions} />);

      const badges = screen.getAllByTestId("status-badge");
      expect(badges).toHaveLength(3);
      expect(badges[0]).toHaveTextContent("archived");
      expect(badges[1]).toHaveTextContent("published");
      expect(badges[2]).toHaveTextContent("draft");
    });
  });
});
