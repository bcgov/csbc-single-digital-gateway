import { cleanup, fireEvent, render, screen } from "@testing-library/react";

jest.mock("@repo/ui", () => ({
  Table: ({ children }: { children?: React.ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children?: React.ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children?: React.ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children?: React.ReactNode }) => <th>{children}</th>,
  TableCell: ({ children }: { children?: React.ReactNode }) => <td>{children}</td>,
  Badge: ({ children, variant }: { children?: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
  Button: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
}));

jest.mock("@tabler/icons-react", () => ({
  IconTrash: () => <span data-testid="icon-trash" />,
}));

import { ServiceContributorsTable } from "src/features/admin/services/components/service-contributors-table.component";

type Contributor = {
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: string;
};

const makeContributor = (overrides: Partial<Contributor> = {}): Contributor => ({
  userId: "user-aaaa-1111-bbbb-2222cccc3333",
  name: "Jane Smith",
  email: "jane.smith@gov.bc.ca",
  role: "editor",
  createdAt: "2024-09-01T08:00:00.000Z",
  ...overrides,
});

describe("ServiceContributorsTable", () => {
  const onRemove = jest.fn();

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe("Empty state", () => {
    it("should show empty message when contributors array is empty", () => {
      render(<ServiceContributorsTable contributors={[]} onRemove={onRemove} />);

      expect(screen.getByText("No contributors.")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  describe("Column headers", () => {
    it("should render all expected column headers when contributors exist", () => {
      render(<ServiceContributorsTable contributors={[makeContributor()]} onRemove={onRemove} />);

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Role")).toBeInTheDocument();
      expect(screen.getByText("Joined")).toBeInTheDocument();
    });
  });

  describe("Row rendering", () => {
    it("should render one row per contributor", () => {
      const contributors = [
        makeContributor({ userId: "user-001", name: "Alice Manager" }),
        makeContributor({ userId: "user-002", name: "Bob Editor" }),
        makeContributor({ userId: "user-003", name: "Carol Viewer" }),
      ];

      render(<ServiceContributorsTable contributors={contributors} onRemove={onRemove} />);

      expect(screen.getByText("Alice Manager")).toBeInTheDocument();
      expect(screen.getByText("Bob Editor")).toBeInTheDocument();
      expect(screen.getByText("Carol Viewer")).toBeInTheDocument();
    });

    it("should display Unnamed when name is null", () => {
      render(
        <ServiceContributorsTable
          contributors={[makeContributor({ name: null })]}
          onRemove={onRemove}
        />,
      );

      expect(screen.getByText("Unnamed")).toBeInTheDocument();
    });

    it("should display contributor email", () => {
      render(
        <ServiceContributorsTable
          contributors={[makeContributor({ email: "john.doe@gov.bc.ca" })]}
          onRemove={onRemove}
        />,
      );

      expect(screen.getByText("john.doe@gov.bc.ca")).toBeInTheDocument();
    });

    it("should display em dash when email is null", () => {
      render(
        <ServiceContributorsTable
          contributors={[makeContributor({ email: null })]}
          onRemove={onRemove}
        />,
      );

      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("should display contributor role in a badge with outline variant", () => {
      render(
        <ServiceContributorsTable
          contributors={[makeContributor({ role: "owner" })]}
          onRemove={onRemove}
        />,
      );

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveTextContent("owner");
      expect(badge).toHaveAttribute("data-variant", "outline");
    });

    it("should render a badge for each contributor's role", () => {
      const contributors = [
        makeContributor({ userId: "u-001", role: "owner" }),
        makeContributor({ userId: "u-002", role: "editor" }),
        makeContributor({ userId: "u-003", role: "viewer" }),
      ];

      render(<ServiceContributorsTable contributors={contributors} onRemove={onRemove} />);

      const badges = screen.getAllByTestId("badge");
      expect(badges).toHaveLength(3);
      expect(badges[0]).toHaveTextContent("owner");
      expect(badges[1]).toHaveTextContent("editor");
      expect(badges[2]).toHaveTextContent("viewer");
    });
  });

  describe("Remove action", () => {
    it("should call onRemove with the full contributor object when remove button is clicked", () => {
      const contributor = makeContributor({
        userId: "user-to-remove-abc",
        name: "Target User",
        role: "editor",
      });

      render(<ServiceContributorsTable contributors={[contributor]} onRemove={onRemove} />);

      const trashIcon = screen.getByTestId("icon-trash");
      fireEvent.click(trashIcon.closest("button")!);

      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onRemove).toHaveBeenCalledWith(contributor);
    });

    it("should call onRemove with the correct contributor when multiple are displayed", () => {
      const contributors = [
        makeContributor({ userId: "user-keep-111", name: "Keep Me" }),
        makeContributor({ userId: "user-remove-222", name: "Remove Me" }),
      ];

      render(<ServiceContributorsTable contributors={contributors} onRemove={onRemove} />);

      const trashIcons = screen.getAllByTestId("icon-trash");
      fireEvent.click(trashIcons[1].closest("button")!);

      expect(onRemove).toHaveBeenCalledWith(contributors[1]);
      expect(onRemove).not.toHaveBeenCalledWith(contributors[0]);
    });

    it("should not call onRemove when no button is clicked", () => {
      render(
        <ServiceContributorsTable
          contributors={[makeContributor()]}
          onRemove={onRemove}
        />,
      );

      expect(onRemove).not.toHaveBeenCalled();
    });
  });
});
